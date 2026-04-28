"use client";

import Link from "next/link";

export default function ExpenseLanding() {
  return (
    <main className="min-h-screen">
      <section className="flex flex-col items-center text-center px-6 pt-12 pb-0">
        <div
          className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase px-4 py-1.5 rounded-full mb-10"
          style={{ backgroundColor: "#B9D9B0", color: "#4d1d6a" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#4d1d6a" }}
          />
          Personal finance, simplified
        </div>
        <h1
          className="font-bold leading-[1.0] tracking-tight mb-6"
          style={{ fontSize: "clamp(3.5rem, 10vw, 7.5rem)", color: "#FFB8A9" }}
        >
          Know where
          <br />
          <span style={{ opacity: 0.25, color: "#B9D9B0" }}>your money</span>
          <br />
          goes.
        </h1>
        <p
          className="text-base font-light leading-relaxed max-w-sm mb-12"
          style={{ color: "#4d1d6a", opacity: 0.6 }}
        >
          One app. All your accounts. Total clarity over every dollar — without the spreadsheet.
        </p>
        <div className="flex gap-3 flex-wrap justify-center mb-20">
          <Link
            href="/admin/workspace"
            className="px-8 py-3.5 rounded-full text-lg font-semibold"
            style={{ backgroundColor: "#4d1d6a", color: "#d3ffe5" }}
          >
            Upload free →
          </Link>
          <Link
            href="/admin/workspace"
            className="px-8 py-3.5 rounded-full font-medium border"
            style={{ borderColor: "#B9D9B0", color: "#4d1d6a" }}
          >
            See how it works
          </Link>
        </div>{" "}
      </section>
    </main>
  );
}
