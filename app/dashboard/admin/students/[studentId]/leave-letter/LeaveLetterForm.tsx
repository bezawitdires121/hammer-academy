"use client";

import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import { useState } from "react";

type Student = {
  fullName: string;
  studentLoginId: string;
  age: number | null;
  gender: string | null;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  grade: string;
  section: string;
  schoolYear: string;
};

type School = {
  schoolName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  stampUrl: string | null;
  directorName: string;
  directorSignatureUrl: string | null;
};

export default function LeaveLetterForm({
  student,
  school,
}: {
  student: Student;
  school: School;
}) {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [authorizedPerson, setAuthorizedPerson] = useState(
    student.guardianName
  );

  const formattedDate = date
    ? formatEthiopianDisplay(new Date(`${date}T00:00:00`))
    : "";

  const gender =
    student.gender === "MALE"
      ? "Male"
      : student.gender === "FEMALE"
        ? "Female"
        : "—";

  return (
    <>
      <div className="mx-auto mb-8 max-w-5xl px-4 print:hidden">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Leave Details
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Complete the details below, then print the official leave letter.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0f2a47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b2037]"
            >
              Print Leave Letter
            </button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Date of Leaving">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Leaving Time">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Reason / Purpose">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Family matter, medical appointment..."
                className="input"
              />
            </Field>

            <Field label="Destination">
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Optional"
                className="input"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Authorized Parent / Guardian">
                <input
                  value={authorizedPerson}
                  onChange={(e) => setAuthorizedPerson(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[210mm] px-4 pb-10 print:max-w-none print:px-0 print:pb-0">
        <div className="leave-paper relative min-h-[297mm] bg-white px-[18mm] py-[16mm] shadow-lg print:w-[210mm] print:shadow-none">

          {/* HEADER */}
          <header className="border-b-2 border-[#0f2a47] pb-5">
            <div className="flex items-center gap-5">
              {school.logoUrl ? (
                <img
                  src={school.logoUrl}
                  alt={school.schoolName}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center border-2 border-[#0f2a47] text-xs font-bold text-[#0f2a47]">
                  LOGO
                </div>
              )}

              <div>
                <h1 className="text-2xl font-extrabold uppercase tracking-wide text-[#0f2a47]">
                  {school.schoolName}
                </h1>

                <p className="mt-1 text-sm font-semibold text-gray-600">
                  QUALITY EDUCATION • DISCIPLINE • EXCELLENCE
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {[school.address, school.phone, school.email]
                    .filter(Boolean)
                    .join("  •  ")}
                </p>
              </div>
            </div>
          </header>

          {/* TITLE */}
          <div className="py-8 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-gray-500">
              OFFICIAL STUDENT LEAVE DOCUMENT
            </p>

            <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-wide text-[#0f2a47]">
              STUDENT LEAVE LETTER
            </h2>

            <div className="mx-auto mt-3 h-1 w-16 bg-[#0f2a47]" />
          </div>

          <div className="flex justify-end text-sm">
            <span className="font-semibold">Date:</span>&nbsp;
            {formattedDate}
          </div>

          {/* STUDENT INFORMATION */}
          <section className="mt-7 overflow-hidden border border-gray-300">
            <div className="bg-[#0f2a47] px-4 py-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                Student Information
              </h3>
            </div>

            <div className="grid grid-cols-2">
              <Info label="Full Name" value={student.fullName} />
              <Info label="Student ID" value={student.studentLoginId} />
              <Info
                label="Age"
                value={
                  student.age !== null
                    ? String(student.age)
                    : "—"
                }
              />
              <Info label="Gender" value={gender} />
              <Info
                label="Grade"
                value={student.grade ? `Grade ${student.grade}` : "—"}
              />
              <Info label="Section" value={student.section || "—"} />
              <Info
                label="School Year"
                value={student.schoolYear || "—"}
              />
              <Info
                label="Parent / Guardian"
                value={student.guardianName || "—"}
              />
              <Info
                label="Relationship"
                value={student.guardianRelationship || "—"}
              />
              <Info
                label="Guardian Phone"
                value={student.guardianPhone || "—"}
              />
            </div>
          </section>

          {/* LETTER */}
          <section className="mt-8">
            <p className="text-[15px] leading-8 text-gray-800">
              This is to certify that{" "}
              <strong>{student.fullName}</strong>, Student ID{" "}
              <strong>{student.studentLoginId}</strong>, a student of{" "}
              <strong>
                {student.grade
                  ? `Grade ${student.grade}`
                  : "the school"}
                {student.section
                  ? `, Section ${student.section}`
                  : ""}
              </strong>
              , is hereby permitted to leave the school premises on{" "}
              <strong>{formattedDate}</strong>
              {time && (
                <>
                  {" "}at <strong>{time}</strong>
                </>
              )}
              .
            </p>

            <p className="mt-5 text-[15px] leading-8 text-gray-800">
              The purpose of leaving the school is:
            </p>

            <div className="mt-2 min-h-[55px] border-b border-gray-400 py-2 text-[15px] font-semibold">
              {reason || "____________________________________________"}
            </div>

            {destination && (
              <p className="mt-5 text-[15px] leading-8">
                <strong>Destination:</strong> {destination}
              </p>
            )}

            <p className="mt-6 text-[15px] leading-8 text-gray-800">
              The student is authorized to leave the school premises
              under the supervision or authorization of the parent or
              guardian indicated above. This letter serves as official
              permission from the school administration.
            </p>

            <p className="mt-6 text-[15px] leading-8">
              <strong>Authorized Parent / Guardian:</strong>{" "}
              {authorizedPerson || "____________________________"}
            </p>
          </section>

          {/* OFFICIAL NOTICE */}
          <div className="mt-8 border-l-4 border-[#0f2a47] bg-gray-50 px-5 py-4">
            <p className="text-sm leading-6 text-gray-700">
              This document is an official school permission letter
              issued by the administration and may be presented to
              school personnel or security when required.
            </p>
          </div>

          {/* SIGNATURES */}
          <section className="mt-14 grid grid-cols-2 gap-12">
            <div>
              <div className="relative h-24 border-b border-gray-500">
                {school.directorSignatureUrl && (
                  <img
                    src={school.directorSignatureUrl}
                    alt="Director signature"
                    className="absolute bottom-1 left-4 h-20 max-w-[180px] object-contain"
                  />
                )}
              </div>

              <p className="mt-2 text-center text-sm font-semibold">
                Administrator / Director
              </p>

              {school.directorName && (
                <p className="mt-1 text-center text-xs text-gray-500">
                  {school.directorName}
                </p>
              )}
            </div>

            <div>
              <div className="relative flex h-24 items-center justify-center border-b border-gray-500">
                {school.stampUrl && (
                  <img
                    src={school.stampUrl}
                    alt="School stamp"
                    className="h-24 w-24 object-contain opacity-90"
                  />
                )}
              </div>

              <p className="mt-2 text-center text-sm font-semibold">
                Official School Stamp
              </p>
            </div>
          </section>

          <footer className="absolute bottom-[10mm] left-[18mm] right-[18mm] border-t border-gray-200 pt-3">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{school.schoolName}</span>
              <span>Official Student Leave Letter</span>
            </div>
          </footer>
        </div>
      </main>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: #0f2a47;
          box-shadow: 0 0 0 1px #0f2a47;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .leave-paper {
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-r border-gray-200 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-800">
        {value}
      </p>
    </div>
  );
}




