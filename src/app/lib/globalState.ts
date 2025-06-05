import { PropertyType } from "@/types/propertyState";
import { create } from "zustand";

type GlobalState = {
  roleId: string | undefined;
  setRoleId: (id: string) => void;
  propertyId: string | undefined;
  show: () => void;
  hide: () => void;
  setPropertyId: (id: string) => void;
  setPropertyType: (propertyType: PropertyType) => void;
  isDisplayed: boolean;
  propertyType: string;
  modalContent: React.ReactNode;
  setModalContent: (modalContent: React.ReactNode) => void;
  isModalOpen: boolean;
  setModalOpen: (isOpen: boolean) => void;
  editModalContent: React.ReactNode;
  setEditModalContent: (editModalContent: React.ReactNode) => void;
  isEditModalOpen: boolean;
  setEditModalOpen: (isEditModalOpen: boolean) => void;
  editPropertyId: string;
  setEditPropertyId: (editPropertyId: string) => void;
};

export const useGlobalState = create<GlobalState>((set) => ({
  roleId: undefined,
  setRoleId: (id) => set(() => ({ roleId: id })),
  propertyId: undefined,
  setPropertyId: (id) => set(() => ({ propertyId: id })),
  show: () => set(() => ({ isDisplayed: true })),
  hide: () => set(() => ({ isDisplayed: false })),
  isDisplayed: false,
  propertyType: PropertyType.APARTMENT,
  setPropertyType: (propertyType) => set(() => ({ propertyType })),

  modalContent: null,
  setModalContent: (modalContent: React.ReactNode) =>
    set(() => ({ modalContent })),
  isModalOpen: false,
  setModalOpen: (isOpen: boolean) => set(() => ({ isModalOpen: isOpen })),

  editPropertyId: "",
  setEditPropertyId: (editPropertyId: string) =>
    set(() => ({ editPropertyId })),
  editModalContent: null,
  isEditModalOpen: false,
  setEditModalOpen: (isEditModalOpen: boolean) =>
    set(() => ({ isEditModalOpen })),
  editPropertyModalContent: null,
  setEditModalContent: (editModalContent: React.ReactNode) =>
    set(() => ({ editModalContent })),
}));
