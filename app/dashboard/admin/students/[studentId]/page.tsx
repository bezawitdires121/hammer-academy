import { formatEthiopianDisplay } from "@/lib/ethiopian-calendar";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { addParentContact, removeParentContact, updateEnrollmentStatus } from "./actions";
import TransferSectionForm from "./TransferSectionForm";

type Props = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function StudentProfilePage({ params }: Props) {
  const { studentId } = await params;

  const [student, allSections, allSchoolYears] = await Promise.all([
  prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parentContacts: true,
      enrollments: {
        include: {
          schoolYear: true,
          section: { include: { grade: true } },
        },
        orderBy: { createdAt: "desc" },
      },

      attendanceRecords: { orderBy: { date: "desc" }, take: 10 },
      resultCards: {
        include: { exam: { include: { semester: true } }, results: { include: { subject: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      homeworkAssessments: {
        include: { homework: { include: { subject: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      teacherMessages: { orderBy: { createdAt: "desc" }, take: 5 },
      adminMessages: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  }),
  prisma.section.findMany({
    include: { grade: true, schoolYear: true },
    orderBy: [{ grade: { level: "asc" } }, { label: "asc" }],
  }),
  prisma.schoolYear.findMany({ orderBy: { startDate: "desc" } }),
]);

  if (!student) {
    notFound();
  }

  const currentEnrollment =
    student.enrollments.find(
      (enrollment) => enrollment.schoolYear.isCurrent
    ) ?? student.enrollments[0];

  const present = student.attendanceRecords.filter(
    (record) => record.status === "PRESENT"
  ).length;

  const absent = student.attendanceRecords.filter(
    (record) => record.status === "ABSENT"
  ).length;

  const late = student.attendanceRecords.filter(
    (record) => record.status === "LATE"
  ).length;

  const totalAttendance = student.attendanceRecords.length;

  const attendanceRate =
    totalAttendance > 0
      ? Math.round((present / totalAttendance) * 100)
      : 0;

  const totalResults = student.resultCards.reduce(
    (total, card) => total + card.results.length,
    0
  );

  const averageMarks =
    totalResults > 0
      ? Math.round(
          student.resultCards.reduce(
            (total, card) =>
              total +
              card.results.reduce(
                (sum, result) =>
                  sum + (result.marksObtained / result.maxMarks) * 100,
                0
              ),
            0
          ) / totalResults
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/admin/students"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#0f2a47]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </Link>

      {/* Profile header */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-28 bg-[#0f2a47]" />

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gray-100 text-3xl font-bold text-[#0f2a47] shadow-sm">
                {student.fullName.charAt(0).toUpperCase()}
              </div>
            )}
<Link
  href={`/dashboard/admin/students/${student.id}/leave-letter`}
  className="inline-flex items-center gap-2 rounded-lg bg-[#0f2a47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0b2037]"
>
  📄 Leave Letter
</Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {student.fullName}
              </h1>

              <p className="mt-1 font-mono text-sm text-gray-500">
                {student.studentLoginId}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {currentEnrollment ? (
                  <>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      Grade {currentEnrollment.section.grade.level}
                    </span>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      Section {currentEnrollment.section.label}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {currentEnrollment.schoolYear.label}
                    </span>
                  </>
                ) : (
                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                    No current enrollment
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Attendance"
          value={`${attendanceRate}%`}
          detail={`${present} present • ${absent} absent`}
        />

        <SummaryCard
          icon={<GraduationCap className="h-5 w-5" />}
          label="Average Results"
          value={`${averageMarks}%`}
          detail={`${totalResults} subject results`}
        />

        <SummaryCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Homework"
          value={String(student.homeworkAssessments.length)}
          detail="Recent assessments"
        />

        <SummaryCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Result Cards"
          value={String(student.resultCards.length)}
          detail="Recent exam records"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Student information */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle title="Student Information" />

            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <InfoItem
                label="Full Name"
                value={student.fullName}
              />

              <InfoItem
                label="Student ID"
                value={student.studentLoginId}
              />

              <InfoItem
                label="Grade"
                value={
                  currentEnrollment
                    ? `Grade ${currentEnrollment.section.grade.level}`
                    : "Not assigned"
                }
              />

              <InfoItem
                label="Section"
                value={
                  currentEnrollment
                    ? currentEnrollment.section.label
                    : "Not assigned"
                }
              />

              <InfoItem
                label="School Year"
                value={
                  currentEnrollment?.schoolYear.label ?? "Not assigned"
                }
              />

              <InfoItem
                label="Registered"
                value={formatEthiopianDisplay(student.createdAt)}
              />
            </div>
          </section>

          {/* Academic results */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle
              title="Academic Results"
              subtitle="Recent result cards and subject marks"
            />

            <div className="divide-y divide-gray-100">
              {student.resultCards.length === 0 ? (
                <EmptyState text="No results have been recorded yet." />
              ) : (
                student.resultCards.map((card) => (
                  <div key={card.id} className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {card.exam.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {card.exam.semester.name}
                        </p>
                      </div>

                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {card.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {card.results.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                        >
                          <span className="text-sm text-gray-700">
                            {result.subject.name}
                          </span>

                          <span className="text-sm font-semibold text-gray-900">
                            {result.marksObtained}/{result.maxMarks}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Attendance */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle
              title="Recent Attendance"
              subtitle="Latest attendance records"
            />

            <div className="divide-y divide-gray-100">
              {student.attendanceRecords.length === 0 ? (
                <EmptyState text="No attendance records have been recorded yet." />
              ) : (
                student.attendanceRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatEthiopianDisplay(record.date)}
                      </p>

                      {record.reason && (
                        <p className="mt-1 text-xs text-gray-500">
                          {record.reason}
                        </p>
                      )}
                    </div>

                    <AttendanceBadge status={record.status} />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Academic history */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle
              title="Academic History"
              subtitle="Student enrollment history"
            />

            <div className="divide-y divide-gray-100">
              {student.enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Grade {enrollment.section.grade.level} • Section{" "}
                      {enrollment.section.label}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {enrollment.schoolYear.label}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    {enrollment.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Guardian */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle title="Guardian" subtitle="Parent or guardian contacts" />
            <div className="space-y-4 p-6">
              {student.parentContacts.length === 0 ? (
                <p className="text-sm text-gray-500">No guardian information has been added.</p>
              ) : (
                student.parentContacts.map((guardian) => (
                  <div key={guardian.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f2a47]/10">
                          <UserRound className="h-4 w-4 text-[#0f2a47]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{guardian.fullName || "Guardian"}</p>
                          <p className="text-xs text-gray-500">{guardian.relationship}</p>
                        </div>
                      </div>
                      <RemoveContactForm studentId={student.id} contactId={guardian.id} />
                    </div>
                    {guardian.phone && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />{guardian.phone}
                      </div>
                    )}
                    {guardian.email && (
                      <div className="mt-2 flex items-center gap-2 break-all text-sm text-gray-600">
                        <Mail className="h-4 w-4 shrink-0" />{guardian.email}
                      </div>
                    )}
                  </div>
                ))
              )}
              {/* Add contact form */}
              <AddContactForm studentId={student.id} />
            </div>
          </section>

          {/* Transfer section */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle title="Transfer / Enroll" subtitle="Move student to a different section" />
            <TransferSectionForm
              studentId={student.id}
              sections={allSections}
              schoolYears={allSchoolYears}
            />
          </section>

          {/* Messages */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle
              title="Recent Communication"
              subtitle="Teacher and admin messages"
            />

            <div className="space-y-3 p-6">
              {student.teacherMessages.length === 0 &&
              student.adminMessages.length === 0 ? (
                <EmptyState text="No recent messages." />
              ) : (
                <>
                  {student.teacherMessages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-lg bg-blue-50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />

                        <span className="text-xs font-semibold text-blue-700">
                          Teacher
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-700">
                        {message.message}
                      </p>
                    </div>
                  ))}

                  {student.adminMessages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-lg bg-green-50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />

                        <span className="text-xs font-semibold text-green-700">
                          Administration
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-700">
                        {message.message}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Homework */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionTitle
              title="Homework"
              subtitle="Recent homework assessments"
            />

            <div className="divide-y divide-gray-100">
              {student.homeworkAssessments.length === 0 ? (
                <EmptyState text="No homework assessments yet." />
              ) : (
                student.homeworkAssessments.map((assessment) => (
                  <div key={assessment.id} className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {assessment.homework.title}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {assessment.homework.subject.name}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {assessment.level}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2a47]/10 text-[#0f2a47]">
          {icon}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>

          <p className="mt-0.5 text-xs text-gray-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-gray-100 px-6 py-5">
      <h2 className="font-semibold text-gray-900">{title}</h2>

      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-6 py-8 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function AttendanceBadge({ status }: { status: string }) {
  const styles =
    status === "PRESENT"
      ? "bg-green-50 text-green-700"
      : status === "ABSENT"
        ? "bg-red-50 text-red-700"
        : "bg-yellow-50 text-yellow-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function RemoveContactForm({ studentId, contactId }: { studentId: string; contactId: string }) {
  async function handle() {
    "use server";
    await removeParentContact(studentId, contactId);
  }
  return (
    <form action={handle}>
      <button type="submit" className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
    </form>
  );
}

function AddContactForm({ studentId }: { studentId: string }) {
  async function handle(fd: FormData) {
    "use server";
    await addParentContact(studentId, fd);
  }
  return (
    <form action={handle} className="mt-2 space-y-2 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-500">Add guardian</p>
      <input name="fullName" placeholder="Full name *" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f2a47]" />
      <input name="relationship" placeholder="Relationship (e.g. Mother) *" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f2a47]" />
      <input name="phone" placeholder="Phone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f2a47]" />
      <input name="email" placeholder="Email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#0f2a47]" />
      <button type="submit" className="rounded-lg bg-[#0f2a47] px-4 py-2 text-sm font-semibold text-white">Add guardian</button>
    </form>
  );
}







