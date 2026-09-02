"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Megaphone,
  Send,
  TriangleAlert,
} from "lucide-react";
import { createAnnouncement, getAnnouncementAudienceOptions } from "./actions";

type FormState = {
  error: string | undefined;
  success: boolean;
};

type AnnouncementFormProps = {
  role: "ADMIN" | "TEACHER";
  classes: { id: string; name: string }[];
  schoolYears: {
    id: string;
    label: string;
    isCurrent: boolean;
    semesters: {
      id: string;
      name: string;
      number: number;
    }[];
  }[];
  selectedSchoolYearId: string;
  selectedSemesterId: string;
  semesterIsLocked: boolean;
};

const initialState: FormState = {
  error: undefined,
  success: false,
};


const employeeRoles = [
  { value: "LIBRARIAN", label: "Librarian" },
  { value: "HEALTH", label: "Health" },
  { value: "SECRETARY", label: "Secretary" },
  { value: "SECURITY", label: "Security" },
  { value: "CLEANER", label: "Cleaner" },
  { value: "OTHER", label: "Other" },
];

export default function AnnouncementForm({
  role,
  classes,
  schoolYears,
  selectedSchoolYearId,
  selectedSemesterId,
  semesterIsLocked,
}: AnnouncementFormProps) {
  const isTeacher = role === "TEACHER";

  const [audience, setAudience] = useState("ALL");
  const [teacherTarget, setTeacherTarget] = useState("");
  const [employeeTarget, setEmployeeTarget] = useState("");
  const [studentTarget, setStudentTarget] = useState("");
  const [teacherSubjectTarget, setTeacherSubjectTarget] = useState("ALL");
  const [teacherGradeTarget, setTeacherGradeTarget] = useState("");
  const [studentGradeTarget, setStudentGradeTarget] = useState("");
  const [studentGradeFrom, setStudentGradeFrom] = useState("");
  const [studentGradeTo, setStudentGradeTo] = useState("");

  const [dbSubjects, setDbSubjects] = useState<
    { id: string; name: string }[]
  >([]);

  const [dbGrades, setDbGrades] = useState<
    { id: string; level: number }[]
  >([]);

  const [dbSections, setDbSections] = useState<{ id: string; label: string; gradeId: string; grade: { level: number } }[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAudienceOptions() {
      const result =
        await getAnnouncementAudienceOptions(selectedSchoolYearId);

      if (!cancelled) {
        setDbSubjects(result.subjects);
        setDbGrades(result.grades);
        setDbSections(result.sections);
      }
    }

    loadAudienceOptions();

  return () => {
      cancelled = true;
    };
  }, [selectedSchoolYearId]);

  const [scope, setScope] = useState(
    isTeacher ? "SECTION" : "SCHOOL_WIDE"
  );

  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      const result = await createAnnouncement(formData);

      return {
        error: result?.error,
        success: !!result?.success,
      };
    },
    initialState
  );

const gradeOptions = dbGrades.map((grade) => ({
    value: String(grade.level),
    label: grade.level === 0 ? "KG" : `Grade ${grade.level}`,
  }));
  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="schoolYearId"
        value={selectedSchoolYearId}
      />

      <input
        type="hidden"
        name="semesterId"
        value={selectedSemesterId}
      />

      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>Announcement posted successfully.</p>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="announcement-title"
          className="text-sm font-semibold text-slate-800"
        >
          Title
        </label>

        <input
          id="announcement-title"
          name="title"
          placeholder="Enter announcement title"
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="announcement-body"
          className="text-sm font-semibold text-slate-800"
        >
          Message
        </label>

        <textarea
          id="announcement-body"
          name="body"
          placeholder="Write your announcement..."
          required
          rows={5}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Megaphone className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Audience
            </p>

            <p className="text-xs text-slate-500">
              {isTeacher
                ? "Choose one of your assigned sections."
                : "Choose exactly who should receive this announcement."}
            </p>
          </div>
        </div>

        {isTeacher ? (
          <>
            <input
              type="hidden"
              name="scope"
              value="SECTION"
            />

            <input
              type="hidden"
              name="audience"
              value="TEACHER_SECTION"
            />

            <div className="relative">
              <select
                name="classId"
                required
                defaultValue=""
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="" disabled>
                  Select assigned section
                </option>

                {dbSections.map((section) => (
                  <option key={section.id} value={section.id}>{"Grade " + section.grade.level + " " + section.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <input
              type="hidden"
              name="scope"
              value={
                audience === "STUDENTS"
                  ? studentTarget === "SECTION"
                    ? "SECTION"
                    : studentTarget === "GRADE" ||
                        studentTarget === "GRADE_RANGE"
                      ? "GRADE"
                      : "SCHOOL_WIDE"
                  : audience === "ALL"
                    ? "SCHOOL_WIDE"
                    : "SCHOOL_WIDE"
              }
            />

            <input
              type="hidden"
              name="audience"
              value={audience}
            />

            <input
              type="hidden"
              name="teacherTarget"
              value={teacherTarget}
            />

            <input
              type="hidden"
              name="employeeTarget"
              value={employeeTarget}
            />

            <input
              type="hidden"
              name="studentTarget"
              value={studentTarget}
            />

            <input
              type="hidden"
              name="teacherSubjectTarget"
              value={teacherSubjectTarget}
            />

            <input
              type="hidden"
              name="teacherGradeTarget"
              value={teacherGradeTarget}
            />

            <input
              type="hidden"
              name="studentGradeTarget"
              value={studentGradeTarget}
            />

            <input
              type="hidden"
              name="studentGradeFrom"
              value={studentGradeFrom}
            />

            <input
              type="hidden"
              name="studentGradeTo"
              value={studentGradeTo}
            />

            <div className="relative">
              <select
                value={audience}
                onChange={(event) => {
                  setAudience(event.target.value);
                  setTeacherTarget("");
                  setEmployeeTarget("");
                  setStudentTarget("");
                  setTeacherSubjectTarget("ALL");
                  setTeacherGradeTarget("");
                  setStudentGradeTarget("");
                  setStudentGradeFrom("");
                  setStudentGradeTo("");
                }}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="ALL">All</option>
                <option value="TEACHERS">Teachers</option>
                <option value="EMPLOYEES">Other Employees</option>
                <option value="STUDENTS">Students</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {audience === "TEACHERS" && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative">
                  <select
                    value={teacherTarget}
                    onChange={(event) => {
                      setTeacherTarget(event.target.value);
                      setTeacherSubjectTarget("ALL");
                      setTeacherGradeTarget("");
                    }}
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="" disabled>
                      Select teacher group
                    </option>

                    <option value="ALL">
                      All Teachers
                    </option>

                    <option value="SUBJECT">
                      Subject Teachers
                    </option>

                    <option value="HOMEROOM">
                      Homeroom Teachers
                    </option>
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {teacherTarget === "SUBJECT" && (
                  <div className="relative">
                    <select
                      value={teacherSubjectTarget}
                      onChange={(event) =>
                        setTeacherSubjectTarget(event.target.value)
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="ALL">
                        All Subjects
                      </option>

                      {dbSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}

                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}

                {teacherTarget === "HOMEROOM" && (
                  <div className="relative">
                    <select
                      value={teacherGradeTarget}
                      onChange={(event) =>
                        setTeacherGradeTarget(event.target.value)
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">
                        All Homeroom Teachers
                      </option>

                      {gradeOptions.map((grade) => (
                        <option
                          key={grade.value}
                          value={grade.value}
                        >
                          {grade.label} Homeroom Teachers
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}
              </div>
            )}

            {audience === "EMPLOYEES" && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative">
                  <select
                    value={employeeTarget}
                    onChange={(event) =>
                      setEmployeeTarget(event.target.value)
                    }
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="" disabled>
                      Select employee group
                    </option>

                    <option value="ALL">
                      All Employees
                    </option>

                    {employeeRoles.map((employee) => (
                      <option
                        key={employee.value}
                        value={employee.value}
                      >
                        {employee.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}

            {audience === "STUDENTS" && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative">
                  <select
                    value={studentTarget}
                    onChange={(event) => {
                      setStudentTarget(event.target.value);
                      setStudentGradeTarget("");
                      setStudentGradeFrom("");
                      setStudentGradeTo("");
                    }}
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    <option value="" disabled>
                      Select student group
                    </option>

                    <option value="ALL">
                      All Students
                    </option>

                    <option value="GRADE">
                      Specific Grade
                    </option>

                    <option value="SECTION">
                      Specific Section
                    </option>

                    <option value="GRADE_RANGE">
                      Grade Range
                    </option>
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {studentTarget === "GRADE" && (
                  <div className="relative">
                    <select
                      value={studentGradeTarget}
                      onChange={(event) =>
                        setStudentGradeTarget(event.target.value)
                      }
                      required
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="" disabled>
                        Select grade
                      </option>

                      {gradeOptions.map((grade) => (
                        <option
                          key={grade.value}
                          value={grade.value}
                        >
                          {grade.label}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}

                {studentTarget === "SECTION" && (
                  <div className="relative">
                    <select
                      name="classId"
                      required
                      defaultValue=""
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="" disabled>
                        Select section
                      </option>

                      {dbSections.map((section) => (
                        <option key={section.id} value={section.id}>{section.grade.level === 0 ? "KG " + section.label : "Grade " + section.grade.level + " " + section.label}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}

                {studentTarget === "GRADE_RANGE" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="relative">
                      <select
                        value={studentGradeFrom}
                        onChange={(event) =>
                          setStudentGradeFrom(event.target.value)
                        }
                        required
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="" disabled>
                          From grade
                        </option>

                        {gradeOptions.map((grade) => (
                          <option
                            key={grade.value}
                            value={grade.value}
                          >
                            {grade.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    <div className="relative">
                      <select
                        value={studentGradeTo}
                        onChange={(event) =>
                          setStudentGradeTo(event.target.value)
                        }
                        required
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="" disabled>
                          To grade
                        </option>

                        {gradeOptions.map((grade) => (
                          <option
                            key={grade.value}
                            value={grade.value}
                          >
                            {grade.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {audience === "ALL" && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  Everyone
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The announcement will target all active users.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50">
        <input
          type="checkbox"
          name="priority"
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
        />

        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-500" />

          <div>
            <p className="text-sm font-medium text-slate-800">
              Mark as priority
            </p>

            <p className="text-xs text-slate-500">
              Use for urgent or important notices.
            </p>
          </div>
        </div>
      </label>

      <button
        type="submit"
        disabled={isPending || semesterIsLocked}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        <Send className="h-4 w-4" />

        {isPending
          ? "Posting announcement..."
          : "Post Announcement"}
      </button>
    </form>
  );
}




