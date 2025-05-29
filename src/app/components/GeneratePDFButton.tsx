import { DicomType } from "@/types/dicomType";
import GeneratePDFButtonInner from "./GeneratePDFButtonInner";
import { useRef, useState } from "react";

export default function GeneratePDFButton({
  label,
  dicom,
  userId,
  isDownloadable = true,
}: {
  userId: string;
  label: string;
  dicom: DicomType;
  isDownloadable?: boolean;
}) {
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);
  const [isDisplayedLink, setIsDisplayedLink] = useState(false);

  const triggerDownload = () => {
    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
    }
  };
  const handleEnter = () => {
    setIsDisplayedLink(true);
    triggerDownload();
  };

  const handleLeave = () => {
    setIsDisplayedLink(false);
  };

  return (
    <div onClick={handleEnter}>
      {isDisplayedLink ? (
        <GeneratePDFButtonInner
          handleLeave={handleLeave}
          userId={userId}
          label={label}
          dicom={dicom}
          isDownloadable={isDownloadable}
        />
      ) : (
        <div className="flex gap-1 items-center text-white cursor-pointer font-semibold disabled:opacity-90 py-2 px-6 text-xs bg-rose-400 hover:bg-rose-500 transition-colors duration-500 rounded-full">
          {!isDownloadable ? (
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
          )}
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
