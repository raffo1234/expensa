import { create } from "zustand";

type GlobalState = {
  modalContent: React.ReactNode;
  setModalContent: (modalContent: React.ReactNode) => void;
  isModalOpen: boolean;
  setModalOpen: (isOpen: boolean) => void;
  onModalClose: (() => void) | undefined;
  setOnModalClose:  (callback?: () => void) => void;
};

export const useGlobalState = create<GlobalState>((set) => ({
  modalContent: null,
  setModalContent: (modalContent: React.ReactNode) =>
    set(() => ({ modalContent })),
  isModalOpen: false,
  setModalOpen: (isOpen: boolean) => set(() => ({ isModalOpen: isOpen })),
  onModalClose: undefined,
  setOnModalClose: (callback) => set({ onModalClose: callback }), 
}));