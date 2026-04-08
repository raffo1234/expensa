import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import toast from "react-hot-toast";
import PopoverInnerButton from "./PopoverInnerButton";

export default function AETitleInfo({ aeTitle }: { aeTitle: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `IP: 137.66.1.186\nPORT: 11112\nAE Title: ${aeTitle}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
    });
    toast.success("Copied to clipboard");
  };

  return (
    <div className="relative flex gap-3 bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-sm text-cyan-700">
      <Icon icon="solar:info-circle-linear" fontSize={18} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold mb-1">Technician configuration:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>
            IP: <span className="font-mono">137.66.1.186</span>
          </li>
          <li>
            PORT: <span className="font-mono">11112</span>
          </li>
          <li>
            AE Title: <span className="font-mono">{aeTitle}</span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy to clipboard"
        onMouseLeave={() => setCopied(false)}
        className="absolute top-2 right-2 p-2 rounded-lg hover:bg-cyan-100 transition-colors cursor-pointer text-cyan-500"
      >
        <PopoverInnerButton title="Copy to clipboard">
          <Icon
            icon={copied ? "solar:check-circle-linear" : "solar:copy-linear"}
            fontSize={ICON_SIZE}
          />
        </PopoverInnerButton>
      </button>
    </div>
  );
}
