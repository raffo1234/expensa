"use client";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useState } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { supabase } from "@/lib/supabase";
import { PartialDicomWithTemplate } from "@/types/dicomType";

const fetchSelectedDicoms = async (selectedIds: Set<string>) => {
  const idsToFetch = Array.from(selectedIds);
  const { data, error } = await supabase
    .from("dicom")
    .select(
      "id, patient_id, patient_name, study_date, study_description, patient_age, birthday, report"
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
        const docxBlobs = await Promise.all(
          selectedDicomsData.map(async (dicom) => await generateDocxBlob(dicom))
        );
        await createAndDownloadZip(selectedDicomsData, docxBlobs);
      } catch (error) {
        console.error("Error generating DOCXs:", error);
      }
    }
  };

  const generateDocxBlob = (dicom: PartialDicomWithTemplate): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Patient ID: ",
                      bold: true,
                    }),
                    new TextRun(dicom.patient_id || ""),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Patient Name: ",
                      bold: true,
                    }),
                    new TextRun(dicom.patient_name || ""),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Study Date: ",
                      bold: true,
                    }),
                    new TextRun(dicom.study_date || ""),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Study Description: ",
                      bold: true,
                    }),
                    new TextRun(dicom.study_description || ""),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Report: ",
                      bold: true,
                    }),
                    new TextRun(dicom.report || ""),
                  ],
                }),
              ],
            },
          ],
        });

        Packer.toBlob(doc).then((blob) => {
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  async function createAndDownloadZip(
    selectedDicoms: PartialDicomWithTemplate[],
    docxBlobs: Blob[]
  ) {
    const now = Date.now();
    const zip = new JSZip();

    selectedDicoms.forEach((dicom, index) => {
      zip.file(
        `${dicom.patient_id}_${dicom.patient_name}_${now}_${index + 1}.docx`,
        docxBlobs[index]
      );
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `patient_reports_${now}.zip`);
      setIsLoading(false);
    });
  }

  return (
    <button
      onClick={generateDocx}
      disabled={isLoading}
      title="Download compressed DOCXs"
      className={`${isLoading ? "cursor-not-allowed pointer-none" : ""} cursor-pointer rounded-lg text-gray-500 p-1 border border-gray-200 hover:text-cyan-400`}
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
            stroke="currentColor"
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
          <path
            fill="currentColor"
            d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
          />
        </svg>
      )}
    </button>
  );
}
