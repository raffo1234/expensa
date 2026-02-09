"use client";

import { usePDF } from "@react-pdf/renderer";
import ContentPDFDocument from "@/components/ContentPDFDocument";
import { DicomType } from "@/types/dicomType";

export default function PDFClientComponent({ dicom }: { dicom: DicomType }) {
  const [instance] = usePDF({
    document: <ContentPDFDocument dicom={dicom} />,
  });

  if (instance.loading) return <div className="p-10 text-center">Generating PDF...</div>;
  if (instance.error) return <div className="p-10 text-center">Error creating document</div>;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white p-4 mb-4 rounded-lg shadow flex justify-between items-center">
        <h1 className="font-bold text-gray-700">Report Preview</h1>
        <a
          href={instance.url || ""}
          download={`Report.pdf`}
          className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm"
        >
          Download / Open PDF
        </a>
      </div>
      <div className="w-full max-w-4xl flex-1 bg-white rounded-lg overflow-hidden">
        <iframe src={instance.url || ""} className="w-full h-[80vh] border-none" />
      </div>
    </div>
  );
}
