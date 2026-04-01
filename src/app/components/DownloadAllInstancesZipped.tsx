import { useState } from "react";
import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";
import CircularSecondaryButton from "./CircularSecondaryButton";
import { sanitize } from "@/lib/sanitize";

export default function DownloadAllInstancesZipped({
  fileIds,
  isButtonActive = false,
  patientName,
}: {
  fileIds: string[];
  isButtonActive?: boolean;
  patientName?: string;
}) {
  const [isZipping, setIsZipping] = useState(false);

  const buildFileName = () => {
    const date = new Date().toISOString().split("T")[0];
    return patientName ? `${sanitize(patientName)}_${date}` : `studies_${date}`;
  };

  const handleDownload = async () => {
    if (fileIds.length === 0) return;
    setIsZipping(true);

    try {
      const zipName = buildFileName();

      const response = await fetch("/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds, zipName }),
      });

      if (!response.ok) throw new Error("Zip generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${zipName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <CircularSecondaryButton
      onClick={handleDownload}
      title="Download Zip"
      isDisabled={isZipping || fileIds.length === 0}
      isActive={isButtonActive}
    >
      <Icon
        icon={isZipping ? "line-md:loading-twotone-loop" : "solar:arrow-down-linear"}
        fontSize={ICON_SIZE}
      />
    </CircularSecondaryButton>
  );
}
