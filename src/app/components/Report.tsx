"use client";

import Sticky from "react-sticky-el";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { useDebouncedCallback } from "use-debounce";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import React, { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import toast from "react-hot-toast";
import Image from "next/image";
import { TemplateType } from "@/types/templateType";
import { DicomType } from "@/types/dicomType";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import LoadingReportComponent from "./LoadingReportComponent";
import DownloadButtons from "./DownloadButtons";
import PreviewPDFButton from "./PreviewPDFButton";
import CompleteDicomButton from "./CompleteDicomButton";
import ListOfTemplates from "./ListOfTemplates";
import fetcherDicom from "@/fetchers/dicomFetcher";
import useControlEnter from "@/hooks/useControlEnter";
import Attachments from "./Attachments";

export default function Report({
  templates,
  dicomId,
  userRoleId,
}: {
  templates: TemplateType[] | [];
  dicomId: string;
  userRoleId: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const {
    data: dicom,
    error,
    isLoading,
    mutate,
  } = useSWR(`admin-${dicomId}`, () => fetcherDicom(dicomId));

  const debouncedTextarea = useDebouncedCallback(async (value) => {
    if (dicom?.id) await updateDicom(dicom?.id, { report: value });
  }, 500);

  const updateDicom = async (id: string, newData: Partial<DicomType>) => {
    setIsSaving(true);

    try {
      await supabase.from("dicom").update(newData).eq("id", id);
    } catch (error) {
      console.error(error);
    } finally {
      mutate();
      setIsSaving(false);
      toast.success("Report updated successfully!");
    }
  };

  const completeDicom = async () => {
    if (!dicom?.id || isSaving) return;

    if (dicom.state === DicomStateEnum.COMPLETED) {
      router.push("/admin/dicoms");
      return;
    }

    await updateDicom(dicom.id, {
      state: DicomStateEnum.COMPLETED,
      completed_at: new Date(),
    });
    router.push("/admin/dicoms");
  };

  useControlEnter(completeDicom);

  useEffect(() => {
    if (dicom) {
      if (dicom.state !== DicomStateEnum.COMPLETED && !dicom?.state) {
        updateDicom(dicomId, { state: DicomStateEnum.VIEWED });
      }

      if (dicom.state !== DicomStateEnum.COMPLETED && !dicom.template_id) {
        const fuse = new Fuse(templates, {
          useExtendedSearch: true,
          threshold: 0.4,
          keys: ["name", "description"],
        });

        const result = fuse.search(dicom.institution.split(" ").join(" | "));

        if (result.length > 0) {
          updateDicom(dicomId, { template_id: result[0].item.id });
        }
      }
    }
  }, [dicom]);

  if (!dicom) return <LoadingReportComponent />;

  if (error) return <LoadingReportComponent />;

  if (isLoading) return <LoadingReportComponent />;

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <h2>
          <span className="text-gray-600 text-sm">ID:</span>{" "}
          <span className="font-semibold">{dicom.patient_id}</span>
        </h2>
        {dicom.state ? (
          <div
            className={`
              font-semibold uppercase
              ${
                dicom.state === DicomStateEnum.VIEWED
                  ? "text-yellow-500 border-yellow-300 bg-yellow-50"
                  : ""
              }  
              ${
                dicom.state === DicomStateEnum.DRAFT
                  ? "text-orange-500 border-orange-100 bg-orange-50"
                  : ""
              }  
              ${
                dicom.state === DicomStateEnum.COMPLETED
                  ? "text-cyan-600 border-cyan-200 bg-cyan-100"
                  : ""
              }  
              py-1 px-5 text-xs uppercase w-fit rounded-xl border`}
            title={dicom.state}
          >
            {dicom.state}
          </div>
        ) : null}
        <div className="text-gray-500 text-sm">
          {isSaving ? "Saving ..." : ""}
        </div>
      </div>
      <ListOfTemplates
        templates={templates}
        updateTemplate={async (newTemplate) =>
          await updateDicom(dicomId, { template_id: newTemplate.id })
        }
        dicom={dicom}
        activeTemplate={dicom.template}
        userRoleId={userRoleId}
      />
      <Attachments dicomId={dicom.id} />
      <div className="z-20 relative">
        <Sticky>
          <div className="bg-gray-50/50 py-4">
            <div className="flex justify-between mb-4">
              <PreviewPDFButton
                userRoleId={userRoleId}
                isDownloadable={false}
                dicom={dicom}
              />
              <DownloadButtons dicom={dicom} userRoleId={userRoleId} />
            </div>
            <div className="flex justify-end gap-2">
              {!dicom.state || dicom.state === DicomStateEnum.VIEWED ? (
                <button
                  onClick={async () => {
                    await updateDicom(dicom.id, {
                      state: DicomStateEnum.DRAFT,
                    });
                    router.push("/admin/dicoms");
                  }}
                  title={DicomStateEnum.DRAFT}
                  type="button"
                  className="px-6 py-2 font-semibold text-orange-600 border-orange-200 cursor-pointer border bg-orange-50 rounded-full"
                >
                  {DicomStateEnum.DRAFT}
                </button>
              ) : null}
              <CompleteDicomButton
                userRoleId={userRoleId}
                dicomState={dicom.state}
                onClick={async () => {
                  await completeDicom();
                }}
              />
            </div>
          </div>
        </Sticky>
      </div>
      <div className="bg-gray-200 overflow-auto relative z-10">
        <div
          style={{ width: "595pt", fontFamily: "Arial" }}
          className="p-[60pt] pb-[120pt] relative mx-auto bg-white overflow-hidden"
        >
          <div className="left-0 top-[842pt] px-[60pt] pb-[60pt] absolute w-full border-b border-rose-400"></div>
          <div className="left-0 top-[1684pt] px-[60pt] pb-[60pt] absolute w-full border-b border-rose-400"></div>
          {dicom.template?.header_image_url ? (
            <Image
              src={dicom.template.header_image_url}
              width={300}
              height={300}
              alt={dicom.template.name}
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
                    ID:
                  </span>
                  {dicom?.patient_id}
                </div>
              </div>
            </div>
            <TextareaAutosize
              autoFocus
              defaultValue={dicom.report}
              onChange={(event) => debouncedTextarea(event.target.value)}
              minRows={2}
              placeholder="Radiologist's report"
              aria-label="Radiologist's report"
              className="rounded-sm w-full text-[11pt] leading-[1.6] focus:ring-0 focus:outline-none border border-gray-300 focus:border-cyan-300 min-h-6 border-dotted"
            />
            <div className="flex justify-end">
              {dicom.template?.sign_image_url ? (
                <Image
                  src={dicom.template?.sign_image_url}
                  width={100}
                  height={102}
                  alt={dicom.template.name}
                  className="bg-white h-auto w-[75pt]"
                />
              ) : null}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-[60pt] pb-[60pt]">
            {dicom.template?.footer_image_url ? (
              <Image
                src={dicom.template?.footer_image_url}
                width={300}
                height={300}
                alt={dicom.template.name}
                className="bg-gray-100 w-full h-auto"
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
