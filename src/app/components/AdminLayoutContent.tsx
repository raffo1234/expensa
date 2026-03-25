"use client";

import React from "react";

export default function AdminLayoutContent({
  children,
  isContracted,
}: {
  children: React.ReactNode;
  isContracted: boolean;
}) {
  return (
    <section
      style={{
        minHeight: "calc(100vh - 80px)",
        width: `${isContracted ? "calc(100% - 91px)" : "calc(100% - 286px)"}`,
        marginLeft: "-1px",
      }}
      className="transition-all duration-300 flex-grow relative px-3.5 md:px-7 lg:px-10 py-14 lg:border-l lg:border-gray-200"
    >
      {children}
    </section>
  );
}
