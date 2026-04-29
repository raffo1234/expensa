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
      className="flex-grow relative px-3.5 py-10"
    >
      {children}
    </section>
  );
}
