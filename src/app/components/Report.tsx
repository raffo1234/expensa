"use client";

import Sticky from "react-sticky-el";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { useDebouncedCallback } from "use-debounce";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import { useCallback, useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import toast from "react-hot-toast";
import Image from "next/image";
import { TemplateType } from "@/types/templateType";
import { DicomType } from "@/types/dicomType";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import DownloadButtons from "./DownloadButtons";
import PreviewPDFButton from "./PreviewPDFButton";
import CompleteDicomButton from "./CompleteDicomButton";
import ListOfTemplates from "./ListOfTemplates";
import fetcherDicom from "@/fetchers/dicomFetcher";
import useControlEnter from "@/hooks/useControlEnter";
import Attachments from "./Attachments";
import { ICON_SIZE } from "@/constants";
import ModalToDisplayDicomComment from "./ModalToDisplayDicomComment";
import { sendEmailToUser } from "@/utils/sendEmailToUser";
import { useTranslations } from "next-intl";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { AttachmentsSkeleton, GadgetReportSkeleton } from "./LoadingReportComponent";
import DownloadStudyButton from "./DownloadStudyButton";
import VisorWebButton from "./VisorWebButton";
import { Icon } from "@iconify/react/dist/iconify.js";
import CircularSecondaryButton from "./CircularSecondaryButton";

export default function Report({
  templates,
  dicomId,
  userRoleId,
  fallbackDicom,
}: {
  templates: TemplateType[] | [];
  dicomId: string;
  userRoleId: string;
  fallbackDicom?: DicomType;
}) {
  const t = useTranslations("EmailToUserWhenUPloadingDicom");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initRan = useRef(false);

  const router = useRouter();
  const {
    data: dicom,
    error,
    mutate,
  } = useSWR(`admin-${dicomId}`, () => fetcherDicom(dicomId), {
    fallbackData: fallbackDicom,
  });

  const { hasPermission: canSendEmailAfterUploading } = useCheckPermission(
    dicom?.user?.role_id,
    Permissions.SEND_EMAIL_AFTER_UPLOADING,
  );

  const age = dicom ? extractAgeWidthUnit(dicom.patient_age ?? "") : null;

  const updateDicomImmediately = useCallback(
    async (value: string) => {
      if (!dicom?.id) return;

      setIsSaving(true);
      try {
        await supabase.from("dicom").update({ report: value }).eq("id", dicom.id);
        toast.success("Report updated immediately!");
      } catch (error) {
        console.error("Error updating report immediately:", error);
        toast.error("Failed to save report immediately.");
      } finally {
        mutate();
        setIsSaving(false);
      }
    },
    [dicom?.id, mutate],
  );

  const debouncedTextarea = useDebouncedCallback(async (value) => {
    if (dicom?.id) {
      if (textareaRef.current && textareaRef.current.value === value) {
        await updateDicom(dicom.id, { report: value }, true);
      }
    }
  }, 650);

  const updateDicom = async (id: string, newData: Partial<DicomType>, silent = false) => {
    setIsSaving(true);

    try {
      await supabase.from("dicom").update(newData).eq("id", id);
    } catch (error) {
      console.error(error);
    } finally {
      mutate();
      setIsSaving(false);
      if (!silent) toast.success("Report completed successfully!");
    }
  };

  const completeDicom = async () => {
    if (!dicom?.id || isSaving) {
      console.log("Cannot complete: dicom ID missing or already saving.");
      return;
    }

    if (textareaRef.current && dicom?.report !== textareaRef.current.value) {
      console.log("Unsaved changes detected. Saving immediately...");
      await updateDicomImmediately(textareaRef.current.value);
      debouncedTextarea.cancel();
    }

    if (dicom.state !== DicomStateEnum.COMPLETED) {
      console.warn("Updating DICOM state to COMPLETED");
      await updateDicom(dicom.id, {
        state: DicomStateEnum.COMPLETED,
        completed_at: new Date(),
      });
      if (dicom.user?.email) {
        if (process.env.NODE_ENV !== "development") {
          if (canSendEmailAfterUploading) {
            await sendEmailToUser({
              to: dicom.user.email,
              subject: t("subjectOnCompleting"),
            });
          }
        }
      }
    } else {
      console.warn("DICOM is already COMPLETED. Just redirecting.");
      toast.success("Report is already completed.");
    }

    router.push("/admin/dicoms");
  };

  const assignDicomTemplateByEmail = async (dicomId: string) => {
    const { data: dicom, error: dicomError } = await supabase
      .from("dicom")
      .select("user_id(email)")
      .eq("id", dicomId)
      .single();

    if (dicomError) throw new Error(`Dicom not found: ${dicomError.message}`);
    const email = (dicom.user_id as unknown as { email: string }).email;

    const { data: templates, error: templateError } = await supabase
      .from("template")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (templateError)
      throw new Error(`No template found for email ${email}: ${templateError.message}`);

    const template = templates?.[0];
    if (!template) return;

    const { data, error } = await supabase
      .from("dicom")
      .update({ template_id: template.id })
      .eq("id", dicomId)
      .select()
      .single();

    if (error) throw new Error(`Failed to assign template: ${error.message}`);
    mutate();
    return data;
  };

  useControlEnter(completeDicom, document, false, isSaving);

  useEffect(() => {
    if (!dicom?.state) {
      updateDicom(dicomId, { state: DicomStateEnum.VIEWED }, true);
    }
  }, [dicomId, dicom]);

  useEffect(() => {
    if (!dicom || initRan.current) return;
    if (!dicom.template_id && templates.length === 0) return;

    initRan.current = true;

    const initDicom = async () => {
      const isCompleted = dicom.state === DicomStateEnum.COMPLETED;
      if (isCompleted) return;

      if (!dicom.template_id) {
        await assignTemplate();
      }
    };

    const assignTemplate = async () => {
      if (dicom.institution) {
        const fuse = new Fuse(templates, {
          keys: ["name", "description"],
          useExtendedSearch: true,
          threshold: 0.4,
        });
        const query = dicom.institution.split(" ").join(" | ");
        const match = fuse.search(query)[0]?.item;
        if (match) await updateDicom(dicomId, { template_id: match.id }, true);
      } else {
        await assignDicomTemplateByEmail(dicomId);
      }
    };

    initDicom();
  }, [dicom, templates]);

  if (error)
    return (
      <p className="text-red-500 text-sm mt-4">Failed to load report. Please refresh the page.</p>
    );

  return (
    <>
      {dicom?.state ? (
        <div className="mb-4 flex items-center gap-2">
          <h2>
            <span className="text-gray-600 text-sm">ID:</span>{" "}
            <span className="font-semibold">{dicom.patient_id}</span>
          </h2>
          <div
            className={`
              font-semibold
              ${dicom.state === DicomStateEnum.VIEWED ? "text-yellow-500 border-yellow-300 bg-yellow-50" : ""}
              ${dicom.state === DicomStateEnum.DRAFT ? "text-orange-500 border-orange-100 bg-orange-50" : ""}
              ${dicom.state === DicomStateEnum.COMPLETED ? "text-cyan-600 border-cyan-200 bg-cyan-100" : ""}
              py-1 px-5 text-xs w-fit rounded-lg border`}
            title={dicom.state}
          >
            {dicom.state}
          </div>
        </div>
      ) : (
        <GadgetReportSkeleton />
      )}
      <ListOfTemplates
        templates={templates}
        updateTemplate={async (newTemplate) =>
          await updateDicom(dicomId, { template_id: newTemplate.id }, true)
        }
        dicom={dicom}
        activeTemplate={dicom?.template}
        userRoleId={userRoleId}
      />
      <div className="flex gap-2 mt-6">
        {dicom ? (
          <>
            <Attachments
              dicomId={dicom.id}
              Button={
                <CircularSecondaryButton title="Attachments" isActive={true} type="button">
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
                </CircularSecondaryButton>
              }
            />
            <ModalToDisplayDicomComment comment={dicom.comment} />
            {dicom.instances ? (
              <VisorWebButton
                isActiveButton={true}
                dicomId={dicom.id}
                instances={dicom.instances}
              />
            ) : null}
            <DownloadStudyButton
              dicomIds={[dicom.id]}
              dicomUrl={dicom.dicom_url}
              instances={dicom.instances}
              isButtonActive={true}
            />
          </>
        ) : (
          <AttachmentsSkeleton />
        )}
      </div>
      <div className="z-20 relative">
        <Sticky>
          <div className="bg-gray-50/50 py-4">
            <div className="flex justify-between mb-4">
              <PreviewPDFButton userRoleId={userRoleId} isDownloadable={false} dicomId={dicomId} />
              <DownloadButtons dicomId={dicomId} userRoleId={userRoleId} />
            </div>
            <div className="flex justify-end gap-2">
              {dicom && (!dicom.state || dicom.state === DicomStateEnum.VIEWED) ? (
                <button
                  onClick={async () => {
                    await updateDicom(dicom.id, { state: DicomStateEnum.DRAFT });
                    router.push("/admin/dicoms");
                  }}
                  title={DicomStateEnum.DRAFT}
                  type="button"
                  className="px-6 py-2 text-orange-600 border-orange-200 cursor-pointer border bg-orange-50 rounded-full"
                >
                  {DicomStateEnum.DRAFT}
                </button>
              ) : null}
              <CompleteDicomButton
                userRoleId={userRoleId}
                dicomState={dicom?.state}
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
          className="p-[60pt] pb-[120pt] mx-auto bg-white overflow-hidden relative"
        >
          <div className="absolute top-3 left-3 text-gray-500 text-sm">
            <Icon
              icon="solar:record-broken"
              className={`${isSaving ? "opacity-100" : "opacity-0"} duration-150 transition-opacity text-slate-400 animate-spin`}
              fontSize={ICON_SIZE}
            />
          </div>
          <div className="left-0 top-[842pt] px-[60pt] pb-[60pt] pointer-events-none absolute w-full border-b border-rose-400" />
          <div className="left-0 top-[1684pt] px-[60pt] pb-[60pt] absolute w-full border-b border-rose-400" />

          {dicom?.template?.header_image_url ? (
            <Image
              src={dicom.template.header_image_url}
              width={300}
              height={300}
              alt={dicom.template.name}
              className="bg-gray-100 mb-6 w-full h-auto"
            />
          ) : null}

          <div className="page">
            {!dicom ? (
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
                <div className="h-32 w-full bg-gray-200 animate-pulse rounded mt-6" />
              </div>
            ) : (
              <>
                <div
                  className="mb-6 flex items-start justify-between"
                  style={{ fontSize: "11pt", lineHeight: 1.6 }}
                >
                  <div>
                    <div>
                      <span className="text-gray-400 w-[65pt] inline-block">Paciente:</span>{" "}
                      {dicom.patient_name}
                    </div>
                    <div>
                      <span className="text-gray-400 w-[65pt] inline-block">Fecha:</span>{" "}
                      {formatDateYYYYMMDD(dicom.study_date ?? "")}
                    </div>
                    <div>
                      <span className="text-gray-400 w-[65pt] inline-block">Descripción:</span>{" "}
                      {dicom.study_description}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div>
                      <span className="text-gray-400 w-[65pt] inline-block">Edad:</span>
                      {age?.value} {age?.unit}
                    </div>
                    <div>
                      <span className="text-gray-400 w-[65pt] inline-block">ID:</span>
                      {dicom.patient_id}
                    </div>
                  </div>
                </div>

                <TextareaAutosize
                  key={dicom.id}
                  autoFocus
                  defaultValue={dicom.report}
                  onChange={(event) => debouncedTextarea(event.target.value)}
                  ref={textareaRef}
                  minRows={2}
                  placeholder="Radiologist's report"
                  aria-label="Radiologist's report"
                  className="rounded-sm w-full text-[11pt] leading-[1.6] focus:ring-0 focus:outline-none border border-gray-300 focus:border-cyan-300 min-h-6 border-dotted"
                />

                <div className="flex justify-end">
                  {dicom.template?.sign_image_url ? (
                    <Image
                      src={dicom.template.sign_image_url}
                      width={100}
                      height={102}
                      alt={dicom.template.name}
                      className="bg-white h-auto w-[75pt]"
                    />
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-[60pt] pb-[60pt]">
            {dicom?.template?.footer_image_url ? (
              <Image
                src={dicom.template.footer_image_url}
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
