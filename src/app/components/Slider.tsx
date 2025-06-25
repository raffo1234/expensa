"use client";

import { useEffect } from "react";
import { create } from "zustand";

type SliderState = {
  sliderContent: React.ReactNode;
  setSliderContent: (sliderContent: React.ReactNode) => void;
  isSliderOpen: boolean;
  setSliderOpen: (isOpen: boolean) => void;
  onSliderClose: (() => void) | undefined;
  setOnSliderClose: (callback?: () => void) => void;
};

export const useSliderState = create<SliderState>((set) => ({
  sliderContent: null,
  setSliderContent: (sliderContent: React.ReactNode) =>
    set(() => ({ sliderContent })),
  isSliderOpen: false,
  setSliderOpen: (isOpen: boolean) => set(() => ({ isSliderOpen: isOpen })),
  onSliderClose: undefined,
  setOnSliderClose: (callback) => set({ onSliderClose: callback }),
}));

export default function Slider() {
  const { sliderContent, setSliderContent, isSliderOpen } = useSliderState();

  useEffect(() => {
    const app = document.getElementById("admin");

    if (isSliderOpen) {
      app?.classList.add("overflow-hidden");
    } else {
      app?.classList.remove("overflow-hidden");
    }
  }, [isSliderOpen]);

  return (
    <section
      onAnimationEnd={() => {
        if (!isSliderOpen) {
          setSliderContent(null);
        }
      }}
      className={`${
        isSliderOpen
          ? "bg-opacity-30 visible"
          : "opacity-0 bg-opacity-0 invisible"
      } fixed top-0 transition-all duration-300 left-0 z-60 w-full h-full bg-black p-1`}
    >
      {sliderContent}
    </section>
  );
}
