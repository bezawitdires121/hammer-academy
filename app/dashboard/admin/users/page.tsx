import { prisma } from "@/lib/prisma";
import TeacherForm from "./TeacherForm";
import ParentForm from "./ParentForm";
import ClassForm from "./ClassForm";
import StudentForm from "./StudentForm";
import ClassTeacherRow from "./ClassTeacherRow";
import StudentRow from "./StudentRow";
import ActiveToggle from "./ActiveToggle";
import SubjectTeacherGrid from "./SubjectTeacherGrid";

type TeacherRecord = { id: string; fullName: string; user: { id: string; email: string; isActive: boolean } };
type ParentRecord = { id: string; fullName: string; user: { id: string; email: string; isActive: boolean } };
type ClassRecord = { id: string; name: string; grade: number; teacherId: string | null };
type StudentRecord = { id: string; fullName: string; admissionNo: string; classId: string; createdAt: Date };

export default async function AdminUsersPage() {
  const [teachersResult, parentsResult, classesResult, studentsResult] = await Promise.all([
    prisma.teacher.findMany({ include: { user: true } }),
    prisma.parent.findMany({ include: { user: true } }),
    prisma.class.findMany(),
    prisma.student.findMany(),
  ]);

  const teachers = teachersResult as TeacherRecord[];
  const parents = parentsResult as ParentRecord[];
  const classes = classesResult as ClassRecord[];
  const students = studentsResult as StudentRecord[];

  const teacherOptions = teachers.map((t: TeacherRecord) => ({ id: t.id, fullName: t.fullName }));
  const parentOptions = parents.map((p: ParentRecord) => ({ id: p.id, fullName: p.fullName }));
  const classOptions = classes.map((c: ClassRecord) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Add Teacher</h2>
        <TeacherForm />
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          {teachers.map((t) => (
            <li key={t.id} className="flex items-center justify-between">
              <span>{t.fullName} — {t.user.email}</span>
              <ActiveToggle userId={t.user.id} isActive={t.user.isActive} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Add Parent</h2>
        <ParentForm />
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          {parents.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>{p.fullName} — {p.user.email}</span>
              <ActiveToggle userId={p.user.id} isActive={p.user.isActive} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Add Class</h2>
        <ClassForm teachers={teacherOptions} />
        <div className="mt-4 space-y-2">
          {classes.map((c) => (
            <ClassTeacherRow
              key={c.id}
              classId={c.id}
              className={c.name}
              grade={c.grade}
              currentTeacherId={c.teacherId}
              teachers={teacherOptions}
            />
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Enroll Student</h2>
        <StudentForm classes={classOptions} parents={parentOptions} />
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          {students.map((s) => (
            <StudentRow key={s.id} student={s} classes={classOptions} />
          ))}
        </ul>
      </section>
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 font-medium text-gray-900">Subject Teacher Assignments</h2>
        <SubjectTeacherGrid
          classes={classOptions}
          subjects={await prisma.subject.findMany().then((subs) =>
            subs.map((s) => ({ id: s.id, name: s.name }))
          )}
          teachers={teacherOptions}
          assignments={await prisma.classSubjectTeacher.findMany().then((rows) =>
            rows.map((r) => ({ classId: r.classId, subjectId: r.subjectId, teacherId: r.teacherId }))
          )}
        />
      </section>
    </div>
  );
}