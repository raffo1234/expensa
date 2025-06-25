"use client";

import { Document, Page } from "react-pdf";
import { useState } from "react";
import { usePdfWorker } from "@/hooks/usePdfWorker";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Icon } from "@iconify/react/dist/iconify.js";

type Props = {
  fileUrl: string;
  controls?: boolean;
};

export const PDFViewer = ({ fileUrl, controls = false }: Props) => {
  usePdfWorker();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);

  return (
    <div className="w-full relative h-full overflow-auto flex flex-col items-center">
      {controls ? (
        <div className="invisible md:visible bg-rose-400 p-2 rounded-full z-30 absolute top-3 left-1/2 -translate-x-1/2">
          <div className="flex  gap-4 items-center">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
              className="cursor-pointer bg-white rounded-full w-11 h-11 flex justify-center items-center text-rose-400"
            >
              <Icon icon="ph:minus-thin" fontSize={32}></Icon>
            </button>
            <div className="bg-white/20 px-4 py-2 rounded-full text-white">
              Zoom: {(zoom * 100).toFixed(0)}%
            </div>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
              className="cursor-pointer rounded-full h-11 w-11 bg-white text-rose-400 flex justify-center items-center"
            >
              <Icon icon="ph:plus-thin" fontSize={32}></Icon>
            </button>
          </div>
        </div>
      ) : null}
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={(err) => console.error("PDF load error:", err)}
      >
        <Page pageNumber={pageNumber} scale={zoom} />
      </Document>

      {numPages > 1 && (
        <div className="mt-4 flex gap-4 items-center">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
