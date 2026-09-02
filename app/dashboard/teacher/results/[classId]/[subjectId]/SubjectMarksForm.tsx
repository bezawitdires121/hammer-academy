"use client";

import { useMemo, useState } from "react";
import {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  submitSubjectMarks,
  submitSemesterSubjectResult,
} from "./actions";

type Student = {
  id: string;
  fullName: string;
  photoUrl: string | null;
};

type Semester = {
  id: string;
  name: string;
};

type Exam = {
  id: string;
  name: string;
  semesterId: string;
  maxMarks: number;
};

type ExistingResult = {
  studentId: string;
  examId: string;
  marksObtained: number;
  maxMarks: number;
  isLocked: boolean;
};

  export default function SubjectMarksForm({
  classId,
  subjectId,
  initialSemesterId,
  semesters,
  students,
  exams,
  existingResults,
  isLocked = false,
}: {
  classId: string;
  subjectId: string;
  initialSemesterId: string;



    isLocked?: boolean;
semesters: Semester[];
  students: Student[];
  exams: Exam[];
  existingResults: ExistingResult[];
}) {
 const [semesterId, setSemesterId] =
  useState(initialSemesterId);
  const [examId, setExamId] = useState("");
  const [search, setSearch] = useState("");

  const [marks, setMarks] = useState<
    Record<string, Record<string, string>>
  >(() => {
    const result: Record<string, Record<string, string>> = {};

    for (const student of students) {
      result[student.id] = {};

      for (const exam of exams) {
        const existing = existingResults.find(
          (item) =>
            item.studentId === student.id &&
            item.examId === exam.id
        );

        result[student.id][exam.id] =
          existing ? String(existing.marksObtained) : "";
      }
    }

    return result;
  });

  const [name, setName] = useState("");
  const [maxMarks, setMaxMarks] = useState("");

  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const DEFAULT_ASSESSMENTS = [
    { name: "First Quiz", maxMarks: 10 },
    { name: "Second Quiz", maxMarks: 10 },
    { name: "Midterm", maxMarks: 30 },
    { name: "Final", maxMarks: 50 },
  ];

  async function createDefaultAssessments() {
    clearMessages();

    if (!semesterId) {
      setError("Select a semester first.");
      return;
    }

    if (semesterExams.length > 0) {
      setError(
        "This semester already has assessments. Edit or add assessments instead."
      );
      return;
    }

    setPending(true);

    try {
      for (const preset of DEFAULT_ASSESSMENTS) {
        const formData = new FormData();

        formData.set(
          "payload",
          JSON.stringify({
            classId,
            subjectId,
            semesterId,
            name: preset.name,
            maxMarks: preset.maxMarks,
          })
        );

        const result = await createAssessment(formData);

        if ("error" in result) {
          setError(result.error ?? "Operation failed.");
          return;
        }
      }

      setSuccess(
        "Default assessment setup created: 10 + 10 + 30 + 50 = 100."
      );

      window.location.reload();
    } catch {
      setError(
        "Something went wrong while creating the default assessments."
      );
    } finally {
      setPending(false);
    }
  }

  const semesterExams = useMemo(
    () =>
      exams.filter(
        (exam) => exam.semesterId === semesterId
      ),
    [exams, semesterId]
  );

  const selectedExam = semesterExams.find(
    (exam) => exam.id === examId
  );

  const semesterMaximum = semesterExams.reduce(
    (sum, exam) => sum + Number(exam.maxMarks),
    0
  );

  const semesterIsComplete = semesterMaximum === 100;
  const semesterIsOverLimit = semesterMaximum > 100;
  const semesterIsIncomplete = semesterMaximum > 0 && semesterMaximum < 100;

  const filteredStudents = students.filter((student) =>
    student.fullName
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetAssessmentForm() {
    setName("");
    setMaxMarks("");
    setEditingExamId(null);
  }

  function editExam(exam: Exam) {
    setEditingExamId(exam.id);
    setName(exam.name);
    setMaxMarks(String(exam.maxMarks));

    setExamId(exam.id);
    clearMessages();
  }

  async function saveAssessment() {
    clearMessages();

    if (!semesterId) {
      setError("Select a semester first.");
      return;
    }

    if (!name.trim()) {
      setError("Enter an assessment name.");
      return;
    }

    const maximum = Number(maxMarks);

    if (
      !Number.isFinite(maximum) ||
      maximum <= 0 ||
      maximum > 100
    ) {
      setError(
        "Assessment maximum must be greater than 0 and cannot exceed 100."
      );
      return;
    }

    const proposedTotal =
      semesterExams.reduce((sum, exam) => {
        if (editingExamId && exam.id === editingExamId) {
          return sum;
        }

        return sum + Number(exam.maxMarks);
      }, 0) + maximum;

    if (proposedTotal > 100) {
      setError(
        `Cannot save "${name.trim()}". The semester assessment maximum would be ${proposedTotal}/100. Reduce this assessment or another assessment first.`
      );
      return;
    }

    setPending(true);

    try {
      const payload = {
        classId,
        subjectId,
        semesterId,
        name: name.trim(),
        maxMarks: maximum,
        ...(editingExamId
          ? { examId: editingExamId }
          : {}),
      };

      const formData = new FormData();

      formData.set(
        "payload",
        JSON.stringify(payload)
      );

      const result = editingExamId
        ? await updateAssessment(formData)
        : await createAssessment(formData);

      if ("error" in result) {
        setError(result.error ?? "Operation failed.");
        return;
      }

      setSuccess(
        editingExamId
          ? "Assessment updated successfully."
          : "Assessment created successfully."
      );

      resetAssessmentForm();

      /*
       * Server action revalidation updates the page.
       */
      window.location.reload();
    } catch {
      setError(
        "Something went wrong while saving the assessment."
      );
    } finally {
      setPending(false);
    }
  }

  async function removeExam(exam: Exam) {
    if (
      !window.confirm(
        `Delete "${exam.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    clearMessages();
    setPending(true);

    try {
      const formData = new FormData();

      formData.set(
        "payload",
        JSON.stringify({
          classId,
          subjectId,
          examId: exam.id,
        })
      );

      const result =
        await deleteAssessment(formData);

      if ("error" in result) {
        setError(result.error ?? "Operation failed.");
        return;
      }

      if (examId === exam.id) {
        setExamId("");
      }

      setSuccess("Assessment deleted successfully.");
      window.location.reload();
    } catch {
      setError(
        "Something went wrong while deleting the assessment."
      );
    } finally {
      setPending(false);
    }
  }

  function updateMark(
    studentId: string,
    value: string
  ) {
    if (!selectedExam) return;

    setMarks((previous) => ({
      ...previous,
      [studentId]: {
        ...(previous[studentId] ?? {}),
        [selectedExam.id]: value,
      },
    }));

    clearMessages();
  }

  function getStudentTotal(studentId: string) {
    const values = semesterExams.map((exam) => {
      const value =
        marks[studentId]?.[exam.id];

      if (
        value === undefined ||
        value === ""
      ) {
        return null;
      }

      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : null;
    });

    if (
      values.length === 0 ||
      values.some((value) => value === null)
    ) {
      return null;
    }

    return values.reduce(
      (sum: number, value) => sum + (value ?? 0),
      0
    );
  }

  async function saveMarks() {
    clearMessages();

    if (!semesterId) {
      setError("Select a semester.");
      return;
    }

    if (!selectedExam) {
      setError("Select an assessment.");
      return;
    }

    const entries = students
      .map((student) => {
        const value =
          marks[student.id]?.[selectedExam.id];

        if (
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        return {
          studentId: student.id,
          marksObtained: Number(value),
          maxMarks: Number(selectedExam.maxMarks),
        };
      })
      .filter(
        (
          value
        ): value is {
          studentId: string;
          marksObtained: number;
          maxMarks: number;
        } => value !== null
      );

    if (entries.length === 0) {
      setError(
        "Enter marks for at least one student."
      );
      return;
    }

    for (const entry of entries) {
      if (
        !Number.isFinite(entry.marksObtained) ||
        entry.marksObtained < 0
      ) {
        setError("Marks must be valid and cannot be negative.");
        return;
      }

      if (
        entry.marksObtained >
        entry.maxMarks
      ) {
        const student = students.find(
          (item) =>
            item.id === entry.studentId
        );

        setError(
          `${student?.fullName ?? "Student"} cannot have more than ${entry.maxMarks} marks.`
        );

        return;
      }
    }

    setPending(true);

    try {
      const formData = new FormData();

      formData.set(
        "payload",
        JSON.stringify({
          classId,
          subjectId,
          semesterId,
          examId: selectedExam.id,
          entries,
        })
      );

      const result =
        await submitSubjectMarks(formData);

      if ("error" in result) {
        setError(result.error ?? "Operation failed.");
          if (
            result.error ===
            "This semester is locked. Results cannot be changed."
          ) {
            window.setTimeout(() => {
              window.location.reload();
            }, 700);
          }

        return;
      }

      setSuccess(
        "Marks saved successfully."
      );
    } catch {
      setError(
        "Something went wrong while saving marks."
      );
    } finally {
      setPending(false);
    }
  }

  async function submitSemesterResult() {
    clearMessages();

    if (!semesterId) {
      setError("Select a semester.");
      return;
    }

    if (semesterExams.length === 0) {
      setError("There are no assessments configured for this semester.");
      return;
    }

    const confirmed = window.confirm(
      `Submit the ${semesterExams.length} assessment(s) for this subject and semester to the homeroom teacher?`
    );

    if (!confirmed) {
      return;
    }

    setPending(true);

    try {
      const formData = new FormData();

      formData.set(
        "payload",
        JSON.stringify({
          classId,
          subjectId,
          semesterId,
        })
      );

      const result =
        await submitSemesterSubjectResult(formData);

      if ("error" in result) {
        setError(result.error ?? "Operation failed.");
        return;
      }

      setSuccess(
        "Semester subject result submitted to the homeroom teacher successfully."
      );
    } catch {
      setError(
        "Something went wrong while submitting the semester result."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Semester */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Semester
        </label>

        <select
          value={semesterId}
          onChange={(e) => {
            setSemesterId(e.target.value);
            setExamId("");
            resetAssessmentForm();
            clearMessages();
          }}
          className="mt-2 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        >
          <option value="">
            Select semester
          </option>

          {semesters.map((semester) => (
            <option
              key={semester.id}
              value={semester.id}
            >
              {semester.name}
            </option>
          ))}
        </select>
      </section>

      {semesterId && (
        <>
          {/* Assessment manager */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Assessments
                </h2>

                <p className="text-sm text-slate-500">
                  Total maximum:{" "}
                  <strong
                    className={
                      semesterMaximum > 100
                        ? "text-red-600"
                        : "text-slate-700"
                    }
                  >
                    {semesterMaximum}/100
                  </strong>
                </p>
              </div>

              {semesterIsOverLimit && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  Cannot save an assessment while the semester total is above 100.
                  Reduce one or more assessment maximums first.
                </div>
              )}

              {semesterIsIncomplete && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  Assessment total is below 100. You can save this configuration,
                  but add or increase an assessment until the total reaches 100.
                </div>
              )}

              {semesterIsComplete && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Assessment configuration is complete: 100/100.
                </div>
              )}
            </div>

            {semesterExams.length > 0 && (
              <div className="mt-4 space-y-2">
                {semesterExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => setExamId(exam.id)}
                      className="text-left"
                    >
                      <div className="font-bold text-slate-900">
                        {exam.name}
                      </div>

                      <div className="text-xs text-slate-500">
                        {exam.maxMarks} marks
                        {" · "}
                      </div>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editExam(exam)}
                       
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => removeExam(exam)}
                        disabled={pending || isLocked}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {semesterExams.length === 0 && (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      Default 100-point setup
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      First Quiz 10 + Second Quiz 10 + Midterm 30 + Final 50 = 100
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={createDefaultAssessments}
                    disabled={pending || isLocked}
                    className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {pending ? "Creating..." : "Use default setup"}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="font-bold text-slate-900">
                {editingExamId
                  ? "Edit assessment"
                  : "Add assessment"}
              </h3>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Assessment name"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />

                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={maxMarks}
                  onChange={(e) =>
                    setMaxMarks(e.target.value)
                  }
                  placeholder="Maximum marks"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={saveAssessment}
                  disabled={pending || semesterIsOverLimit || isLocked}
                  className="rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {pending
                    ? "Saving..."
                    : editingExamId
                      ? "Save changes"
                      : "Add assessment"}
                </button>

                {editingExamId && (
                  <button
                    type="button"
                    onClick={resetAssessmentForm}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Messages */}
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Exam selection */}
          {semesterExams.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700">
                Examination
              </label>

              <select
                value={examId}
                onChange={(e) => {
                  setExamId(e.target.value);
                  clearMessages();
                }}
                className="mt-2 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">
                  Select examination
                </option>

                {semesterExams.map((exam) => (
                  <option
                    key={exam.id}
                    value={exam.id}
                  >
                    {exam.name} - {exam.maxMarks}
                  </option>
                ))}
              </select>

              {selectedExam && (
                <p className="mt-2 text-xs text-slate-500">
                  Maximum:{" "}
                  <strong>
                    {selectedExam.maxMarks}
                  </strong>{" "}
                  marks
                </p>
              )}

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search student..."
                className="mt-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              />
            </section>
          )}

          {/* Results */}
          {selectedExam && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-4 py-3">#</th>
                      <th className="min-w-[250px] px-4 py-3">
                        Student
                      </th>

                      {semesterExams.map((exam) => (
                        <th
                          key={exam.id}
                          className="min-w-[120px] px-4 py-3 text-center"
                        >
                          {exam.name}
                          <div className="text-xs font-normal text-slate-400">
                            / {exam.maxMarks}
                          </div>
                        </th>
                      ))}

                      <th className="px-4 py-3 text-center">
                        Total / 100
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (student, index) => {
                        const total =
                          getStudentTotal(student.id);

                        return (
                          <tr
                            key={student.id}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-4 py-3 text-slate-400">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3 font-semibold">
                              {student.fullName}
                            </td>

                            {semesterExams.map(
                              (exam) => {
                                const value =
                                  marks[student.id]?.[
                                    exam.id
                                  ] ?? "";

                                const active =
                                  exam.id === examId;

                                return (
                                  <td
                                    key={exam.id}
                                    className="px-3 py-3 text-center"
                                  >
                                    {active ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max={exam.maxMarks}
                                        step="0.01"
                                        value={value}
                                        onChange={(e) =>
                                          updateMark(
                                            student.id,
                                            e.target.value
                                          )
                                        }
                                        className="mx-auto w-24 rounded-lg border border-slate-300 px-2 py-2 text-center font-semibold"
                                      />
                                    ) : (
                                      <span>
                                        {value || "—"}
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                            )}

                            <td className="px-4 py-3 text-center font-black">
                              {total ?? "—"}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-4 border-t bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Entering{" "}
                  <strong>
                    {selectedExam.name}
                  </strong>{" "}
                  marks out of{" "}
                  <strong>
                    {selectedExam.maxMarks}
                  </strong>
                  .
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveMarks}
                    disabled={pending || isLocked}
                    className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {pending
                      ? "Saving..."
                      : "Save marks"}
                  </button>

                  <button
                    type="button"
                    onClick={submitSemesterResult}
                    disabled={pending || isLocked}
                    className="rounded-lg border border-brand-primary bg-white px-5 py-2.5 text-sm font-bold text-brand-primary hover:bg-slate-50 disabled:opacity-50"
                  >
                    {pending
                      ? "Processing..."
                      : "Submit semester result"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}













