"use client";

import { Icon } from "@iconify/react";
import JSZip from "jszip";
import { useState } from "react";
import { DicomStudyType } from "@/types/dicomStudyType";
import { DicomInstance } from "@/lib/processDicomStudyTurbo";

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
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title="Download DICOM ZIP"
      className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-full transition-colors duration-200 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
    >
      {loading ? (
        <>
          <Icon icon="solar:loading-bold" fontSize={13} className="animate-spin" />
          {progress}%
        </>
      ) : (
        <>
          <Icon icon="solar:download-linear" fontSize={13} />
          ZIP
        </>
      )}
    </button>
  );
}
