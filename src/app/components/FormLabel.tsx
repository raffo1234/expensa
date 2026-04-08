import React from "react";

export default function FormLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-block mb-2" htmlFor={htmlFor}>
      {children}
    </label>
  );
}
