import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, Users, Lightbulb, Shield, Star } from "lucide-react";

export default function AboutPage() {
  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section className="bg-[#0f2a47] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">Our Story</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl max-w-2xl">
            Built on the Belief That Every Child Can Rise
          </h1>
          <p className="mt-5 text-white/70 max-w-xl leading-7 text-lg">
            Level UP Academy was founded with a single conviction: that the quality of a child's education should never be limited by circumstance.
          </p>
        </div>
      </section>

      {/* ── MISSION & VISION ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center">
            <BookOpen size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium">Campus photo</p>
          <p className="text-xs">Replace with real image</p>
        </div>

        <div className="space-y-8">
          <div>
            <span className="inline-block rounded-full bg-[#0f2a47]/10 px-3 py-1 text-xs font-bold text-[#0f2a47] uppercase tracking-wider mb-3">Our Mission</span>
            <p className="text-lg leading-8 text-slate-700">
              To provide a rigorous, joyful, and inclusive education that equips every student — from Kindergarten through Grade 8 — with the knowledge, character, and confidence to thrive in a changing world.
            </p>
          </div>
          <div>
            <span className="inline-block rounded-full bg-[#0f2a47]/10 px-3 py-1 text-xs font-bold text-[#0f2a47] uppercase tracking-wider mb-3">Our Vision</span>
            <p className="text-lg leading-8 text-slate-700">
              To be the school that Addis Ababa families trust most — not because we are the largest, but because we care the deepest.
            </p>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0f2a47]/50 mb-2">What We Stand For</p>
            <h2 className="text-3xl font-black text-[#0f2a47]">Our Core Values</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Lightbulb, title: "Curiosity", desc: "We reward questions more than answers. A student who asks 'why?' is already halfway to understanding." },
              { icon: Shield, title: "Integrity", desc: "We hold ourselves to the highest standard — in the classroom, on the field, and in every interaction." },
              { icon: Users, title: "Community", desc: "We are stronger together. Every family, teacher, and student is a valued member of our school family." },
              { icon: Star, title: "Excellence", desc: "We don't chase perfection — we chase growth. Every child's personal best is celebrated here." },
              { icon: CheckCircle, title: "Inclusion", desc: "Every background, every learning style, every child belongs. Diversity is our greatest strength." },
              { icon: BookOpen, title: "Lifelong Learning", desc: "We model the love of learning ourselves. Our teachers are readers, thinkers, and curious humans too." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2a47]/10 text-[#0f2a47] mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-black text-[#0f2a47] text-lg">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0f2a47]/50 mb-2">The People Behind the School</p>
          <h2 className="text-3xl font-black text-[#0f2a47]">School Leadership</h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "Dr. Alem Bekele", role: "School Director", note: "20+ years in Ethiopian education reform" },
            { name: "Tigist Haile", role: "Academic Dean", note: "Specialist in early childhood development" },
            { name: "Yonas Girma", role: "Head of Upper Primary", note: "Former national curriculum advisor" },
            { name: "Meron Tadesse", role: "Student Welfare Lead", note: "Counsellor and child psychologist" },
            { name: "Dawit Alemu", role: "Head of Operations", note: "Ensuring a safe, well-run campus daily" },
            { name: "Hiwot Seyoum", role: "Parent Liaison Officer", note: "Your first point of contact" },
          ].map((p) => (
            <div key={p.name} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f2a47]/10 text-xl font-black text-[#0f2a47]">
                {p.name.charAt(0)}
              </div>
              <div>
                <p className="font-black text-[#0f2a47]">{p.name}</p>
                <p className="text-sm font-semibold text-slate-500">{p.role}</p>
                <p className="mt-1.5 text-xs text-slate-400 leading-5">{p.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FACILITIES ── */}
      <section className="bg-[#0f2a47] text-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Our Campus</p>
            <h2 className="text-3xl font-black">World-Class Facilities,<br />Right Here in Addis</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Modern Science Lab",
              "Fully Stocked Library",
              "Computer Lab",
              "Multi-purpose Sports Field",
              "Art & Music Studio",
              "Dedicated Assembly Hall",
              "Safe, Shaded Playground",
              "School Canteen",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5">
                <CheckCircle size={16} className="text-sky-300 shrink-0" />
                <span className="text-sm font-semibold text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-[#0f2a47]">Come See It for Yourself</h2>
        <p className="mt-4 text-slate-500 max-w-md mx-auto">
          We welcome prospective families to visit our campus any school day. No appointment needed — just come.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0f2a47] px-7 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#163b60] transition"
        >
          Get in Touch <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
