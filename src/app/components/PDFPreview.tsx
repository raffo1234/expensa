"use client";

import dynamic from "next/dynamic";
import { DicomType } from "@/types/dicomType";

// SSR: FALSE is the critical part here
const ClientOnlyViewer = dynamic(() => import("./PDFClientComponent"), {
  ssr: false,
  loading: () => <div className="p-10 text-center">Loading Preview...</div>,
});

export default function PDFPreview({ dicom }: { dicom: DicomType }) {
  return <ClientOnlyViewer dicom={dicom} />;
}
