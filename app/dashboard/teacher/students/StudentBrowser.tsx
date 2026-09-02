
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  GraduationCap,
  BookOpen,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

type Student = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  classNo: number;
  classId: string;
  className: string;
  grade: number;
  isClassTeacher: boolean;
  subjects: string[];
  parents: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string;
  }[];
};

type SchoolClass = {
  id: string;
  name: string;
  grade: number;
};

export default function StudentsBrowser({
  students,
  classes,
}: {
  students: Student[];
  classes: SchoolClass[];
}) {
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.fullName.toLowerCase().includes(query) ||
        String(student.classNo).includes(query) ||
        student.className.toLowerCase().includes(query);

      const matchesClass =
        selectedClass === "ALL" || student.classId === selectedClass;

      return matchesSearch && matchesClass;
    });
  }, [students, search, selectedClass]);

  const groupedStudents = useMemo(() => {
    const groups = new Map<
      string,
      {
        classId: string;
        className: string;
        grade: number;
        students: Student[];
      }
    >();

    for (const student of filteredStudents) {
      if (!groups.has(student.classId)) {
        groups.set(student.classId, {
          classId: student.classId,
          className: student.className,
          grade: student.grade,
          students: [],
        });
      }

      groups.get(student.classId)!.students.push(student);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (a.grade !== b.grade) {
        return a.grade - b.grade;
      }

      return a.className.localeCompare(b.className);
    });
  }, [filteredStudents]);

  function clearFilters() {
    setSearch("");
    setSelectedClass("ALL");
  }

  const hasFilters = search.trim() !== "" || selectedClass !== "ALL";

  return (
    <div className="space-y-5">
      {/* Search / filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={19}
              strokeWidth={2.2}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or class number..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-accent focus:bg-white focus:ring-2 focus:ring-brand-accent/20"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Class filter */}
          <div className="relative lg:w-72">
            <Filter
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-accent focus:bg-white focus:ring-2 focus:ring-brand-accent/20"
            >
              <option value="ALL">All assigned classes</option>

              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name} â€” Grade {schoolClass.grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-800">
              {filteredStudents.length}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-800">
              {students.length}
            </span>{" "}
            students
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-bold text-brand-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Users size={28} className="text-slate-400" />
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            No students assigned
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            You currently don't have any students through your assigned
            classes or subjects. Contact an administrator if this is
            incorrect.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Search size={28} className="text-slate-400" />
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            No students found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Try changing your search or class filter.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Classes */
        <div className="space-y-6">
          {groupedStudents.map((group) => (
            <section key={group.classId}>
              {/* Class heading */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-white">
                    <GraduationCap size={20} strokeWidth={2.3} />
                  </div>

                  <div>
                    <h2 className="font-black text-slate-900">
                      {group.className}
                    </h2>

                    <p className="text-xs font-semibold text-slate-500">
                      Grade {group.grade} Â· {group.students.length} student
                      {group.students.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Students */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {group.students.map((student) => (
                    <Link
                      key={student.id}
                      href={`/dashboard/teacher/students/${student.id}`}
                      className="group flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5"
                    >
                      {/* Avatar */}
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-brand-primary/10">{student.photoUrl ? (<img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />) : (<div className="flex h-full w-full items-center justify-center font-black text-brand-primary">{student.fullName.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]?.toUpperCase()).join("")}</div>)}</div>

                      {/* Main info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-bold text-slate-900">
                            {student.fullName}
                          </p>

                          {student.isClassTeacher && (
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-green-700">
                              Class teacher
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Class No.{" "}
                            <span className="font-semibold text-slate-700">
                              {student.classNo}
                            </span>
                          </span>

                          {student.subjects.length > 0 && (
                            <span className="hidden items-center gap-1 sm:flex">
                              <BookOpen size={13} />
                              {student.subjects.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Parent count */}
                      <div className="hidden text-right sm:block">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Parent
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-600">
                          {student.parents.length > 0
                            ? `${student.parents.length} linked`
                            : "Not linked"}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-brand-primary group-hover:text-white">
                        <ChevronRight size={18} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}



