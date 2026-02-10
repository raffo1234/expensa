import useSwipe from "@/hooks/useSwipe";
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
  const currentIndex = currentFile ? files.indexOf(currentFile) : -1;

  const useKeyboardNavigation = (onEscape: () => void, onPrev: () => void, onNext: () => void) => {
    useEffect(() => {
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") onEscape();
        if (event.key === "ArrowLeft") onPrev();
        if (event.key === "ArrowRight") onNext();
      };
      window.addEventListener("keyup", handleKey);

      return () => {
        window.removeEventListener("keyup", handleKey);
      };
    }, [onEscape, onPrev, onNext]);
  };

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

  useKeyboardNavigation(() => setSliderOpen(false), showPrev, showNext);

  const handleSwipe = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (direction === "left") showNext();
      if (direction === "right") showPrev();
    },
    [showPrev, showNext],
  );

  useSwipe(handleSwipe, 50);

  useEffect(() => {
    if (files.length > 0 && firstIndex >= 0 && firstIndex < files.length) {
      setCurrentFile(files[firstIndex]);
    }
  }, [files, firstIndex]);

  if (!currentFile) return null;

  return (
    <>
      {currentFile.extension === "application/pdf" ? (
        <PDFViewer controls fileUrl={currentFile.path} />
      ) : (
        <ImageViewer src={currentFile.path} />
      )}
      <div className="absolute z-20 flex space-x-3 -translate-x-1/2 left-1/2 bottom-6">
        {files.map((file, index) => (
          <button
            key={file.id}
            aria-label={`Show ${file.name}`}
            onClick={() => setCurrentFile(file)}
            className={`flex items-center justify-center w-6 h-6 rounded-full transition duration-300 ease-in-out ${
              index === currentIndex ? "bg-rose-400" : "bg-white bg-opacity-40 hover:bg-opacity-100"
            }`}
          ></button>
        ))}
      </div>
      <div className="absolute z-20 flex items-center top-5 right-5 bg-rose-400 p-2 rounded-[50px]">
        <div className="flex items-center h-10 px-4 mr-2 bg-white/20 rounded-full text-white">
          {currentIndex + 1}&nbsp;/&nbsp;{files.length}
        </div>
        <button
          onClick={() => setSliderOpen(false)}
          title="Close"
          className="flex cursor-pointer items-center justify-center rounded-full w-10 h-10 text-rose-400 bg-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 72 72">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m17.5 17.5l37 37m0-37l-37 37"
            />
          </svg>
        </button>
      </div>
      {files.length > 1 && (
        <>
          <button
            className="hidden sm:block absolute top-1/2 -translate-y-1/2 left-0 z-10 p-4 focus:outline-none group"
            onClick={showPrev}
            aria-label="Previous Image"
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-400 group-focus:ring">
              <Icon
                icon="material-symbols-light:arrow-back-rounded"
                width={40}
                height={40}
                className="text-white"
              />
            </span>
          </button>
          <button
            className="hidden sm:block absolute top-1/2 -translate-y-1/2 right-0 z-10 p-4 focus:outline-none group"
            onClick={showNext}
            aria-label="Next Image"
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-400 group-focus:ring">
              <Icon
                icon="material-symbols-light:arrow-forward-rounded"
                width={40}
                height={40}
                className="text-white"
              />
            </span>
          </button>
        </>
      )}
    </>
  );
}
