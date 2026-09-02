import Link from "next/link";
import PublicNav from "./PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-[#0a1e33] text-white">
        <div className="mx-auto max-w-6xl px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-white">
                LUA
              </div>
              <div>
                <p className="font-black text-white tracking-tight">Level UP Academy</p>
                <p className="text-xs text-white/50 uppercase tracking-widest">Addis Ababa, Ethiopia</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/60 max-w-sm">
              Nurturing curious minds from Kindergarten through Grade 8. We believe every child carries the potential to rise — our job is to make sure nothing holds them back.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Navigate</p>
            <ul className="space-y-2.5 text-sm text-white/70">
              {[["Home", "/"], ["About", "/about"], ["Contact", "/contact"], ["Apply", "/apply"], ["Parent Portal", "/login"]].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Contact</p>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li>📍 Bole Sub-city, Addis Ababa</li>
              <li>📞 +251 91 234 5678</li>
              <li>✉️ info@levelupacademy.edu.et</li>
              <li>🕐 Mon–Fri, 7:30 AM – 5:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Level UP Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
