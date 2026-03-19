import { useState } from "react";
import { Icon } from "@iconify/react"; // Asumiendo que usas Iconify por tu código previo
import { ICON_SIZE } from "@/constants";
import InnerCircularButton from "./InnerCircularButton";

export default function DownloadAllInstancesZipped({
  filename,
  fileIds,
  isButtonActive = false,
}: {
  filename?: string;
  fileIds: string[];
  isButtonActive?: boolean;
}) {
  const [isZipping, setIsZipping] = useState(false);

  const handleDownload = async () => {
    if (fileIds.length === 0) return;
    setIsZipping(true);

    try {
      const response = await fetch("/api/download-zip", {
        method: "POST",
        body: JSON.stringify({ fileIds }),
      });

      if (!response.ok) throw new Error("Zip generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename ? filename : `studies_${new Date().getTime()}.zip`}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsZipping(false);
    }
  };

  const title = "Download Zip";

  return (
    <button onClick={handleDownload} title={title} disabled={isZipping || fileIds.length === 0}>
      <InnerCircularButton isDisabled={isZipping} title={title} isActive={isButtonActive}>
        <Icon
          icon={isZipping ? "line-md:loading-twotone-loop" : "solar:arrow-down-linear"}
          fontSize={ICON_SIZE}
        />
      </InnerCircularButton>
    </button>
  );
}
