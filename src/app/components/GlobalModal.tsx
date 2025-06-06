"use client";

import { Icon } from "@iconify/react";
import { useGlobalState } from "@/lib/globalState";
import { useEffect } from "react";

export default function GlobalModal() {
  const { isModalOpen, modalContent, setModalOpen } = useGlobalState();

  const onClose = () => {
    if (!isModalOpen) return;
    setModalOpen(false);
  };

  const onCloseOutside = (event: React.MouseEvent<HTMLElement>) => {
    if (!isModalOpen) return;
    if (event.target === event.currentTarget) {
      setModalOpen(false);
    }
  };

  useEffect(() => {
    const app = document.getElementById("admin");
    if (isModalOpen) {
      app?.classList.add("overflow-hidden");
    } else {
      app?.classList.remove("overflow-hidden");
    }
  }, [isModalOpen]);

  return (
    <div
      onClick={onCloseOutside}
      className={`${
        isModalOpen
          ? "bg-opacity-30 visible"
          : "opacity-0 bg-opacity-0 invisible"
      } bg-[rgb(0,0,0,0.6)] md:pt-10 fixed top-0 left-0  w-full h-lvh z-50 overflow-auto`}
    >
      <div
        className={`${
          isModalOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-80"
        } bg-slate-50 transition-all duration-300 md:max-w-screen-md mx-auto w-full px-8 min-h-lvh md:min-h-0 md:px-10 py-12 md:rounded-2xl`}
      >
        {modalContent}
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full p-4 hover:text-gray-600"
          onClick={onClose}
        >
          <Icon icon="solar:close-circle-broken" fontSize="42" />
        </button>
      </div>
    </div>
  );
}
