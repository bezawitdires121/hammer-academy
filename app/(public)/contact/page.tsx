import { MapPin, Phone, Mail, Clock, MessageSquare, ArrowRight } from "lucide-react";

export default function ContactPage() {
  return (
    <div>
      {/* ── PAGE HERO ── */}
      <section className="bg-[#0f2a47] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">We'd Love to Hear From You</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Get in Touch</h1>
          <p className="mt-5 text-white/70 max-w-xl leading-7 text-lg">
            Whether you're a prospective family, a current parent, or just curious — our doors and inboxes are always open.
          </p>
        </div>
      </section>

      {/* ── CONTACT CARDS + FORM ── */}
      <section className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-5 gap-12">

        {/* Left — info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0f2a47]/50 mb-5">Contact Information</p>
            <div className="space-y-4">
              {[
                {
                  icon: MapPin,
                  label: "Address",
                  lines: ["Bole Sub-city, Woreda 03", "Near Bole Medhanialem Church", "Addis Ababa, Ethiopia"],
                },
                {
                  icon: Phone,
                  label: "Phone",
                  lines: ["+251 91 234 5678", "+251 11 234 5678 (Office)"],
                },
                {
                  icon: Mail,
                  label: "Email",
                  lines: ["info@levelupacademy.edu.et", "admissions@levelupacademy.edu.et"],
                },
                {
                  icon: Clock,
                  label: "Office Hours",
                  lines: ["Monday – Friday: 7:30 AM – 5:00 PM", "Saturday: 9:00 AM – 12:00 PM", "Sunday: Closed"],
                },
              ].map(({ icon: Icon, label, lines }) => (
                <div key={label} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f2a47]/10 text-[#0f2a47]">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                    {lines.map((l) => (
                      <p key={l} className="text-sm text-slate-700 leading-6">{l}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map placeholder */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex flex-col items-center justify-center gap-2 text-slate-400">
            <MapPin size={28} className="text-slate-300" />
            <p className="text-sm font-medium">Map placeholder</p>
            <p className="text-xs">Embed Google Maps here</p>
          </div>
        </div>

        {/* Right — form */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f2a47]/10 text-[#0f2a47]">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="font-black text-[#0f2a47] text-xl">Send Us a Message</h2>
                <p className="text-sm text-slate-500">We respond within one business day.</p>
              </div>
            </div>

            <form className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First Name" name="firstName" placeholder="Abebe" />
                <Field label="Last Name" name="lastName" placeholder="Kebede" />
              </div>
              <Field label="Email Address" name="email" type="email" placeholder="abebe@example.com" />
              <Field label="Phone Number" name="phone" type="tel" placeholder="+251 91 000 0000" />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Reason for Contact
                </label>
                <select
                  name="reason"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
                >
                  <option value="">Select a reason…</option>
                  <option>Admissions Enquiry</option>
                  <option>Campus Visit Request</option>
                  <option>Fee & Scholarship Information</option>
                  <option>Current Student / Parent Query</option>
                  <option>Partnership or Collaboration</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Your Message
                </label>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Tell us how we can help you…"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2a47] px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-[#163b60] transition"
              >
                Send Message <ArrowRight size={16} />
              </button>

              <p className="text-center text-xs text-slate-400">
                Your information is kept private and never shared with third parties.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ── JOIN OUR TEAM ── */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl bg-[#0f2a47] px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Careers</p>
            <h2 className="text-2xl font-black text-white">Want to Join Our Team?</h2>
            <p className="mt-2 text-white/60 text-sm max-w-md">
              We're always looking for passionate teachers, librarians, health staff, and support staff who believe in our mission.
            </p>
          </div>
          <a
            href="/apply"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#0f2a47] hover:bg-slate-100 transition"
          >
            Apply Now →
          </a>
        </div>
      </section>

      {/* ── ADMISSIONS QUICK INFO ── */}
      <section className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-[#0f2a47]">Admissions at a Glance</h2>
            <p className="mt-2 text-slate-500 text-sm">Everything you need to know before applying.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Entry Points", body: "KG 1, Grade 1, and mid-year transfers accepted subject to availability." },
              { title: "Required Documents", body: "Birth certificate, previous school report card, passport photo, and parent ID." },
              { title: "Assessment", body: "A short, friendly placement assessment for Grade 2 and above — no pressure, just to help us place your child well." },
              { title: "Registration Fee", body: "A non-refundable registration fee is required to secure your child's place. Contact us for current fee schedule." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <p className="font-black text-[#0f2a47] mb-2">{c.title}</p>
                <p className="text-sm text-slate-500 leading-6">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
      />
    </div>
  );
}
