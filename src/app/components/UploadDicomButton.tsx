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
      title={isUploading ? `${t("processing")}...` : `${t("read-dicom-files", { count })}`}
    >
      {isUploading ? (
        <Icon icon="solar:record-broken" fontSize={26} className="animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M5 20h14q.425 0 .713.288T20 21t-.288.713T19 22H5q-.425 0-.712-.288T4 21t.288-.712T5 20m5-2q-.425 0-.712-.288T9 17v-6H7.05q-.625 0-.9-.562t.1-1.063l4.95-6.35q.15-.2.363-.3t.437-.1t.438.1t.362.3l4.95 6.35q.375.5.1 1.063t-.9.562H15v6q0 .425-.288.713T14 18z"
          />
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
