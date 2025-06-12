"use client";

import toast from "react-hot-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useState } from "react";
import { Packer } from "docx";
import { supabase } from "@/lib/supabase";
import { PartialDicomWithTemplate } from "@/types/dicomType";
import createDocxDocument from "@/lib/createDocxDocument";
import { DicomType } from "@/types/dicomType";
import { sanitize } from "@/lib/sanitize";

const fetchSelectedDicoms = async (selectedIds: Set<string>) => {
  const idsToFetch = Array.from(selectedIds);
  const { data, error } = await supabase
    .from("dicom")
    .select(
      "id, user_id, patient_id, patient_name, study_date, study_description, patient_age, birthday, report, template(header_image_url,sign_image_url,footer_image_url)"
    )
    .in("id", idsToFetch);

  if (error) {
    console.error("Error fetching selected DICOMs:", error);
    return null;
  }

  return data as PartialDicomWithTemplate[];
};

export default function GenerateCompressedDOCXs({
  selectedIds,
}: {
  selectedIds: Set<string>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const generateDocx = async () => {
    setIsLoading(true);

    const selectedDicomsData = await fetchSelectedDicoms(selectedIds);

    if (selectedDicomsData) {
      try {
        const docxBlobs = [];
        for (const dicom of selectedDicomsData) {
          const fullDicom: DicomType = dicom as DicomType;
          const doc = await createDocxDocument(fullDicom);
          const blob = await Packer.toBlob(doc);
          docxBlobs.push(blob);
        }

        await createAndDownloadZip(selectedDicomsData, docxBlobs);
      } catch (error) {
        console.error("Error generating DOCXs:", error);
      }
    }
  };

  async function createAndDownloadZip(
    selectedDicoms: PartialDicomWithTemplate[],
    docxBlobs: Blob[]
  ) {
    const now = Date.now();
    const zip = new JSZip();

    selectedDicoms.forEach((dicom, index) => {
      const filename = sanitize(
        `${dicom.patient_name}-${dicom.study_description}-${dicom.study_date}.docx`
      );
      zip.file(filename, docxBlobs[index]);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      setIsLoading(false);
      toast.success("Download completed successfully!");
      saveAs(content, `patient_reports_${now}.zip`);
    });
  }

  return (
    <button
      onClick={generateDocx}
      disabled={isLoading}
      title="Download compressed DOCXs"
      className={`${isLoading ? "cursor-not-allowed pointer-none" : ""} cursor-pointer rounded-lg p-1 border border-gray-200 hover:bg-gray-100 transition-colors duration-300`}
    >
      {isLoading ? (
        <svg
          className={isLoading ? "animate-spin" : ""}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="#42a5f5"
            strokeLinecap="round"
            strokeWidth="1.5"
            d="M7 3.338A9.95 9.95 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-1.821.487-3.53 1.338-5"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <g fill="none">
            <path d="M0 0h24v24H0z" />
            <path
              fill="#42a5f5"
              d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8zm4 18H6V4h7v5h5z"
            />
          </g>
        </svg>
      )}
    </button>
  );
}
