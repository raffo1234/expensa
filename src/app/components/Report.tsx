"use client";

import { useDebouncedCallback } from "use-debounce";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import React, { useEffect, useMemo, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import dynamic from "next/dynamic";

import Image from "next/image";
import { TemplateType } from "@/types/templateType";
import { Icon } from "@iconify/react/dist/iconify.js";
import { DicomType } from "@/types/dicomType";
import Link from "next/link";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { supabase } from "@/lib/supabase";
import ContentPDFDocument from "@/components/ContentPDFDocument";
import DOCXPreview from "@/components/DOCXPreview";
import GeneratePDFButton from "@/components/GeneratePDFButton";

function putFirst(array: TemplateType[], element: TemplateType | undefined) {
  if (element)
    return [element, ...array.filter((item) => item.id !== element.id)];
  return array;
}

export default function Report({
  templates,
  userId,
  dicom,
}: {
  templates: TemplateType[] | [];
  userId?: string;
  dicom: DicomType;
}) {
  const nowMs = Date.now();
  const [dicomState, setDicomState] = useState("");
  const [value, setValue] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<
    TemplateType | undefined
  >();
  const sortTemplate = putFirst(templates, activeTemplate);

  const PDFDownloadLink = useMemo(
    () =>
      dynamic(
        () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
        {
          ssr: false,
          loading: () => <GeneratePDFButton isDisabled={true} label="PDF" />,
        }
      ),
    []
  );

  const handleTemplateActive = (template: TemplateType) => {
    setActiveTemplate(template);
    updateDicomTemplate(dicom.id, template.id);
  };

  const debouncedTextarea = useDebouncedCallback((value) => {
    updateDicomReport(value, dicom.id, activeTemplate?.id);
    setValue(value);
  }, 500);

  const updateDicomReport = async (
    value: string,
    id: string,
    templateId: string | undefined
  ) => {
    try {
      await supabase
        .from("dicom")
        .update({ report: value, template_id: templateId })
        .eq("id", id);
    } catch (error) {
      console.error(error);
    }
  };

  const updateDicomTemplate = async (
    id: string,
    templateId: string | undefined
  ) => {
    try {
      await supabase
        .from("dicom")
        .update({ template_id: templateId })
        .eq("id", id);
    } catch (error) {
      console.error(error);
    }
  };

  const updateDicomState = async (
    id: string,
    state: DicomStateEnum,
    templateId: string | undefined
  ) => {
    try {
      const { data } = await supabase
        .from("dicom")
        .update({ state, report: value, template_id: templateId })
        .eq("id", id)
        .select()
        .single();

      if (data) setDicomState(data.state);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (templates.length > 0) {
      const template =
        templates.find((template) => template.id === dicom.template_id) ||
        templates[0];
      handleTemplateActive(template);
    }
  }, []);

  useEffect(() => {
    if (!dicom.state) {
      updateDicomState(dicom.id, DicomStateEnum.VIEWED, activeTemplate?.id);
    }
  }, [dicom.id, dicom.state]);

  useEffect(() => {
    setDicomState(dicom.state);
  }, [dicom.state]);

  useEffect(() => {
    setValue(dicom.report);
  }, [dicom.report]);

  return (
    <>
      <div className="sm:flex mb-6 items-center">
        <div
          className="grid gap-2 mb-4 sm:mb-0 flex-grow-1"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          }}
        >
          {sortTemplate?.map((template) => {
            const { id, name } = template;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTemplateActive(template)}
                className={`${
                  activeTemplate?.id === id
                    ? "bg-rose-50 border-rose-200"
                    : "bg-gray-50 border-gray-200"
                } cursor-pointer truncate text-center p-3 rounded-xl border`}
              >
                {name}
              </button>
            );
          })}
          <Link
            href="/admin/templates"
            className="flex items-center cursor-pointer text-center p-1 transition-colors duration-300 text-gray-500 hover:text-cyan-400 group"
            title="Add template"
          >
            <Icon icon="solar:add-circle-linear" fontSize={32} />
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {dicomState ? (
            <div
              className={`
              font-semibold uppercase
              ${
                dicomState === DicomStateEnum.VIEWED
                  ? "text-yellow-500 border-yellow-300 bg-yellow-50"
                  : ""
              }  
              ${
                dicomState === DicomStateEnum.DRAFT
                  ? "text-orange-500 border-orange-100 bg-orange-50"
                  : ""
              }  
              ${
                dicomState === DicomStateEnum.COMPLETED
                  ? "text-cyan-600 border-cyan-200 bg-cyan-100"
                  : ""
              }  
              py-1 px-5 text-sm uppercase rounded-full border`}
              title={dicomState}
            >
              {dicomState}
            </div>
          ) : null}

          {PDFDownloadLink ? (
            <PDFDownloadLink
              document={
                <ContentPDFDocument
                  dicom={dicom}
                  activeTemplate={activeTemplate}
                  content={value}
                />
              }
              fileName={`${dicom?.patient_name}_${nowMs}_${userId}.pdf`}
            >
              {({ loading }) =>
                loading ? (
                  <GeneratePDFButton label="PDF" isDisabled={true} />
                ) : (
                  <GeneratePDFButton label="PDF" />
                )
              }
            </PDFDownloadLink>
          ) : null}
          <DOCXPreview dicom={dicom} />
        </div>
      </div>
      <div className="bg-gray-200 overflow-auto">
        <div
          style={{ width: "595pt", fontFamily: "Arial" }}
          className="p-[60pt] pb-[120pt] relative mx-auto bg-white overflow-hidden"
        >
          <div className="left-0 top-[842pt] px-[60pt] pb-[60pt] absolute w-full border-b border-rose-400"></div>
          <div className="left-0 top-[1684pt] px-[60pt] pb-[60pt] absolute w-full border-b border-rose-400"></div>
          {activeTemplate?.header_image_url ? (
            <Image
              src={activeTemplate?.header_image_url}
              width={300}
              height={300}
              alt={activeTemplate.name}
              className="bg-gray-100 mb-6 w-full h-auto"
            />
          ) : null}
          <div className="page">
            <div
              className="mb-6 flex items-start justify-between"
              style={{ fontSize: "11pt", lineHeight: 1.6 }}
            >
              <div>
                <div>
                  <span className="text-gray-400 w-[65pt] inline-block">
                    Paciente:
                  </span>{" "}
                  {dicom?.patient_name}{" "}
                </div>
                <div>
                  <span className="text-gray-400 w-[65pt] inline-block">
                    Fecha:
                  </span>{" "}
                  {formatDateYYYYMMDD(dicom?.study_date)}
                </div>
                <div>
                  <span className="text-gray-400 w-[65pt] inline-block">
                    Descripción:
                  </span>{" "}
                  {dicom?.study_description}
                </div>
              </div>
              <div className="flex-shrink-0">
                <div>
                  <span className="text-gray-400 w-[65pt] inline-block">
                    Edad:
                  </span>
                  {extractAgeWidthUnit(dicom?.patient_age).value}{" "}
                  {extractAgeWidthUnit(dicom?.patient_age).unit}
                </div>
                <div>
                  <span className="text-gray-400 w-[65pt] inline-block">
                    Modalidad:
                  </span>
                  {dicom?.modality}
                </div>
              </div>
            </div>
            <TextareaAutosize
              defaultValue={value}
              onChange={(event) => debouncedTextarea(event.target.value)}
              minRows={2}
              placeholder="Radiologist's report"
              aria-label="Radiologist's report"
              className="rounded-sm w-full text-[11pt] leading-[1.6] focus:ring-0 focus:outline-none border border-gray-300 focus:border-cyan-300 min-h-6 border-dotted"
            />
            <div className="flex justify-end">
              {activeTemplate?.sign_image_url ? (
                <Image
                  src={activeTemplate?.sign_image_url}
                  width={300}
                  height={300}
                  alt={activeTemplate.name}
                  className="bg-white h-auto w-[160pt]"
                />
              ) : null}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-[60pt]">
            {activeTemplate?.footer_image_url ? (
              <Image
                src={activeTemplate?.footer_image_url}
                width={300}
                height={300}
                alt={activeTemplate.name}
                className="bg-gray-100 w-full h-auto"
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-6 gap-3">
        <Link
          href="/admin/dicoms"
          className="flex items-center border px-6 cursor-pointer py-2 border-gray-200 text-gray-700 rounded-xl font-semibold"
          type="button"
          title="Back"
        >
          <span>Back</span>
        </Link>
        {dicomState === DicomStateEnum.VIEWED ? (
          <button
            onClick={() =>
              updateDicomState(
                dicom.id,
                DicomStateEnum.DRAFT,
                activeTemplate?.id
              )
            }
            title={`Save as ${DicomStateEnum.DRAFT}`}
            type="button"
            className="px-6 py-2 font-semibold text-orange-600 border-orange-200 cursor-pointer border bg-orange-50 rounded-xl"
          >
            Save as {DicomStateEnum.DRAFT}
          </button>
        ) : null}
        {dicomState === DicomStateEnum.DRAFT ? (
          <button
            onClick={() =>
              updateDicomState(
                dicom.id,
                DicomStateEnum.COMPLETED,
                activeTemplate?.id
              )
            }
            title={`Save as ${DicomStateEnum.COMPLETED}`}
            type="button"
            className="px-6 py-2 font-semibold text-cyan-600 border-cyan-200 cursor-pointer border bg-cyan-50 rounded-xl"
          >
            Save as {DicomStateEnum.COMPLETED}
          </button>
        ) : null}
        {dicomState === DicomStateEnum.COMPLETED ? (
          <button
            onClick={() =>
              updateDicomState(
                dicom.id,
                DicomStateEnum.COMPLETED,
                activeTemplate?.id
              )
            }
            title="Amend"
            type="button"
            className="px-6 py-2 font-semibold text-cyan-600 border-cyan-200 cursor-pointer border bg-cyan-50 rounded-xl"
          >
            Amend
          </button>
        ) : null}
        <Link
          target="_blank"
          href={`/admin/dicoms/preview/pdf/${dicom.id}`}
          title="PDF Preview"
          type="button"
          className="px-6 py-2 flex gap-3 items-center text-white border bg-rose-400 rounded-xl cursor-pointer"
        >
          <Icon icon="solar:eye-linear" fontSize={24} />
          <span>PDF</span>
        </Link>
      </div>
    </>
  );
}
