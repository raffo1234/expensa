"use client";

import Link from "next/link";

const expenses = [
  { icon: "🏠", label: "Housing",   amount: "$1,200", pct: "70%", color: "bg-emerald" },
  { icon: "🛒", label: "Groceries", amount: "$480",   pct: "40%", color: "bg-plum" },
  { icon: "🚗", label: "Transport", amount: "$320",   pct: "25%", color: "bg-plumLight" },
];

export default function Hero() {
  return (
    <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-mint px-6 md:px-12 lg:px-20">

      {/* Cloud blobs */}
      <div className="absolute bottom-0 -left-20 w-[600px] h-[280px] bg-white/70 blur-[60px] rounded-[50%_60%_60%_50%] pointer-events-none" />
      <div className="absolute bottom-0 right-10  w-[480px] h-[220px] bg-white/50 blur-[60px] rounded-[60%_50%_50%_60%] pointer-events-none" />
      <div className="absolute top-16 right-1/4 w-[280px] h-[140px] bg-mintDark/60 blur-[50px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20 lg:py-0">

        {/* ── Left ── */}
        <div className="animate-fade-slide">
          <h1 className="font-display text-5xl md:text-6xl xl:text-7xl leading-[1.05] text-plum">
            Finally in control
            <br />
            <span className="inline-block bg-plum text-white px-3 py-1 mt-2 rounded-sm">
              of your money?
            </span>
          </h1>

          <p className="mt-6 text-plum/70 text-lg md:text-xl max-w-md">
            Expensa tracks every dollar, surfaces what matters, and helps you
            spend smarter — automatically.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="#"
              className="bg-plum text-white font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-plumLight transition-all duration-200 shadow-lg shadow-plum/20 flex items-center gap-2"
            >
              Track My Expenses →
            </Link>
            <Link
              href="#"
              className="border-2 border-plum text-plum font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-plum hover:text-white transition-all duration-200"
            >
              See Demo
            </Link>
          </div>

          <p className="mt-5 text-plum/50 text-xs">
            No credit card needed · Free for 14 days
          </p>
        </div>

        {/* ── Right: floating cards ── */}
        <div className="relative flex justify-center lg:justify-end">

          {/* Main dashboard card */}
          <div className="animate-float bg-white rounded-3xl shadow-2xl shadow-plum/10 p-6 w-80 md:w-96 relative z-20">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-plum/50 text-xs font-semibold uppercase tracking-widest">
                  April 2026
                </p>
                <p className="text-plum font-display text-2xl mt-0.5">Total Spent</p>
              </div>
              <span className="bg-mint text-emerald font-bold text-sm px-3 py-1 rounded-full">
                ↓ 12%
              </span>
            </div>

            <p className="font-display text-5xl text-plum mb-6">$3,241</p>

            <div className="space-y-3">
              {expenses.map(({ icon, label, amount, pct, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-semibold text-plum mb-1">
                      <span>{label}</span>
                      <span>{amount}</span>
                    </div>
                    <div className="h-2 bg-mint rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: pct }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini savings card */}
          <div className="animate-float-slow absolute -bottom-6 -left-4 md:-left-10 bg-plum text-white rounded-2xl shadow-xl p-4 w-44 z-30">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">
              Saved this month
            </p>
            <p className="font-display text-3xl mt-1">$759</p>
            <p className="text-emerald text-xs font-bold mt-1">▲ On track 🎯</p>
          </div>
        </div>

      </div>
    </section>
  );
}
