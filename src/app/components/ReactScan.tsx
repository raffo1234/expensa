"use client";

import { JSX, useEffect } from "react";

export function ReactScan(): JSX.Element {
  useEffect(() => {
    // Loaded on demand so the profiler never ships in the production bundle.
    import("react-scan").then(({ scan }) => scan({ enabled: true }));
  }, []);

  return <></>;
}
