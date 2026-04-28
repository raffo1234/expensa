"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function ExpenseLanding() {
  const { data: session, status } = useSession();

  const href = status === "loading" ? "#" : session ? "/admin/workspace" : "/session/new";

  return (
    <main className="min-h-screen">
      <section className="md:grid md:grid-cols-2 items-center px-10 gap-5 min-h-[580px]">
        <div className="flex text-center md:text-right flex-col justify-end-safe items-start">
          <div
            className="inline-flex ml-auto items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-7"
            style={{ background: "#d4ecd4", color: "#3a6b45" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#3a6b45" }}
            />
            Personal finance, simplified
          </div>
          <h1
            className="font-black w-full leading-none tracking-tight mb-4"
            style={{ fontSize: "clamp(3rem, 7vw, 7rem)", color: "#2d2d2d" }}
          >
            Know
            <br />
            <span style={{ color: "#a8c8a8", opacity: 0.7 }}>your</span>
            <br />
            <span style={{ color: "#f2b97a" }}>money.</span>
          </h1>

          <p className="text-lg w-full leading-relaxed mb-8">
            One app. All your accounts. Total clarity over every dollar — without the spreadsheet.
          </p>

          <div className="w-full text-center md:text-right">
            <Link
              href={href}
              className="text-white bg-slate-900 text-lg w-fit inline-block font-semibold px-7 py-3.5 rounded-full"
            >
              Upload free →
            </Link>
          </div>
        </div>

        <div>
          <Image
            src="/expensa-hero.webp"
            alt="Person managing expenses on their phone"
            width={800}
            height={600}
            className="w-full h-auto object-contain relative z-0"
            priority
          />
        </div>
      </section>

      <div
        className="md:flex space-x-6 items-center justify-center mt-2 py-4 px-10"
        style={{ borderTop: "1px solid #e0d8cc" }}
      >
        {[
          { icon: "🔒", label: "No credit card needed" },
          { icon: "⚡", label: "Upload in 30 seconds" },
          { icon: "✦", label: "100% private" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 px-7 font-medium">
            <span>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </main>
  );
}
