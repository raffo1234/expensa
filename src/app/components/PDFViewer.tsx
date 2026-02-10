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
  const [rotation, setRotation] = useState<number>(0);

  // Función para resetear vista (Clear)
  const handleClear = () => {
    setZoom(1.0);
    setRotation(0);
  };

  const rotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const rotateRight = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className="w-full relative h-full overflow-hidden flex flex-col items-center bg-slate-50">
      {/* Contenedor del PDF con scroll independiente para evitar cortes */}
      <div className="flex-1 w-full overflow-auto p-4 flex justify-center items-start">
        <div className="mt-8 shadow-2xl border border-slate-200 bg-white transition-all duration-300 ease-in-out">
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="p-12 text-cyan-500 font-medium animate-pulse">
                Loading document...
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={zoom}
              rotate={rotation}
              renderAnnotationLayer={true}
              renderTextLayer={true}
              loading={<div className="h-[600px] w-[450px] bg-slate-100" />}
            />
          </Document>
        </div>
      </div>

      {controls && (
        <div className="mb-6 bg-cyan-400 p-2 rounded-full z-30 shadow-lg shadow-cyan-200/50 flex gap-2 items-center">
          <div className="flex gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
              className="cursor-pointer bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 hover:text-cyan-600 transition-colors shadow-sm"
              title="Zoom Out"
            >
              <Icon icon="ph:minus-bold" fontSize={24}></Icon>
            </button>
            <div className="bg-white/20 px-4 py-2 rounded-full text-white min-w-[85px] text-center">
              {(zoom * 100).toFixed(0)}%
            </div>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
              className="cursor-pointer rounded-full w-10 h-10 bg-white text-cyan-400 hover:text-cyan-600 flex justify-center items-center transition-colors shadow-sm"
              title="Zoom In"
            >
              <Icon icon="ph:plus-bold" fontSize={24}></Icon>
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/40" />

          <div className="flex gap-1">
            <button
              onClick={rotateLeft}
              className="cursor-pointer bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 hover:text-cyan-600 transition-colors shadow-sm"
              title="Rotate Left"
            >
              <Icon icon="ph:arrow-counter-clockwise-bold" fontSize={22}></Icon>
            </button>
            <button
              onClick={rotateRight}
              className="cursor-pointer bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 hover:text-cyan-600 transition-colors shadow-sm"
              title="Rotate Right"
            >
              <Icon icon="ph:arrow-clockwise-bold" fontSize={22}></Icon>
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/40" />

          <button
            onClick={handleClear}
            className="cursor-pointer bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 hover:text-cyan-600 transition-colors shadow-sm text-sm"
            title="Clear Changes"
          >
            <Icon icon="ph:arrows-counter-clockwise-bold" fontSize={22} />
          </button>
        </div>
      )}

      {numPages > 1 && (
        <div className="mb-8 flex gap-6 items-center bg-white px-8 py-3 rounded-2xl shadow-sm border border-slate-100">
          <button
            className="disabled:opacity-20 flex items-center gap-2 text-cyan-500 hover:text-cyan-700 transition-all cursor-pointer"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            <Icon icon="ph:caret-left-fill" /> Previous
          </button>

          <span className="text-slate-500 font-medium">
            Page <span className="text-cyan-600 font-bold">{pageNumber}</span> of {numPages}
          </span>

          <button
            className="disabled:opacity-20 flex items-center gap-2 font-bold text-cyan-500 hover:text-cyan-700 transition-all cursor-pointer"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Next <Icon icon="ph:caret-right-fill" />
          </button>
        </div>
      )}
    </div>
  );
};
