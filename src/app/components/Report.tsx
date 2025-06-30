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
import { ICON_SIZE } from "@/constants";

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
      <ListOfTemplates
        templates={templates}
        updateTemplate={async (newTemplate) =>
          await updateDicom(dicomId, { template_id: newTemplate.id })
        }
        dicom={dicom}
        activeTemplate={dicom.template}
        userRoleId={userRoleId}
      />
      <div className="flex items-center gap-2 mt-4">
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
      <Attachments
        dicomId={dicom.id}
        Button={
          <button
            title="Attachments"
            type="button"
            className="flex gap-2 outline-0 mt-4 cursor-pointer text-white px-6 font-semibold py-2 rounded-full bg-cyan-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={ICON_SIZE}
              height={ICON_SIZE}
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M8.886 3.363c2.942-2.817 7.7-2.817 10.643 0c2.961 2.834 2.961 7.444 0 10.279l-7.948 7.608c-2.09 2-5.466 2-7.556 0a5.03 5.03 0 0 1 0-7.324l7.834-7.498a3.253 3.253 0 0 1 4.468 0a3 3 0 0 1 0 4.367l-7.89 7.554a.75.75 0 1 1-1.038-1.084l7.89-7.553a1.503 1.503 0 0 0 0-2.2a1.753 1.753 0 0 0-2.393 0L5.062 15.01a3.53 3.53 0 0 0 0 5.156c1.51 1.445 3.972 1.445 5.482 0l7.948-7.608c2.344-2.244 2.344-5.868 0-8.112c-2.363-2.261-6.206-2.261-8.57 0l-6.403 6.13A.75.75 0 0 1 2.48 9.493z"
                clipRule="evenodd"
              />
            </svg>
            <span>Attachments</span>
          </button>
        }
      />
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
