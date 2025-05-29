"use client";

import JSZip from "jszip";
import { BlobProvider } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { createRoot } from "react-dom/client";
import ContentPDFDocument from "@/components/ContentPDFDocument";
import { supabase } from "@/lib/supabase";
import { PartialDicomWithTemplate } from "@/types/dicomType";
import { useState } from "react";

const fetchSelectedDicoms = async (selectedIds: Set<string>) => {
  const idsToFetch = Array.from(selectedIds);
  const { data, error } = await supabase
    .from("dicom")
    .select(
      "id, patient_id, patient_name, study_date, study_description, patient_age, birthday, report, template(header_image_url,sign_image_url,footer_image_url)"
    )
    .in("id", idsToFetch);

  if (error) {
    console.error("Error fetching selected DICOMs:", error);
    return null;
  }

  return data as PartialDicomWithTemplate[];
};

export default function GenerateCompressedPDFs({
  selectedIds,
}: {
  selectedIds: Set<string>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const generatePdf = async () => {
    setIsLoading(true);

    const selectedDicomsData = await fetchSelectedDicoms(selectedIds);

    if (selectedDicomsData) {
      try {
        const pdfBlobs = await Promise.all(
          selectedDicomsData.map(async (dicom) => await generatePdfUrl(dicom))
        );
        await createAndDownloadZip(selectedDicomsData, pdfBlobs);
      } catch (error) {
        console.error("Error generating PDFs:", error);
      }
    }
  };

  const generatePdfUrl = (dicom: PartialDicomWithTemplate): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const container = document.createElement("div");
      const root = createRoot(container);

      if (!dicom) return null;

      const pdfElement = (
        <BlobProvider document={<ContentPDFDocument dicom={dicom} />}>
          {({ blob, loading, error }) => {
            if (!loading && !error && blob) {
              resolve(blob);

              setTimeout(() => {
                root.unmount();
              });
            } else if (error) {
              reject(error);

              setTimeout(() => {
                root.unmount();
              });
            }
            return null;
          }}
        </BlobProvider>
      );
      root.render(pdfElement);
    });
  };

  async function createAndDownloadZip(
    selectedDicoms: PartialDicomWithTemplate[],
    pdfBlobs: Blob[]
  ) {
    const now = Date.now();
    const zip = new JSZip();

    selectedDicoms.forEach((dicom, index) => {
      zip.file(
        `${dicom.patient_id}_${dicom.patient_name}_${now}_${index + 1}.pdf`,
        pdfBlobs[index]
      );
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `patient_reports_${now}.zip`);
      setIsLoading(false);
    });
  }

  return (
    <button
      onClick={generatePdf}
      disabled={isLoading}
      title="Download compressed PDFs"
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
            d="M12.554 16.506a.75.75 0 0 1-1.107 0l-4-4.375a.75.75 0 0 1 1.107-1.012l2.696 2.95V3a.75.75 0 0 1 1.5 0v11.068l2.697-2.95a.75.75 0 1 1 1.107 1.013z"
          />
          <path
            fill="currentColor"
            d="M3.75 15a.75.75 0 0 0-1.5 0v.055c0 1.367 0 2.47.117 3.337c.12.9.38 1.658.981 2.26c.602.602 1.36.86 2.26.982c.867.116 1.97.116 3.337.116h6.11c1.367 0 2.47 0 3.337-.116c.9-.122 1.658-.38 2.26-.982s.86-1.36.982-2.26c.116-.867.116-1.97.116-3.337V15a.75.75 0 0 0-1.5 0c0 1.435-.002 2.436-.103 3.192c-.099.734-.28 1.122-.556 1.399c-.277.277-.665.457-1.4.556c-.755.101-1.756.103-3.191.103H9c-1.435 0-2.437-.002-3.192-.103c-.734-.099-1.122-.28-1.399-.556c-.277-.277-.457-.665-.556-1.4c-.101-.755-.103-1.756-.103-3.191"
          />
        </svg>
      )}
    </button>
  );
}
