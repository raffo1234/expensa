import { useEffect } from "react";
import { pdfjs } from "react-pdf";

export const usePdfWorker = () => {
  useEffect(() => {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
    }
  }, []);
};
