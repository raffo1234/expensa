"use client";

import Link from "next/link";

export default function ExpenseLanding() {
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#d3ffe5", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-12 pb-0">
        <div
          className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase px-4 py-1.5 rounded-full mb-10"
          style={{ backgroundColor: "#4d1d6a18", color: "#4d1d6a" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "#4d1d6a" }}
          />
          Personal finance, simplified
        </div>

        <h1
          className="font-bold leading-[1.0] tracking-tight mb-6"
          style={{ fontSize: "clamp(3.5rem, 10vw, 7.5rem)", color: "#4d1d6a" }}
        >
          Know where
          <br />
          <span style={{ opacity: 0.25 }}>your money</span>
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
            className="px-8 py-3.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: "#4d1d6a", color: "#d3ffe5" }}
          >
            Download free →
          </Link>
          <Link
            href="/admin/workspace"
            className="px-8 py-3.5 rounded-full text-sm font-medium border"
            style={{ borderColor: "#4d1d6a50", color: "#4d1d6a" }}
          >
            See how it works
          </Link>
        </div>

        {/* App card anchored to bottom */}
        <div
          className="w-full max-w-lg rounded-t-3xl p-6 text-left"
          style={{ backgroundColor: "#4d1d6a" }}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs mb-1" style={{ color: "#d3ffe560" }}>
                Good morning, Alex
              </p>
              <p className="text-3xl font-bold" style={{ color: "#d3ffe5" }}>
                $12,480
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#d3ffe540" }}>
                Total balance
              </p>
            </div>
            <div
              className="text-right px-4 py-2 rounded-2xl"
              style={{ backgroundColor: "#ffffff10" }}
            >
              <p className="text-xs mb-0.5" style={{ color: "#d3ffe550" }}>
                This month
              </p>
              <p className="text-lg font-bold" style={{ color: "#ffa3bc" }}>
                −$2,841
              </p>
              <p className="text-xs" style={{ color: "#6bffa8" }}>
                ↓ 12% vs last
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {[
              { cat: "Housing", pct: 72, color: "#d3ffe5" },
              { cat: "Food & Dining", pct: 41, color: "#c4b5fd" },
              { cat: "Transport", pct: 22, color: "#6bffa8" },
              { cat: "Shopping", pct: 16, color: "#ffd6e7" },
            ].map((b) => (
              <div key={b.cat}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "#d3ffe560" }}>
                    {b.cat}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "#d3ffe580" }}>
                    {b.pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "#ffffff10" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, backgroundColor: b.color, opacity: 0.75 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {[
              { icon: "🛒", name: "Whole Foods", time: "Today", amt: "−$84" },
              { icon: "☕", name: "Blue Bottle", time: "Yesterday", amt: "−$6" },
              { icon: "📺", name: "Netflix", time: "Apr 22", amt: "−$15" },
            ].map((tx) => (
              <div
                key={tx.name}
                className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: "#ffffff08" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{ backgroundColor: "#ffffff12" }}
                  >
                    {tx.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#d3ffe5" }}>
                      {tx.name}
                    </p>
                    <p className="text-[10px]" style={{ color: "#d3ffe535" }}>
                      {tx.time}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold" style={{ color: "#ffa3bc" }}>
                  {tx.amt}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "#4d1d6a" }}>
        <div className="max-w-5xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <p
              className="text-sm font-semibold tracking-widest uppercase mb-3"
              style={{ color: "#d3ffe5" }}
            >
              Spndly
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#d3ffe560" }}>
              Clarity over every dollar. <br />
              Free forever, no credit card needed.
            </p>
          </div>

          {/* Links */}
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-4 font-medium"
              style={{ color: "#d3ffe540" }}
            >
              Product
            </p>
            <ul className="space-y-2.5">
              {["Features", "Pricing", "Download", "Changelog"].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-xs transition-opacity hover:opacity-100"
                    style={{ color: "#d3ffe570" }}
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-4 font-medium"
              style={{ color: "#d3ffe540" }}
            >
              Company
            </p>
            <ul className="space-y-2.5">
              {["About", "Blog", "Privacy Policy", "Terms"].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-xs transition-opacity hover:opacity-100"
                    style={{ color: "#d3ffe570" }}
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="max-w-5xl mx-auto px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderTop: "1px solid #d3ffe515" }}
        >
          <p className="text-[10px]" style={{ color: "#d3ffe530" }}>
            © 2026 Spndly. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Twitter", "Instagram", "LinkedIn"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-[10px] tracking-wide transition-opacity hover:opacity-100"
                style={{ color: "#d3ffe540" }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
