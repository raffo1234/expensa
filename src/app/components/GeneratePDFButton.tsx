"use client";
import { useState } from "react";
import { DicomType } from "@/types/dicomType";
import fetcherDicom from "@/fetchers/dicomFetcher";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import GeneratePDFButtonInner from "./GeneratePDFButtonInner";
import { ICON_SIZE } from "@/constants";
import CircularSecondaryButton from "./CircularSecondaryButton";
import { usePathname } from "next/navigation";

export default function GeneratePDFButton({
  dicomId,
  label = "PDF",
  isDownloadable = true,
  liveReport,
}: {
  dicomId: DicomType["id"];
  label?: string;
  isDownloadable?: boolean;
  liveReport?: string;
}) {
  const pathname = usePathname();
  const table = pathname.includes("/studies/") ? "dicom_study" : "dicom";

  const fetchData = async () => {
    if (table === "dicom_study") {
      const { data, error } = await supabase
        .from("dicom_study")
        .select("*, hospital(id, name, ae_title), template:template_id(*)")
        .eq("id", dicomId)
        .single();
      if (error) throw error;
      return data as unknown as DicomType;
    }
    return fetcherDicom(dicomId);
  };

  const { data: dicom, error, isLoading } = useSWR(`${table}-${dicomId}`, fetchData);

  const [showPDFButton, setShowPDFButton] = useState(false);
  const title = `${isDownloadable ? "Download" : "Preview"} ${label}`;

  if (!dicom || isLoading || error) return null;

  return showPDFButton ? (
    <GeneratePDFButtonInner
      dicom={dicom}
      label={label}
      isDownloadable={isDownloadable}
      handleLeave={() => setShowPDFButton(false)}
      liveReport={liveReport}
    />
  ) : (
    <CircularSecondaryButton title={title} onClick={() => setShowPDFButton(true)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
      >
        <path
          fill="#ef5350"
          d="M13 9h5.5L13 3.5zM6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m4.93 10.44c.41.9.93 1.64 1.53 2.15l.41.32c-.87.16-2.07.44-3.34.93l-.11.04l.5-1.04c.45-.87.78-1.66 1.01-2.4m6.48 3.81c.18-.18.27-.41.28-.66c.03-.2-.02-.39-.12-.55c-.29-.47-1.04-.69-2.28-.69l-1.29.07l-.87-.58c-.63-.52-1.2-1.43-1.6-2.56l.04-.14c.33-1.33.64-2.94-.02-3.6a.85.85 0 0 0-.61-.24h-.24c-.37 0-.7.39-.79.77c-.37 1.33-.15 2.06.22 3.27v.01c-.25.88-.57 1.9-1.08 2.93l-.96 1.8l-.89.49c-1.2.75-1.77 1.59-1.88 2.12c-.04.19-.02.36.05.54l.03.05l.48.31l.44.11c.81 0 1.73-.95 2.97-3.07l.18-.07c1.03-.33 2.31-.56 4.03-.75c1.03.51 2.24.74 3 .74c.44 0 .74-.11.91-.3m-.41-.71l.09.11c-.01.1-.04.11-.09.13h-.04l-.19.02c-.46 0-1.17-.19-1.9-.51c.09-.1.13-.1.23-.1c1.4 0 1.8.25 1.9.35M7.83 17c-.65 1.19-1.24 1.85-1.69 2c.05-.38.5-1.04 1.21-1.69zm3.02-6.91c-.23-.9-.24-1.63-.07-2.05l.07-.12l.15.05c.17.24.19.56.09 1.1l-.03.16l-.16.82z"
        />
      </svg>
    </CircularSecondaryButton>
  );
}
