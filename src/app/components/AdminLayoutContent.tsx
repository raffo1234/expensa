import React from "react";

/**
 * Page area next to the sidebar. It takes whatever width the sidebar leaves
 * (flex-1) and may shrink below its content (min-w-0), so it follows the
 * sidebar as it opens or closes and wide tables scroll inside their card
 * instead of pushing the page wider.
 */
export default function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{ minHeight: "calc(100vh - 80px)", marginLeft: "-1px" }}
      className="relative min-w-0 flex-1 px-3.5 py-10"
    >
      {children}
    </section>
  );
}
