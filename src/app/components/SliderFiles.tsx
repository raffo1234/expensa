"use client";

import { FileType } from "@/types/fileType";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useEffect, useState, useCallback } from "react";
import { useSliderState } from "./Slider";
import { PDFViewer } from "./PDFViewer";
import { ImageViewer } from "./ImageViewer";

export default function SliderFiles({
  files,
  firstIndex = 0,
}: {
  files: FileType[];
  firstIndex?: number;
}) {
  const [currentFile, setCurrentFile] = useState<FileType | null>(null);
  const { setSliderOpen } = useSliderState();

  const currentIndex = currentFile ? files.findIndex((f) => f.id === currentFile.id) : -1;

  const showPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentFile(files[currentIndex - 1]);
    } else {
      setCurrentFile(files[files.length - 1]);
    }
  }, [currentIndex, files]);

  const showNext = useCallback(() => {
    if (currentIndex < files.length - 1) {
      setCurrentFile(files[currentIndex + 1]);
    } else {
      setCurrentFile(files[0]);
    }
  }, [currentIndex, files]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSliderOpen(false);
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };
    window.addEventListener("keyup", handleKey);
    return () => window.removeEventListener("keyup", handleKey);
  }, [setSliderOpen, showPrev, showNext]);

  useEffect(() => {
    if (files.length > 0 && firstIndex >= 0 && firstIndex < files.length) {
      setCurrentFile(files[firstIndex]);
    }
  }, [files, firstIndex]);

  if (!currentFile) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden">
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {currentFile.extension === "application/pdf" ? (
          <PDFViewer controls fileUrl={currentFile.path} />
        ) : (
          <ImageViewer src={currentFile.path} alt={currentFile.name} />
        )}
      </div>
      <div className="absolute z-20 flex space-x-3 -translate-x-1/2 left-1/2 bottom-6">
        {files.map((file, index) => (
          <button
            key={file.id}
            aria-label={`Show ${file.name}`}
            onClick={() => setCurrentFile(file)}
            className={`flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ease-in-out ${
              index === currentIndex
                ? "bg-cyan-400 scale-110 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                : "bg-white/40 hover:bg-white/100"
            }`}
          ></button>
        ))}
      </div>
      <div className="absolute z-50 flex items-center top-5 right-5 bg-cyan-400 p-2 rounded-[50px] shadow-lg">
        <div className="flex items-center h-10 px-4 mr-2 bg-white/20 rounded-full text-white font-medium">
          {currentIndex + 1} / {files.length}
        </div>
        <button
          onClick={() => setSliderOpen(false)}
          title="Close"
          className="flex cursor-pointer items-center justify-center rounded-full w-10 h-10 text-cyan-500 bg-white hover:bg-cyan-50 transition-colors shadow-sm"
        >
          <Icon icon="ph:x-bold" width={24} height={24} />
        </button>
      </div>
      {files.length > 1 && (
        <>
          <button
            className="absolute top-1/2 -translate-y-1/2 left-4 z-10 p-2 focus:outline-none group"
            onClick={showPrev}
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-400/80 group-hover:bg-cyan-400 transition-all text-white shadow-xl">
              <Icon icon="ph:caret-left-bold" width={32} height={32} />
            </span>
          </button>
          <button
            className="absolute top-1/2 -translate-y-1/2 right-4 z-10 p-2 focus:outline-none group"
            onClick={showNext}
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-400/80 group-hover:bg-cyan-400 transition-all text-white shadow-xl">
              <Icon icon="ph:caret-right-bold" width={32} height={32} />
            </span>
          </button>
        </>
      )}
    </div>
  );
}
