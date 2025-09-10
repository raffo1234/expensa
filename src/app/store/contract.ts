import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ContractState {
  isContracted: boolean;
  setIsContracted: (contracted: boolean) => void;
}

export const useContractStore = create(
  persist<ContractState>(
    (set) => ({
      isContracted: true,
      setIsContracted: (contracted) => set({ isContracted: contracted }),
    }),
    {
      name: "contract-storage",
    },
  ),
);
