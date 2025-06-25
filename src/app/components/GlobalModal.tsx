"use client";

import { Icon } from "@iconify/react";
import { useGlobalState } from "@/lib/globalState";
import { useEffect } from "react";

export default function GlobalModal() {
  const {
    isModalOpen,
    modalContent,
    onModalClose,
    setOnModalClose,
    setModalContent,
    setModalOpen,
  } = useGlobalState();

  const handleOnClose = () => {
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

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        setModalOpen(false);
      }
    };

    if (isModalOpen) {
      app?.classList.add("overflow-hidden");
      window.addEventListener("keydown", handleEsc);
    } else {
      app?.classList.remove("overflow-hidden");
      if (onModalClose) {
        onModalClose();
        setOnModalClose(undefined);
      }
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isModalOpen]);

  return (
    <div
      onClick={onCloseOutside}
      className={`${
        isModalOpen
          ? "bg-opacity-30 visible"
          : "opacity-0 bg-opacity-0 invisible"
      } bg-[rgb(255,255,255,.9)] md:pt-10 fixed top-0 left-0  w-full h-lvh z-50 overflow-auto transition-all duration-300`}
    >
      <div
        onAnimationEnd={() => {
          if (!isModalOpen) {
            setModalContent(null);
          }
        }}
        className={`${
          isModalOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-6 opacity-80"
        } shadow-lg bg-slate-50 transition-all duration-300 md:max-w-screen-md mx-auto w-full px-4 sm:px-6 min-h-lvh md:min-h-0 md:px-8 pt-18 pb-12 md:rounded-2xl`}
      >
        {modalContent}
        <button
          type="button"
          className="outline-0 cursor-pointer hover:text-cyan-400 transition-colors duration-300 absolute right-1 top-1 rounded-full p-4"
          onClick={handleOnClose}
        >
          <Icon icon="solar:close-circle-outline" fontSize="42" />
        </button>
      </div>
    </div>
  );
}
