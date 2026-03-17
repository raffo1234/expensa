"use client";

import { useState } from "react";
import { useGlobalState } from "@/lib/globalState";
import { ICON_SIZE } from "@/constants";
import TextareaAutosize from "react-textarea-autosize";
import fetcherDicom from "@/fetchers/dicomFetcher";
import useSWR from "swr";
import { useUpdateFieldById } from "@/hooks/useUpdateFieldById";
import { UUIDTypes } from "uuid";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { Popover } from "react-tiny-popover";
import { useTranslations } from "next-intl";
import InnerCircularButton from "./InnerCircularButton";

function DicomCommentEditor({
  dicomId,
  initialComment,
  swrKey,
  onClose,
  comment,
}: {
  dicomId: UUIDTypes;
  initialComment: string;
  swrKey: string;
  onClose: () => void;
  comment: string;
}) {
  const [newComment, setNewComment] = useState(initialComment);

  const { updateField, isLoading: isUpdating, error: updateError } = useUpdateFieldById(swrKey);

  const handleUpdate = async () => {
    if (isUpdating) return;
    // Actualización directa en la tabla dicom usando el ID
    await updateField("dicom", dicomId, "comment", newComment);
    onClose();
  };

  const isCommentUnchanged = newComment === (comment ?? "");

  return (
    <>
      <h1 className="font-semibold text-xl mb-1">Study Comment</h1>
      <p className="mb-6 text-gray-400 text-sm">Comment will be part of this Study</p>
      <TextareaAutosize
        name="comment"
        autoFocus
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        minRows={2}
        placeholder="Add a comment..."
        aria-label="Study comment"
        className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
      />

      <div className="flex justify-end mt-4">
        {updateError && <p className="text-sm text-red-500 mr-4">Error: {updateError.message}</p>}
        <button
          onClick={handleUpdate}
          disabled={isUpdating || isCommentUnchanged}
          className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors 
                        ${
                          isUpdating || isCommentUnchanged
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-cyan-500 hover:bg-cyan-600"
                        }`}
        >
          {isUpdating ? "Saving..." : "Update Comment"}
        </button>
      </div>
    </>
  );
}

export default function ModalToCommentDicom({ dicomId }: { dicomId: UUIDTypes }) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const t = useTranslations("Step3");

  const swrKey = `admin-${dicomId}`;
  const {
    data: dicom,
    isLoading: isLoadingDicom,
    error: fetchError,
    mutate,
  } = useSWR(swrKey, () => fetcherDicom(dicomId));

  const onClick = () => {
    if (isLoadingDicom || !dicom) return;

    setModalContent(
      <DicomCommentEditor
        key={`dicomId-${dicomId}`}
        dicomId={dicomId}
        initialComment={dicom.comment ?? ""}
        swrKey={swrKey}
        onClose={() => {
          setModalOpen(false);
          mutate();
        }}
        comment={dicom.comment ?? ""}
      />,
    );
    setModalOpen(true);
  };

  const handleMouseEnter = () => setIsPopoverOpen(true);
  const handleMouseLeave = () => setIsPopoverOpen(false);

  // La verdad directa: Si no hay data o está completado, no mostramos nada
  if (fetchError || !dicom) return null;
  if (dicom?.state === DicomStateEnum.COMPLETED) return null;

  return (
    <Popover
      isOpen={true} // Se mantiene abierto para manejar la opacidad por CSS como tenías
      positions={["top"]}
      padding={12}
      content={
        <div
          className={`${isPopoverOpen ? "opacity-100 -translate-y-0" : "opacity-0 -translate-y-4"} 
              pointer-events-none p-4 max-w-48 bg-slate-800 rounded-xl transition-all duration-500 ease-in-out`}
        >
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
          <h4 className="text-white font-semibold mb-2">{t("title")}</h4>
          <p className="text-slate-200">{t("description")}</p>
        </div>
      }
    >
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={isLoadingDicom}
        type="button"
        title="Add/Edit Study Comment"
      >
        <InnerCircularButton isActive={!!dicom?.comment?.trim()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
              <path strokeLinejoin="round" d="M8 13.5h8m-8-5h4" />
              <path d="M6.099 19q-1.949-.192-2.927-1.172C2 16.657 2 14.771 2 11v-.5c0-3.771 0-5.657 1.172-6.828S6.229 2.5 10 2.5h4c3.771 0 5.657 0 6.828 1.172S22 6.729 22 10.5v.5c0 3.771 0 5.657-1.172 6.828S17.771 19 14 19c-.56.012-1.007.055-1.445.155c-1.199.276-2.309.89-3.405 1.424c-1.563.762-2.344 1.143-2.834.786c-.938-.698-.021-2.863.184-3.865" />
            </g>
          </svg>
        </InnerCircularButton>
      </button>
    </Popover>
  );
}
