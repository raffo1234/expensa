"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

const navItems = [
  {
    label: "Features",
    dropdown: ["Expense Tracking", "Budgets", "Recurring Bills", "Reports"],
  },
  {
    label: "Solutions",
    dropdown: ["Personal", "Freelancers", "Teams"],
  },
  { label: "Pricing" },
  { label: "Blog" },
  {
    label: "Calculators",
    dropdown: ["Budget Planner", "Savings Goal", "Debt Payoff"],
  },
];

function NavItem({ item }: { item: (typeof navItems)[0] }) {
  const [open, setOpen] = useState(false);

  if (!item.dropdown) {
    return (
      <li>
        <Link
          href="#"
          className="text-plum font-medium text-sm hover:text-emerald transition-colors"
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-1 text-plum font-medium text-sm hover:text-emerald transition-colors">
        {item.label}
        <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-lg shadow-plum/10 min-w-[180px] py-2 z-50 border border-plum/5">
          {item.dropdown.map((sub) => (
            <Link
              key={sub}
              href="#"
              className="block px-4 py-2.5 text-sm text-plum font-medium hover:bg-mint transition-colors"
            >
              {sub}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="relative z-40 bg-mint/80 backdrop-blur-md border-b border-emerald/20 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0 font-display text-2xl text-emerald border-2 border-emerald rounded-lg px-3 py-0.5 tracking-tight"
        >
          expensa
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </ul>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="#"
            className="bg-plum text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-plumLight transition-colors"
          >
            Sign Up
          </Link>
          <Link
            href="#"
            className="bg-plum text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-plumLight transition-colors"
          >
            Log In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-plum"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <Icon icon="solar:close-linear" className="w-5 h-5" />
          ) : (
            <Icon icon="solar:hamburger-menu-linear" className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur rounded-2xl mb-4 p-4 space-y-2 border border-plum/5 shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href="#"
              className="block py-2 text-plum font-medium hover:text-emerald transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-3 border-t border-plum/10">
            <Link
              href="#"
              className="flex-1 text-center bg-plum text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-plumLight transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="#"
              className="flex-1 text-center bg-plum text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-plumLight transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
