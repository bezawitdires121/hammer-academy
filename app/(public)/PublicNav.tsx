"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Apply", href: "/apply" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f2a47] text-xs font-black text-white shadow">
            LUA
          </div>
          <div className="leading-tight">
            <p className="text-sm font-black text-[#0f2a47] tracking-tight">Level UP Academy</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:block">Addis Ababa</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                pathname === l.href
                  ? "bg-[#0f2a47] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-3 rounded-lg bg-[#0f2a47] px-4 py-2 text-sm font-bold text-white hover:bg-[#163b60] transition"
          >
            Portal Login
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                pathname === l.href
                  ? "bg-[#0f2a47] text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-lg bg-[#0f2a47] px-4 py-2.5 text-sm font-bold text-white text-center mt-2"
          >
            Portal Login
          </Link>
        </div>
      )}
    </header>
  );
}
