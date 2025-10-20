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
        <Icon icon="solar:upload-minimalistic-linear" fontSize={26} />
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
