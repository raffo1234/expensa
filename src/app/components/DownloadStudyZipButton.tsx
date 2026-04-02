"use client";

import { Icon } from "@iconify/react";
import JSZip from "jszip";
import { useState } from "react";
import { DicomStudyType } from "@/types/dicomStudyType";
import { DicomInstance } from "@/lib/processDicomStudyTurbo";
import CircularSecondaryButton from "./CircularSecondaryButton";
import { ICON_SIZE } from "@/constants";

const STORAGE_DOMAIN = process.env.NEXT_PUBLIC_STORAGE_DOMAIN?.replace(/\/$/, "") ?? "";

const buildDicomUrl = (storageUrl: string): string => {
  if (storageUrl.startsWith("http://") || storageUrl.startsWith("https://")) {
    return storageUrl;
  }
  return `${STORAGE_DOMAIN}/${storageUrl}`;
};

export default function DownloadDicomZipButton({ study }: { study: DicomStudyType }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    const instances = study.instances as DicomInstance[];
    if (!instances || instances.length === 0) return;

    setLoading(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(study.study_instance_uid ?? "study")!;

      for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        const url = buildDicomUrl(inst.storage_url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${inst.sop_instance_uid}`);
        const buffer = await response.arrayBuffer();
        folder.file(`${inst.sop_instance_uid}.dcm`, buffer);
        setProgress(Math.round(((i + 1) / instances.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${study.patient_name ?? "study"}_${study.study_date ?? ""}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error("[DownloadDicomZip] Error:", err);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <CircularSecondaryButton
      type="button"
      onClick={handleDownload}
      isDisabled={loading}
      title="Download DICOM ZIP"
    >
      {loading ? (
        <>
          <Icon icon="solar:loading-bold" fontSize={13} className="animate-spin" />
          {progress}%
        </>
      ) : (
        <Icon icon="solar:arrow-down-linear" fontSize={ICON_SIZE} />
      )}
    </CircularSecondaryButton>
  );
}
