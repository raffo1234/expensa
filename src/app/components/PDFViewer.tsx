// components/PDFViewer.tsx
import { Document, Page } from "react-pdf";
import { useState } from "react";
import { usePdfWorker } from "@/hooks/usePdfWorker";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

type Props = {
  fileUrl: string;
  width?: number;
};

export const PDFViewer = ({ fileUrl, width = 600 }: Props) => {
  usePdfWorker();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  return (
    <div>
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={(err) => console.error("PDF load error:", err)}
      >
        <Page pageNumber={pageNumber} width={width} />
      </Document>
      {numPages > 1 ? (
        <div className="mt-2">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            Previous
          </button>
          <span style={{ margin: "0 12px" }}>
            Page {pageNumber} of {numPages}
          </span>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
};
