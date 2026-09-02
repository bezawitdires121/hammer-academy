import Link from "next/link";
import { ArrowRight, BookOpen, Users, Award, Heart, Microscope, Music, Trophy, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-[#0f2a47] text-white">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-36 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/80 mb-6">
              Kindergarten — Grade 8 · Addis Ababa
            </span>
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Where Every Child
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-200">
                Levels Up.
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/70 max-w-lg">
              "The mind is not a vessel to be filled, but a fire to be kindled." — At Level UP Academy, we kindle that fire from the very first day.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#0f2a47] shadow-lg hover:bg-slate-100 transition"
              >
                Discover Our School <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition"
              >
                Book a Visit
              </Link>
            </div>
          </div>

          {/* Hero image placeholder */}
          <div className="relative hidden lg:block">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-white/10 border border-white/10 shadow-2xl">
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/30">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <BookOpen size={28} className="text-white/40" />
                </div>
                <p className="text-sm font-medium">School photo goes here</p>
                <p className="text-xs">Replace with your campus image</p>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 -left-5 rounded-2xl bg-white px-5 py-4 shadow-xl">
              <p className="text-2xl font-black text-[#0f2a47]">500+</p>
              <p className="text-xs font-semibold text-slate-500">Students enrolled</p>
            </div>
            <div className="absolute -top-5 -right-5 rounded-2xl bg-white px-5 py-4 shadow-xl">
              <p className="text-2xl font-black text-[#0f2a47]">15+</p>
              <p className="text-xs font-semibold text-slate-500">Years of excellence</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: "KG – 8", label: "Grade Levels" },
            { value: "40+", label: "Qualified Teachers" },
            { value: "12+", label: "Student Clubs" },
            { value: "98%", label: "Transition Rate" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-[#0f2a47]">{s.value}</p>
              <p className="mt-1 text-sm text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROGRAMS ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0f2a47]/50 mb-2">Academic Programs</p>
          <h2 className="text-3xl font-black text-[#0f2a47] sm:text-4xl">A Journey from First Steps<br />to Grade 8 Graduation</h2>
          <p className="mt-4 text-slate-500 max-w-xl mx-auto">Each stage is carefully designed to build on the last — academically, socially, and emotionally.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              stage: "Early Childhood",
              grades: "Kindergarten 1 – 3",
              color: "bg-amber-50 border-amber-200",
              badge: "bg-amber-100 text-amber-700",
              desc: "Play-based learning that builds language, numeracy, and social foundations in a warm, nurturing environment.",
              icon: Heart,
            },
            {
              stage: "Lower Primary",
              grades: "Grade 1 – 4",
              color: "bg-sky-50 border-sky-200",
              badge: "bg-sky-100 text-sky-700",
              desc: "Core literacy and mathematics alongside science, arts, and physical education — building confident, curious learners.",
              icon: BookOpen,
            },
            {
              stage: "Upper Primary",
              grades: "Grade 5 – 8",
              color: "bg-violet-50 border-violet-200",
              badge: "bg-violet-100 text-violet-700",
              desc: "Subject-specialist teaching, critical thinking, and preparation for secondary school with a strong emphasis on character.",
              icon: Award,
            },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.stage} className={`rounded-2xl border p-7 ${p.color}`}>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-5 ${p.badge}`}>
                  <Icon size={13} /> {p.grades}
                </div>
                <h3 className="text-xl font-black text-[#0f2a47]">{p.stage}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── PHOTO GRID ── */}
      <section className="bg-[#0f2a47]/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0f2a47]/50 mb-2">Life at Level UP</p>
            <h2 className="text-3xl font-black text-[#0f2a47]">More Than a Classroom</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Science Lab", span: "md:col-span-2 md:row-span-2", aspect: "aspect-square" },
              { label: "Library", span: "", aspect: "aspect-video" },
              { label: "Sports Field", span: "", aspect: "aspect-video" },
              { label: "Art Studio", span: "", aspect: "aspect-video" },
              { label: "Assembly Hall", span: "", aspect: "aspect-video" },
            ].map((img) => (
              <div key={img.label} className={`${img.span} ${img.aspect} rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400`}>
                <div className="w-10 h-10 rounded-xl bg-slate-300 flex items-center justify-center">
                  <BookOpen size={18} className="text-slate-400" />
                </div>
                <p className="text-xs font-semibold">{img.label}</p>
                <p className="text-[10px]">Photo placeholder</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLUBS & ACTIVITIES ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0f2a47]/50 mb-3">Beyond the Curriculum</p>
            <h2 className="text-3xl font-black text-[#0f2a47] sm:text-4xl">Clubs, Sports &<br />Creative Arts</h2>
            <p className="mt-5 text-slate-500 leading-7">
              We believe education lives outside the classroom too. Our students lead clubs, compete in sports, perform on stage, and build skills that no textbook can teach.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { icon: Trophy, label: "Sports Teams" },
                { icon: Music, label: "Music & Drama" },
                { icon: Microscope, label: "Science Club" },
                { icon: Globe, label: "Debate & MUN" },
                { icon: Users, label: "Student Council" },
                { icon: BookOpen, label: "Reading Club" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f2a47]/10 text-[#0f2a47]">
                    <Icon size={15} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center">
              <Trophy size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium">Students activity photo</p>
            <p className="text-xs">Replace with real image</p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="bg-[#0f2a47] text-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-5xl text-white/20 font-serif leading-none mb-6">"</p>
          <blockquote className="text-xl font-medium leading-9 text-white/90 sm:text-2xl">
            Level UP Academy didn't just teach my daughter to read — it taught her to think, to question, and to believe in herself. That's the education I always dreamed of for her.
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">S</div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">Sara Tesfaye</p>
              <p className="text-xs text-white/50">Parent, Grade 5</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-[#0f2a47] sm:text-4xl">Ready to Join Our Community?</h2>
        <p className="mt-4 text-slate-500 max-w-lg mx-auto">
          Admissions are open. Come visit our campus, meet our teachers, and see why families across Addis Ababa choose Level UP Academy.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f2a47] px-7 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#163b60] transition"
          >
            Contact Admissions <ArrowRight size={16} />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-7 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Learn More About Us
          </Link>
        </div>
      </section>
    </div>
  );
}
