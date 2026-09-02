import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck, HeartPulse, ShieldCheck, Users, UsersRound } from "lucide-react";

export default async function EmployeeDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });

  if (!employee) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Staff Dashboard</h1>
        <p className="mt-4 text-sm text-gray-600">No staff profile found for your account.</p>
      </div>
    );
  }

  const gradeBands = [
    { label: "KG - Grade 3", range: "KG to Grade 3" },
    { label: "Grade 1 - 4", range: "1 to 4" },
    { label: "Grade 5 - 8", range: "5 to 8" },
  ];

  const quickLinks = {
    
    LIBRARIAN: [
      { href: "/dashboard/employee/librarian", label: "Library overview", icon: BookOpen },
      { href: "/dashboard/announcements", label: "Announcements", icon: CalendarCheck },
    ],
    HEALTH: [
      { href: "/dashboard/employee/health", label: "Health overview", icon: HeartPulse },
      { href: "/dashboard/announcements", label: "Announcements", icon: CalendarCheck },
    ],
    CLEANER: [
      { href: "/dashboard/employee", label: "Operations", icon: ShieldCheck },
      { href: "/dashboard/announcements", label: "School updates", icon: CalendarCheck },
    ],
    SECURITY: [
      { href: "/dashboard/employee", label: "Security log", icon: ShieldCheck },
      { href: "/dashboard/announcements", label: "Alerts", icon: CalendarCheck },
    ],
    SECRETARY: [
      { href: "/dashboard/employee", label: "Office tasks", icon: Users },
      { href: "/dashboard/announcements", label: "Announcements", icon: CalendarCheck },
    ],
    OTHER: [
      { href: "/dashboard/employee", label: "View tasks", icon: Users },
      { href: "/dashboard/announcements", label: "School updates", icon: CalendarCheck },
    ],
  } as const;

  const links = quickLinks[employee.role as keyof typeof quickLinks] ?? quickLinks.OTHER;

  return (
    <div className="space-y-6 p-6">
      <section className="overflow-hidden rounded-2xl bg-brand-primary p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/70">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold">{employee.fullName}</h1>
            <p className="mt-1 text-sm text-white/80">{employee.role} dashboard</p>
          </div>
          <Link href="/dashboard/employee/profile" className="inline-flex items-center gap-2 rounded-xl bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-primary">
            My profile
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Staff role</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{employee.role}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Assigned school level</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{employee.clubType ?? "School support"}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Operational area</p>
          <p className="mt-2 text-xl font-bold text-gray-900">{employee.clubName ?? "General"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Grade coverage</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {gradeBands.map((band) => (
            <div key={band.label} className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-4">
              <p className="text-sm font-semibold text-brand-primary">{band.label}</p>
              <p className="mt-2 text-sm text-gray-600">{band.range}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Quick actions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 transition hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <Icon size={18} />
                </div>
                <span className="font-medium text-gray-900">{label}</span>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
