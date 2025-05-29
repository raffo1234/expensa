"use client";

import ContentPDFDocument from "@/components/ContentPDFDocument";
import { DicomType } from "@/types/dicomType";
import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function PDFPreview({ dicom }: { dicom: DicomType }) {
  const PDFViewer = useMemo(
    () =>
      dynamic(
        () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
        {
          ssr: false,
          loading: () => "Loading...",
        }
      ),
    []
  );

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-100">
      <div
        className="mx-auto"
        style={{
          width: "612pt",
          minHeight: "100vh",
        }}
      >
        <PDFViewer
          style={{
            width: "612pt",
            minHeight: "100vh",
          }}
        >
          <ContentPDFDocument dicom={dicom} />
        </PDFViewer>
      </div>
    </div>
  );
}
