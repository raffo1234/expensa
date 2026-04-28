"use client";

import { useState } from "react";

const steps = [
  {
    tag: "Connect your accounts",
    headline: "See everything,\nat a glance.",
    bullets: [
      "Link banks, cards, and wallets in seconds",
      "Transactions auto-synced, no manual entry",
      "All balances in one clean dashboard",
      "Read-only access — your data is never touched",
    ],
    accent: "#e8f4f0",
    accentDot: "#2a9d8f",
  },
  {
    tag: "Understand your spending",
    headline: "Know exactly\nwhere it goes.",
    bullets: [
      "Auto-categorized transactions from day one",
      "Weekly and monthly spending breakdowns",
      "Spot subscriptions you forgot about",
      "Compare this month vs. last month instantly",
    ],
    accent: "#fdf3e7",
    accentDot: "#e76f51",
  },
  {
    tag: "Set goals and budgets",
    headline: "Spend with\nintention.",
    bullets: [
      "Create budgets for any category you want",
      "Get nudged before you overspend — not after",
      "Set savings goals and track progress visually",
      "Adjust on the fly as life changes",
    ],
    accent: "#eef2fb",
    accentDot: "#4361ee",
  },
];

const faqs = [
  {
    q: "Is Spndly really free?",
    a: "Yes. Core tracking, budgets, and reports are free forever. We offer an optional Pro plan for advanced features like investment tracking and custom reports.",
  },
  {
    q: "How does Spndly connect to my bank?",
    a: "We use bank-level 256-bit encryption and read-only connections via Plaid — the same technology used by Venmo and Coinbase. We can see your transactions but never move money.",
  },
  {
    q: "Will this work with my bank?",
    a: "Spndly connects to over 12,000 financial institutions in the US, including all major banks, credit unions, and credit cards.",
  },
  {
    q: "What if I want to delete my account?",
    a: "You can delete your account and all associated data at any time, instantly, from the app settings. No questions asked.",
  },
];

export default function ExpenseLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main
      className="bg-white text-[#1a1a2e] min-h-screen"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1a1a2e] flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-sm">Spndly</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <button className="text-sm bg-[#1a1a2e] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#2d2d4e] transition-colors">
            Get the app
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-5 font-medium">Personal finance, simplified</p>
        <h1 className="text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-[#1a1a2e] mb-7">
          Stop guessing.<br />
          <span className="text-gray-300">Start knowing.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed mb-12">
          Spndly connects all your accounts and gives you a clear, honest picture
          of your finances — in about two minutes.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button className="bg-[#1a1a2e] text-white px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-[#2d2d4e] transition-colors">
            Download free →
          </button>
          <button className="border border-gray-200 text-gray-600 px-7 py-3.5 rounded-full text-sm font-medium hover:border-gray-400 transition-colors">
            See how it works
          </button>
        </div>

        {/* Hero visual — minimal phone mockup */}
        <div className="mt-20 relative inline-block">
          <div className="w-72 mx-auto bg-[#f7f7fa] rounded-3xl p-5 border border-gray-100 text-left shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-xs text-gray-400">Total balance</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">$12,480</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">This month</p>
                <p className="text-sm font-semibold text-red-400">−$2,841</p>
              </div>
            </div>
            {/* Bar chart */}
            <div className="space-y-2.5 mb-5">
              {[
                { cat: "Housing", pct: 72, color: "bg-[#1a1a2e]" },
                { cat: "Food", pct: 41, color: "bg-gray-400" },
                { cat: "Transport", pct: 22, color: "bg-gray-300" },
              ].map((b) => (
                <div key={b.cat}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{b.cat}</span>
                    <span>{b.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full">
                    <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Transactions */}
            <div className="bg-white rounded-2xl divide-y divide-gray-50">
              {[
                { icon: "🛒", name: "Whole Foods", amt: "$84" },
                { icon: "☕", name: "Blue Bottle", amt: "$6" },
                { icon: "📺", name: "Netflix", amt: "$15" },
              ].map((tx) => (
                <div key={tx.name} className="flex justify-between items-center px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{tx.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{tx.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">−{tx.amt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -right-8 top-10 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 text-left w-44">
            <p className="text-xs text-gray-400 mb-0.5">vs last month</p>
            <p className="text-sm font-bold text-green-500">↓ Saved $420</p>
          </div>
          <div className="absolute -left-8 bottom-16 bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3 text-left w-44">
            <p className="text-xs text-gray-400 mb-0.5">Budget status</p>
            <p className="text-sm font-bold text-[#1a1a2e]">On track ✓</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-gray-100 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-medium text-center">How it works</p>
          <h2 className="text-4xl font-bold text-center mb-20 tracking-tight">Three steps to clarity.</h2>

          <div className="space-y-32">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`grid grid-cols-1 md:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                {/* Text */}
                <div>
                  <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: step.accentDot }}>
                    {String(i + 1).padStart(2, "0")} — {step.tag}
                  </span>
                  <h3 className="text-4xl font-bold mt-4 mb-8 leading-tight tracking-tight whitespace-pre-line">
                    {step.headline}
                  </h3>
                  <ul className="space-y-3">
                    {step.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="mt-1 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: step.accent }}>
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke={step.accentDot} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="text-gray-600 text-sm leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual card */}
                <div
                  className="rounded-3xl p-10 flex items-center justify-center min-h-[280px]"
                  style={{ background: step.accent }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {i === 0 ? "🏦" : i === 1 ? "📊" : "🎯"}
                    </div>
                    <p className="text-sm font-medium" style={{ color: step.accentDot }}>
                      {i === 0 ? "12,000+ banks supported" : i === 1 ? "Auto-categorized instantly" : "Custom budgets, your way"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-[#1a1a2e] py-16">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-3 gap-8 text-center text-white">
          {[
            { val: "50,000+", label: "People tracking smarter" },
            { val: "$2M+", label: "Tracked every month" },
            { val: "2 min", label: "Average setup time" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-bold mb-2">{s.val}</p>
              <p className="text-sm text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-medium text-center">FAQ</p>
          <h2 className="text-4xl font-bold text-center mb-14 tracking-tight">
            You&apos;ve got questions,<br />we&apos;ve got answers.
          </h2>

          <div className="divide-y divide-gray-100 border-t border-gray-100">
            {faqs.map((faq, i) => (
              <div key={i} className="py-5">
                <button
                  className="w-full flex justify-between items-center text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-[#1a1a2e] text-sm">{faq.q}</span>
                  <span className="text-gray-300 text-lg shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <p className="mt-3 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#f7f7fa] py-24 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold tracking-tight mb-5">
            Ready to take control?
          </h2>
          <p className="text-gray-400 text-base mb-10 max-w-sm mx-auto">
            Free forever. Two minutes to set up. No credit card required.
          </p>
          <button className="bg-[#1a1a2e] text-white px-10 py-4 rounded-full text-sm font-semibold hover:bg-[#2d2d4e] transition-colors">
            Download Spndly →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <span>© 2026 Spndly. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
