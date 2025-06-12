import { usePDF } from "@react-pdf/renderer";
import ContentPDFDocument from "./ContentPDFDocument";
import { DicomType } from "@/types/dicomType";
import Link from "next/link";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { sanitize } from "@/lib/sanitize";

const IconLoading = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        d="M7 3.338A9.95 9.95 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-1.821.487-3.53 1.338-5"
      />
    </svg>
  );
};

const IconButton = ({ isDownloadable }: { isDownloadable: boolean }) => {
  return !isDownloadable ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.275 15.296C2.425 14.192 2 13.639 2 12c0-1.64.425-2.191 1.275-3.296C4.972 6.5 7.818 4 12 4s7.028 2.5 8.725 4.704C21.575 9.81 22 10.361 22 12c0 1.64-.425 2.191-1.275 3.296C19.028 17.5 16.182 20 12 20s-7.028-2.5-8.725-4.704Z" />
        <path d="M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z" />
      </g>
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M12.554 16.506a.75.75 0 0 1-1.107 0l-4-4.375a.75.75 0 0 1 1.107-1.012l2.696 2.95V3a.75.75 0 0 1 1.5 0v11.068l2.697-2.95a.75.75 0 1 1 1.107 1.013z"
      />
      <path
        fill="currentColor"
        d="M3.75 15a.75.75 0 0 0-1.5 0v.055c0 1.367 0 2.47.117 3.337c.12.9.38 1.658.981 2.26c.602.602 1.36.86 2.26.982c.867.116 1.97.116 3.337.116h6.11c1.367 0 2.47 0 3.337-.116c.9-.122 1.658-.38 2.26-.982s.86-1.36.982-2.26c.116-.867.116-1.97.116-3.337V15a.75.75 0 0 0-1.5 0c0 1.435-.002 2.436-.103 3.192c-.099.734-.28 1.122-.556 1.399c-.277.277-.665.457-1.4.556c-.755.101-1.756.103-3.191.103H9c-1.435 0-2.437-.002-3.192-.103c-.734-.099-1.122-.28-1.399-.556c-.277-.277-.457-.665-.556-1.4c-.101-.755-.103-1.756-.103-3.191"
      />
    </svg>
  );
};

export default function GeneratePDFButtonInner({
  label,
  dicom,
  handleLeave,
  isDownloadable = true,
}: {
  handleLeave: () => void;
  label: string;
  dicom: DicomType;
  isDownloadable?: boolean;
}) {
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const [instance] = usePDF({ document: <ContentPDFDocument dicom={dicom} /> });

  const triggerDownload = () => {
    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
      handleLeave();
    }
  };

  useEffect(() => {
    if (!instance.loading) {
      triggerDownload();
      toast.success("Download completed successfully!");
    }
  }, [instance.loading]);

  const filename = sanitize(
    `${dicom.patient_name}-${dicom.study_description}-${dicom.study_date}.pdf`
  );

  return (
    <Link
      download={isDownloadable ? filename : null}
      ref={downloadLinkRef}
      href={instance.url ? instance.url : ""}
      title="Download PDF"
      target="_blank"
      className="flex gap-1 items-center text-white cursor-pointer font-semibold disabled:opacity-90 py-2 px-6 text-xs bg-rose-400 hover:bg-rose-500 transition-colors duration-500 rounded-full"
    >
      {instance.loading ? (
        <IconLoading />
      ) : (
        <IconButton isDownloadable={isDownloadable} />
      )}
      <span>{label}</span>
    </Link>
  );
}
