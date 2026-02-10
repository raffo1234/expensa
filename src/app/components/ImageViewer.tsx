"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";

type Props = {
  src: string;
  alt?: string;
  title?: string;
};

export const ImageViewer = ({ src, alt = "", title }: Props) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  const rotateLeft = () => setRotation((prev) => (prev - 90) % 360);
  const rotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const reset = () => {
    setZoom(1.0);
    setRotation(0);
  };

  const isVertical = (rotation / 90) % 2 !== 0;

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 overflow-hidden">
      <div className="flex-1 overflow-auto flex items-start justify-center p-8 custom-scrollbar">
        <div
          className="relative transition-all duration-300 ease-in-out"
          style={{
            transform: `rotate(${rotation}deg) scale(${zoom})`,
            width: isVertical ? "calc(100vh - 150px)" : "100%",
            height: isVertical ? "100%" : "calc(100vh - 150px)",
            minWidth: isVertical ? "calc(100vh - 150px)" : "800px",
            minHeight: isVertical ? "800px" : "calc(100vh - 150px)",
            transformOrigin: "center center",
          }}
        >
          <Image
            priority
            src={src}
            alt={alt}
            title={title}
            fill
            className="object-contain"
            sizes="200vw"
          />
        </div>
      </div>
      <div className="flex justify-center p-4 shrink-0">
        <div className="bg-cyan-400 p-2 rounded-full z-30 shadow-lg shadow-cyan-200/50 flex gap-2 items-center">
          <div className="flex gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
              className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 hover:bg-cyan-50 transition-all"
            >
              <Icon icon="ph:minus-bold" fontSize={24} />
            </button>
            <div className="bg-white/20 px-4 py-2 rounded-full text-white min-w-[70px] text-center">
              {(zoom * 100).toFixed(0)}%
            </div>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 5))}
              className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 hover:bg-cyan-50 transition-all"
            >
              <Icon icon="ph:plus-bold" fontSize={24} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/40" />

          <div className="flex gap-1">
            <button
              onClick={rotateLeft}
              className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 shadow-sm"
            >
              <Icon icon="ph:arrow-counter-clockwise-bold" fontSize={22} />
            </button>
            <button
              onClick={rotateRight}
              className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 shadow-sm"
            >
              <Icon icon="ph:arrow-clockwise-bold" fontSize={22} />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/40" />

          <button
            onClick={reset}
            className="bg-white rounded-full w-10 h-10 flex justify-center items-center text-cyan-400 shadow-sm"
            title="Reset"
          >
            <Icon icon="ph:arrows-counter-clockwise-bold" fontSize={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
