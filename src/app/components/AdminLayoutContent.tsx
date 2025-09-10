"use client";

import { useContractStore } from "@/store/contract";
import React from "react";

export default function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const isContracted = useContractStore((state) => state.isContracted);

  return (
    <section
      style={{
        minHeight: "calc(100vh - 81px)",
        width: `${isContracted ? "calc(100% - 91px)" : "calc(100% - 286px)"}`,
      }}
      className="bg-slate-50 transition-all duration-300 flex-grow relative px-3.5 md:px-7 lg:px-10 py-14 lg:border-l lg:border-gray-200"
    >
      {children}
    </section>
  );
}
