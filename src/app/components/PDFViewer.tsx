"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Icon } from "@iconify/react/dist/iconify.js";

// Keep this outside the component for stability
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

type Props = {
  fileUrl: string;
  controls?: boolean;
};

export const PDFViewer = ({ fileUrl, controls = false }: Props) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleClear = () => {
    setZoom(1.0);
    setRotation(0);
  };

  return (
    <div className="w-full relative h-full overflow-hidden flex flex-col items-center bg-slate-900/50">
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-auto p-4 flex justify-center items-start custom-scrollbar"
      >
        <div className="mt-4 shadow-2xl border border-white/10 bg-white transition-all duration-300">
          <Document
            key={fileUrl}
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => console.error("PDF Load Error:", err)}
            loading={
              <div className="p-12 text-cyan-400 font-medium animate-pulse">
                Loading document...
              </div>
            }
          >
            {containerWidth > 0 && (
              <Page
                pageNumber={pageNumber}
                scale={zoom}
                width={containerWidth}
                rotate={rotation}
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
            )}
          </Document>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-4 pt-2 px-4 w-full bg-gradient-to-t from-black/60 to-transparent">
        {controls && (
          <div className="bg-cyan-400 p-1.5 rounded-full z-30 shadow-lg flex gap-2 items-center flex-wrap justify-center">
            <div className="flex gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
                className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 active:scale-95"
              >
                <Icon icon="ph:minus-bold" fontSize={20} />
              </button>
              <div className="bg-white/20 flex items-center px-3 py-1.5 rounded-full text-white text-sm min-w-[60px] text-center">
                {(zoom * 100).toFixed(0)}%
              </div>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
                className="rounded-full w-10 h-10 bg-white text-cyan-400 flex justify-center items-center active:scale-95"
              >
                <Icon icon="ph:plus-bold" fontSize={20} />
              </button>
            </div>

            <div className="w-[1px] h-6 bg-white/40 hidden xs:block" />

            <div className="flex gap-1">
              <button
                onClick={() => setRotation((r) => (r - 90) % 360)}
                className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400"
              >
                <Icon icon="ph:arrow-counter-clockwise-bold" fontSize={22} />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400"
              >
                <Icon icon="ph:arrow-clockwise-bold" fontSize={22} />
              </button>
            </div>

            <button
              onClick={handleClear}
              className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400"
            >
              <Icon icon="ph:arrows-counter-clockwise-bold" fontSize={22} />
            </button>
          </div>
        )}

        {numPages > 1 && (
          <div className="flex gap-4 items-center bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
            <button
              className="disabled:opacity-30 text-white hover:text-cyan-400"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
            >
              <Icon icon="ph:caret-left-fill" fontSize={22} />
            </button>
            <span className="text-white text-sm">
              <span className="text-cyan-400 font-bold">{pageNumber}</span> / {numPages}
            </span>
            <button
              className="disabled:opacity-30 text-white hover:text-cyan-400"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => p + 1)}
            >
              <Icon icon="ph:caret-right-fill" fontSize={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
