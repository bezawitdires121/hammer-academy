"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  Megaphone,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  BarChart3,
  X,
  Home,
  Users2,
  HeartPulse,
  CalendarDays,
  Trophy,
} from "lucide-react";

import { Role } from "@/lib/roles";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navigation: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      title: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/admin",
          icon: LayoutDashboard,
        },
      ],
    },

    {
      title: "People",
      items: [
        {
          label: "Students",
          href: "/dashboard/admin/students",
          icon: GraduationCap,
        },
        {
          label: "Teachers",
          href: "/dashboard/admin/teachers",
          icon: UserCheck,
        },
        {
          label: "Employees",
          href: "/dashboard/admin/employees",
          icon: Users2,
        },
        {
          label: "Applications",
          href: "/dashboard/admin/applications",
          icon: UserPlus,
        },
      ],
    },

    {
      title: "Academics",
      items: [
        {
          label: "School Years",
          href: "/dashboard/admin/school-years",
          icon: CalendarDays,
        },
        {
          label: "Grades",
          href: "/dashboard/admin/grades",
          icon: GraduationCap,
        },
        {
          label: "Sections",
          href: "/dashboard/admin/sections",
          icon: School,
        },
        {
          label: "Results",
          href: "/dashboard/admin/results",
          icon: ClipboardCheck,
        },
        {
          label: "Clubs",
          href: "/dashboard/admin/clubs",
          icon: Trophy,
        },
        {
          label: "Analytics",
          href: "/dashboard/admin/analytics",
          icon: BarChart3,
        },
      ],
    },

    {
      title: "Communication",
      items: [
        {
          label: "Announcements",
          href: "/dashboard/announcements",
          icon: Megaphone,
        },
        {
          label: "Messages",
          href: "/dashboard/admin/messages",
          icon: MessageSquare,
        },
      ],
    },

    {
      title: "System",
      items: [
        {
          label: "Users",
          href: "/dashboard/admin/users",
          icon: Users2,
        },
        {
          label: "Audit Log",
          href: "/dashboard/admin/audit-log",
          icon: ShieldCheck,
        },
        {
          label: "Activity",
          href: "/dashboard/admin/activity",
          icon: Activity,
        },
        {
          label: "Settings",
          href: "/dashboard/admin/settings",
          icon: Settings,
        },
      ],
    },
  ],

  TEACHER: [
    {
      title: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/teacher",
          icon: LayoutDashboard,
        },
      ],
    },

    {
      title: "Teaching",
      items: [
        {
          label: "My Students",
          href: "/dashboard/teacher/students",
          icon: Users,
        },
        {
          label: "Results",
          href: "/dashboard/teacher/results",
          icon: ClipboardCheck,
        },
        {
          label: "Homework",
          href: "/dashboard/teacher/homework",
          icon: BookOpen,
        },
        {
          label: "Homeroom",
          href: "/dashboard/teacher/homeroom",
          icon: Home,
        },
        {
          label: "Club",
          href: "/dashboard/employee/club",
          icon: Trophy,
        },
      ],
    },

    {
      title: "Communication",
      items: [
        {
          label: "Announcements",
          href: "/dashboard/announcements",
          icon: Megaphone,
        },
        {
          label: "Messages",
          href: "/dashboard/teacher/messages",
          icon: MessageSquare,
        },
      ],
    },

    {
      title: "Account",
      items: [
        {
          label: "My Profile",
          href: "/dashboard/teacher/profile",
          icon: UserCheck,
        },
      ],
    },
  ],

  STUDENT: [
    {
      title: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/student",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Academics",
      items: [
        {
          label: "Results",
          href: "/dashboard/student/results",
          icon: ClipboardCheck,
        },
        {
          label: "Attendance",
          href: "/dashboard/student/attendance",
          icon: CalendarCheck,
        },
        {
          label: "Homework",
          href: "/dashboard/student/homework",
          icon: BookOpen,
        },
      ],
    },
    {
      title: "School Life",
      items: [
        {
          label: "My Club",
          href: "/dashboard/student/club",
          icon: Trophy,
        },
        {
          label: "Library",
          href: "/dashboard/student/library",
          icon: Library,
        },
        {
          label: "Health",
          href: "/dashboard/student/health",
          icon: HeartPulse,
        },
      ],
    },
    {
      title: "Communication",
      items: [
        {
          label: "Announcements",
          href: "/dashboard/announcements",
          icon: Megaphone,
        },
        {
          label: "Messages",
          href: "/dashboard/student/messages",
          icon: MessageSquare,
        },
      ],
    },
  ],
  LIBRARIAN: [
    {
      title: "Library",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/employee/librarian",
          icon: Library,
        },
        {
          label: "Books",
          href: "/dashboard/employee/librarian/books",
          icon: BookOpen,
        },
        {
          label: "Loans",
          href: "/dashboard/employee/librarian/loans",
          icon: ClipboardCheck,
        },
        {
          label: "Students",
          href: "/dashboard/employee/librarian/students",
          icon: Users,
        },
      ],
    },
    {
      title: "Communication",
      items: [
        {
          label: "Announcements",
          href: "/dashboard/announcements",
          icon: Megaphone,
        },
      ],
    },
  ],
  HEALTH: [
    {
      title: "Health",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/employee/health",
          icon: HeartPulse,
        },
        {
          label: "Students",
          href: "/dashboard/employee/health/students",
          icon: Users,
        },
        {
          label: "Visits",
          href: "/dashboard/employee/health/visits",
          icon: Activity,
        },
      ],
    },
    {
      title: "Communication",
      items: [
        {
          label: "Announcements",
          href: "/dashboard/announcements",
          icon: Megaphone,
        },
      ],
    },
  ],
};

export default function Sidebar({
  role,
  open,
  onClose,
}: {
  role: Role;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sections = navigation[role];

  const preserveAcademicContext =
    role === "TEACHER" || role === "STUDENT";

  const buildHref = (href: string) => {
    if (!preserveAcademicContext) {
      return href;
    }

    const currentSchoolYearId =
      searchParams.get("schoolYearId");

    const currentSemesterId =
      searchParams.get("semesterId");

    if (!currentSchoolYearId || !currentSemesterId) {
      return href;
    }

    const [hrefPath, hrefQuery] = href.split("?");

    const params = new URLSearchParams(
      hrefQuery ?? ""
    );

    params.set(
      "schoolYearId",
      currentSchoolYearId
    );

    params.set(
      "semesterId",
      currentSemesterId
    );

    return `${hrefPath}?${params.toString()}`;
  };

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");

    // Exact dashboard match
    if (hrefPath === `/dashboard/${role.toLowerCase()}`) {
      return pathname === hrefPath;
    }

    // Query-string navigation item
    if (hrefQuery) {
      const params = new URLSearchParams(hrefQuery);

      if (pathname !== hrefPath) {
        return false;
      }

      for (const [key, value] of params.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }

      return true;
    }

    return (
      pathname === hrefPath ||
      pathname.startsWith(`${hrefPath}/`)
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-brand-primary text-white shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-black text-brand-primary shadow-lg">
              LUA
            </div>

            <div>
              <p className="text-sm font-black tracking-tight text-white">
                Level UP Academy
              </p>

              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                School Management
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {sections.map((section) => (
            <div key={section.title} className="mb-7">
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={buildHref(item.href)}
                      onClick={onClose}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all ${
  active
    ? "bg-white/15 font-bold text-white shadow-sm ring-1 ring-white/10"
    : "font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
}`}
                    >
                      {active && (
                        <span className="absolute left-0 h-8 w-1 rounded-r-full bg-emerald-400" />
                      )}

                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active
  ? "bg-emerald-500/20 text-emerald-300"
  : "bg-white/5 group-hover:bg-white/10"}`}
                      >
                        <Icon
                          size={18}
                          strokeWidth={active ? 2.7 : 2.2}
                        />
                      </span>

                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom card */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={17}
                className="text-emerald-400"
                strokeWidth={2.5}
              />

              <p className="text-xs font-bold text-white">
                Secure School System
              </p>
            </div>

            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              Level UP Academy management platform
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

