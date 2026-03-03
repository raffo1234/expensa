import { useState } from "react";
import { Icon } from "@iconify/react"; // Asumiendo que usas Iconify por tu código previo
import { ICON_SIZE } from "@/constants";

export default function DownloadAllZip({ fileIds }: { fileIds: string[] }) {
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
      a.download = `studies_${new Date().getTime()}.zip`;
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
    <button
      onClick={handleDownload}
      disabled={isZipping || fileIds.length === 0}
      className={`
        flex w-fit p-1 outline-0 cursor-pointer border hover:border-cyan-500 border-cyan-400 rounded-lg bg-gray-100 hover:bg-cyan-50 hover:text-cyan-400 transition-colors
        ${
          isZipping
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed pointer-events-none"
            : "bg-white border-cyan-100 text-cyan-400 hover:bg-cyan-50 hover:border-cyan-200"
        }
      `}
    >
      <Icon icon={isZipping ? "line-md:loading-twotone-loop" : "hugeicons:zip-02"} fontSize={ICON_SIZE} />
    </button>
  );
}
