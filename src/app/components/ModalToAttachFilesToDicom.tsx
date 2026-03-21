"use client";

import { Popover } from "react-tiny-popover";
import { useGlobalState } from "@/lib/globalState";
import { ICON_SIZE } from "@/constants";
import useSWR from "swr";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { supabase } from "@/lib/supabase";
import { DicomType } from "@/types/dicomType";
import AttachedFilesContent from "./AttachedFilesContent"; // Import the new component
import { FileType } from "@/types/fileType";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import CircularSecondaryButton from "./CircularSecondaryButton";

const filesFetcher = async (dicomId: string) => {
  const { data } = (await supabase
    .from("file")
    .select("*")
    .eq("dicom_id", dicomId)
    .order("created_at", { ascending: true })) as { data: FileType[] | null };
  return data;
};

const fetcherDicom = async (id: string) => {
  const { data } = (await supabase
    .from("dicom")
    .select("id, comment, state")
    .eq("id", id)
    .maybeSingle()) as {
    data: DicomType | null;
  };
  return data;
};

export default function ModalToAttachFilesToDicom({
  dicomId,
  defaultPopoverOpen = false,
}: {
  dicomId: string;
  defaultPopoverOpen?: boolean;
}) {
  const swrKey = `admin-${dicomId}`;
  const { setModalContent, setOnModalClose, setModalOpen } = useGlobalState();
  const [isPopoverOpen, setIsPopoverOpen] = useState(defaultPopoverOpen);
  const t = useTranslations("Step2");

  const {
    data: dicom,
    error: fetchError,
    isLoading: isLoadingDicom,
  } = useSWR(swrKey, () => fetcherDicom(dicomId));

  const swrKeyFiles = `admin-files-${dicomId}`;

  const { data: files } = useSWR(swrKeyFiles, () => filesFetcher(dicomId));

  const onClick = () => {
    setModalContent(<AttachedFilesContent dicomId={dicomId} setOnModalClose={setOnModalClose} />);
    setModalOpen(true);
  };

  const handleMouseEnter = () => {
    setIsPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    setIsPopoverOpen(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPopoverOpen && defaultPopoverOpen) {
      timer = setTimeout(() => {
        setIsPopoverOpen(false);
      }, 3000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isPopoverOpen, defaultPopoverOpen]);

  if (fetchError || !dicom) return null;

  if (isLoadingDicom) return null;

  if (dicom.state === DicomStateEnum.COMPLETED) return null;

  return (
    <Popover
      isOpen={true}
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
      <CircularSecondaryButton
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        isDisabled={isLoadingDicom}
        type="button"
        title="Attach files"
        isActive={!!(files && files?.length > 0)}
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
      </CircularSecondaryButton>
    </Popover>
  );
}
