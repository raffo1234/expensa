import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

export default function UploadDicomButton({
  isDisabled,
  isUploading,
  count,
  handleUpload,
}: {
  isDisabled: boolean;
  isUploading: boolean;
  count: string | number;
  handleUpload: () => void;
}) {
  const t = useTranslations("Uploader");

  return (
    <button
      type="button"
      className="flex text-lg mx-auto mt-4 gap-4 items-center text-white disabled:opacity-50 disabled:cursor-no-drop cursor-pointer font-semibold disabled:border-cyan-400 disabled:bg-cyan-400 py-3 px-10 bg-cyan-500 hover:bg-cyan-400 transition-colors duration-500 rounded-lg"
      disabled={isDisabled}
      onClick={handleUpload}
    >
      {isUploading ? (
        <Icon icon="solar:record-broken" fontSize={26} className="animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path
              fill="currentColor"
              fillOpacity="0"
              strokeDasharray="20"
              strokeDashoffset="20"
              d="M12 15h2v-6h2.5l-4.5 -4.5M12 15h-2v-6h-2.5l4.5 -4.5"
            >
              <animate
                fill="freeze"
                attributeName="fill-opacity"
                begin="0.7s"
                dur="0.5s"
                values="0;1"
              />
              <animate fill="freeze" attributeName="strokeDashoffset" dur="0.4s" values="20;0" />
            </path>
            <path strokeDasharray="14" stroke-dashoffset="14" d="M6 19h12">
              <animate
                fill="freeze"
                attributeName="strokeDashoffset"
                begin="0.5s"
                dur="0.2s"
                values="14;0"
              />
            </path>
          </g>
        </svg>
      )}
      <span>
        {isUploading
          ? `${t("processing")}...`
          : `${t("read-dicom-files", { count })}
                `}
      </span>
    </button>
  );
}
