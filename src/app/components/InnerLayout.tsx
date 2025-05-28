"use client";

import usePageVisibility from "@/hooks/usePageVisibility";
import { useEffect } from "react";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isPageVisible = usePageVisibility();

  useEffect(() => {
    if (!isPageVisible) {
      const savedTemplateId = localStorage.getItem("dicomActiveTemplateId");
      if (savedTemplateId) localStorage.removeItem("dicomActiveTemplateId");

      const savedSearchWord = localStorage.getItem("dicomSearchWord");
      if (savedSearchWord) localStorage.removeItem("dicomSearchWord");

      const savedPage = localStorage.getItem("page");
      if (savedPage) localStorage.removeItem("page");

      const savedStudyDateRange = localStorage.getItem("dicomStudyDateRange");
      if (savedStudyDateRange) localStorage.removeItem("dicomStudyDateRange");

      const savedReceiptDateRange = localStorage.getItem(
        "dicomReceiptDateRange"
      );
      if (savedReceiptDateRange)
        localStorage.removeItem("dicomReceiptDateRange");
    }
  }, [isPageVisible]);

  return children;
}
