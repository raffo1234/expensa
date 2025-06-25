import useSwipe from "@/hooks/useSwipe";
import { FileType } from "@/types/fileType";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSliderState } from "./Slider";
import { PDFViewer } from "./PDFViewer";

export default function SliderFiles({
  files,
  firstIndex = 0,
}: {
  files: FileType[];
  firstIndex?: number;
}) {
  const [currentFile, setCurrentFile] = useState(files[firstIndex]);
  const { setSliderOpen } = useSliderState();
  const currentIndex = files.indexOf(currentFile);

  const useEscape = (onEscape: () => void) => {
    useEffect(() => {
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === "Escape") onEscape();
      };
      window.addEventListener("keyup", handleEsc);

      return () => {
        window.removeEventListener("keyup", handleEsc);
      };
    }, [onEscape]);
  };

  const usePrev = (onPrev: () => void) => {
    useEffect(() => {
      const handlePrev = (event: KeyboardEvent) => {
        if (event.key === "ArrowLeft") onPrev();
      };
      window.addEventListener("keyup", handlePrev);

      return () => {
        window.removeEventListener("keyup", handlePrev);
      };
    }, [onPrev]);
  };

  const useNext = (onNext: () => void) => {
    useEffect(() => {
      const handleNext = (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") onNext();
      };
      window.addEventListener("keyup", handleNext, false);

      return () => {
        window.removeEventListener("keyup", handleNext, false);
      };
    }, [onNext]);
  };

  const showPrev = () => {
    if (currentIndex <= 0) {
      setCurrentFile(files[files.length - 1]);
    } else {
      const prevImage = files[currentIndex - 1];
      setCurrentFile(prevImage);
    }
  };

  const showNext = () => {
    if (currentIndex >= files.length - 1) {
      setCurrentFile(files[0]);
    } else {
      const nextImage = files[currentIndex + 1];
      setCurrentFile(nextImage);
    }
  };

  useEscape(() => {
    setSliderOpen(false);
  });
  usePrev(() => showPrev());
  useNext(() => showNext());

  const handleSwipe = (direction: "left" | "right" | "up" | "down") => {
    if (direction === "left") showNext();
    if (direction === "right") showPrev();
  };

  useSwipe(handleSwipe, 50);

  useEffect(() => {
    if (firstIndex >= 0 && firstIndex < files.length) {
      setCurrentFile(files[firstIndex]);
    }
  }, [firstIndex, files]);

  return (
    <>
      {currentFile.extension === "application/pdf" ? (
        <PDFViewer controls fileUrl={currentFile.path} />
      ) : (
        <Image
          priority
          src={currentFile.path}
          width={200}
          height={200}
          title={currentFile.name}
          alt={currentFile.name ?? ""}
          className="w-full h-full object-contain"
        />
      )}
      <div className="absolute z-20 flex space-x-3 -translate-x-1/2 left-1/2 bottom-6">
        {files.map((file, index) => {
          const { id } = file;
          return (
            <button
              aria-label="Show image"
              onClick={() => setCurrentFile(file)}
              key={id}
              className={`flex items-center transition hover:bg-opacity-100 duration-500 ease-in-out justify-center w-6 h-6 rounded-full ${
                index === currentIndex
                  ? "bg-rose-400"
                  : "bg-white bg-opacity-40"
              } `}
            ></button>
          );
        })}
      </div>
      <div className="absolute z-20 flex items-center top-5 right-5 bg-rose-400 p-2 rounded-[50px]">
        <div className="flex items-center text-xl h-16 px-4 mr-2 bg-white/20 rounded-full text-white">
          {currentIndex + 1}&nbsp;/&nbsp;{files.length}
        </div>
        <button
          onClick={() => setSliderOpen(false)}
          title="Close"
          className="flex cursor-pointer items-center justify-center rounded-full w-16 h-16 text-rose-400 bg-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 72 72"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2"
              d="m17.5 17.5l37 37m0-37l-37 37"
            />
          </svg>
        </button>
      </div>
      {files.length > 1 ? (
        <>
          <button
            className="hidden cursor-pointer sm:block absolute top-0 text-white left-0 z-10 h-full p-4 focus:outline-none group"
            onClick={showPrev}
            aria-label="Imagen Anterior"
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full group-focus:ring bg-rose-400">
              <Icon
                icon="material-symbols-light:arrow-back-rounded"
                width={40}
                height={40}
              />
            </span>
          </button>
          <button
            className="hidden cursor-pointer sm:block absolute text-white top-0 right-0 z-10 h-full p-4 focus:outline-none group"
            onClick={showNext}
            aria-label="Imagen Siguiente"
          >
            <span className="flex items-center justify-center w-16 h-16 rounded-full group-focus:ring bg-rose-400">
              <Icon
                icon="material-symbols-light:arrow-forward-rounded"
                width={40}
                height={40}
              />
            </span>
          </button>
        </>
      ) : null}
    </>
  );
}
