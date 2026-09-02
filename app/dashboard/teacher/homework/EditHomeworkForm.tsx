"use client";

import { useState } from "react";
import { updateHomework } from "./actions";
import { HomeworkSource } from "@prisma/client";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";

type Assignment = {
  id: string;
  sectionId: string;
  subjectId: string;

  section: {
    id: string;
    label: string;

    grade: {
      level: number;
    };

    schoolYear: {
      label: string;
    };
  };

  subject: {
    id: string;
    name: string;
  };
};

type Homework = {
  id: string;
  title: string;
  instructions: string | null;
  source: HomeworkSource;
  textbookName: string | null;
  pageNumber: string | null;
  exercises: string | null;
  sourceNote: string | null;
  assignedDate: string;
  dueDate: string | null;
  sectionId: string;
  subjectId: string;
  semesterId: string | null;
};

function dateInputValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

export default function EditHomeworkForm({
  homework,
  assignments,
  onClose,
}: {
  homework: Homework;
  assignments: Assignment[];
  onClose: () => void;
}) {
  const semesterId = homework.semesterId;

  const initialAssignment = assignments.find(
    (assignment) =>
      assignment.sectionId === homework.sectionId &&
      assignment.subjectId === homework.subjectId
  );

  const [selectedYear, setSelectedYear] = useState(
    initialAssignment?.section.schoolYear.label ?? ""
  );

  const [selectedGrade, setSelectedGrade] = useState(
    initialAssignment
      ? String(initialAssignment.section.grade.level)
      : ""
  );

  const [sectionId, setSectionId] = useState(
    homework.sectionId
  );

  const [subjectId, setSubjectId] = useState(
    homework.subjectId
  );

  const [title, setTitle] = useState(homework.title);
  const [instructions, setInstructions] = useState(
    homework.instructions ?? ""
  );

  const [source, setSource] =
    useState<HomeworkSource>(homework.source);

  const [textbookName, setTextbookName] = useState(
    homework.textbookName ?? ""
  );

  const [pageNumber, setPageNumber] = useState(
    homework.pageNumber ?? ""
  );

  const [exercises, setExercises] = useState(
    homework.exercises ?? ""
  );

  const [sourceNote, setSourceNote] = useState(
    homework.sourceNote ?? ""
  );

  const [assignedDate, setAssignedDate] = useState(
    dateInputValue(homework.assignedDate)
  );

  const [dueDate, setDueDate] = useState(
    dateInputValue(homework.dueDate)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const schoolYears = Array.from(
    new Map(
      assignments.map((assignment) => [
        assignment.section.schoolYear.label,
        assignment.section.schoolYear,
      ])
    ).values()
  ).sort((a, b) =>
    b.label.localeCompare(a.label)
  );

  const grades = Array.from(
    new Map(
      assignments
        .filter(
          (assignment) =>
            assignment.section.schoolYear.label ===
            selectedYear
        )
        .map((assignment) => [
          assignment.section.grade.level,
          assignment.section.grade,
        ])
    ).values()
  ).sort((a, b) => a.level - b.level);

  const sections = Array.from(
    new Map(
      assignments
        .filter(
          (assignment) =>
            assignment.section.schoolYear.label ===
              selectedYear &&
            String(assignment.section.grade.level) ===
              selectedGrade
        )
        .map((assignment) => [
          assignment.sectionId,
          assignment.section,
        ])
    ).values()
  ).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  /*
   * Every subject the teacher teaches
   * in the selected section.
   */
  const subjects = assignments
    .filter(
      (assignment) =>
        assignment.sectionId === sectionId
    )
    .map((assignment) => assignment.subject)
    .filter(
      (subject, index, array) =>
        array.findIndex(
          (item) => item.id === subject.id
        ) === index
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  function handleYearChange(value: string) {
    setSelectedYear(value);
    setSelectedGrade("");
    setSectionId("");
    setSubjectId("");
    setError("");
    setSuccess("");
  }

  function handleGradeChange(value: string) {
    setSelectedGrade(value);
    setSectionId("");
    setSubjectId("");
    setError("");
    setSuccess("");
  }

  function handleSectionChange(value: string) {
    setSectionId(value);
    setSubjectId("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (!selectedYear) {
      setError("Please select a school year.");
      setLoading(false);
      return;
    }

    if (!selectedGrade) {
      setError("Please select a grade.");
      setLoading(false);
      return;
    }

    if (!sectionId) {
      setError("Please select a section.");
      setLoading(false);
      return;
    }

    if (!subjectId) {
      setError("Please select a subject.");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("Please enter a homework title.");
      setLoading(false);
      return;
    }

    if (!assignedDate) {
      setError("Please select an assigned date.");
      setLoading(false);
      return;
    }

    if (
      source === "TEXTBOOK" &&
      !textbookName.trim()
    ) {
      setError("Please enter the textbook name.");
      setLoading(false);
      return;
    }

    if (
      dueDate &&
      dueDate < assignedDate
    ) {
      setError(
        "Due date cannot be before the assigned date."
      );
      setLoading(false);
      return;
    }

    const result = await updateHomework(
      homework.id,
      {
        title,
        instructions,
        source,
        textbookName,
        pageNumber,
        exercises,
        sourceNote,
        assignedDate,
        dueDate,
        sectionId,
        subjectId,
          semesterId,
      }
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess("Homework updated successfully.");

    setLoading(false);

    setTimeout(() => {
      onClose();
    }, 700);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && (
        <div className="flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
          <p>{success}</p>
        </div>
      )}

      {/* CLASS */}
      <section>
        <div className="mb-4 border-b border-gray-200 pb-3">
          <h3 className="font-bold text-gray-900">
            Class and Subject
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Select the class and the subject you teach.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <Field label="School Year" required>
            <select
              value={selectedYear}
              onChange={(event) =>
                handleYearChange(event.target.value)
              }
              className="input"
              required
            >
              <option value="">
                Select school year
              </option>

              {schoolYears.map((year) => (
                <option
                  key={year.label}
                  value={year.label}
                >
                  {year.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Grade" required>
            <select
              value={selectedGrade}
              onChange={(event) =>
                handleGradeChange(event.target.value)
              }
              className="input"
              disabled={!selectedYear}
              required
            >
              <option value="">
                {selectedYear
                  ? "Select grade"
                  : "Select year first"}
              </option>

              {grades.map((grade) => (
                <option
                  key={grade.level}
                  value={grade.level}
                >
                  Grade {grade.level}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Section" required>
            <select
              value={sectionId}
              onChange={(event) =>
                handleSectionChange(event.target.value)
              }
              className="input"
              disabled={
                !selectedYear || !selectedGrade
              }
              required
            >
              <option value="">
                {!selectedYear
                  ? "Select year first"
                  : !selectedGrade
                    ? "Select grade first"
                    : "Select section"}
              </option>

              {sections.map((section) => (
                <option
                  key={section.id}
                  value={section.id}
                >
                  Section {section.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Subject" required>
            <select
              value={subjectId}
              onChange={(event) =>
                setSubjectId(event.target.value)
              }
              className="input"
              disabled={!sectionId}
              required
            >
              <option value="">
                {!sectionId
                  ? "Select section first"
                  : subjects.length === 0
                    ? "No subjects"
                    : "Select subject"}
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* HOMEWORK */}
      <section>
        <div className="mb-4 border-b border-gray-200 pb-3">
          <h3 className="font-bold text-gray-900">
            Homework Details
          </h3>
        </div>

        <div className="space-y-5">
          <Field label="Homework Title" required>
            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              className="input"
              required
            />
          </Field>

          <Field
            label="Instructions"
            hint="Tell students what they need to complete."
          >
            <textarea
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              rows={4}
              className="input resize-y"
            />
          </Field>
        </div>
      </section>

      {/* SOURCE */}
      <section>
        <div className="mb-4 border-b border-gray-200 pb-3">
          <h3 className="font-bold text-gray-900">
            Source
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SourceOption
            selected={source === "TEXTBOOK"}
            icon={BookOpen}
            title="Textbook"
            description="From a textbook"
            onClick={() => setSource("TEXTBOOK")}
          />

          <SourceOption
            selected={source === "CLASSWORK"}
            icon={FileText}
            title="Classwork"
            description="Based on classwork"
            onClick={() => setSource("CLASSWORK")}
          />

          <SourceOption
            selected={source === "OTHER"}
            icon={Plus}
            title="Other"
            description="Other source"
            onClick={() => setSource("OTHER")}
          />
        </div>
      </section>

      {source === "TEXTBOOK" && (
        <section>
          <div className="mb-4 border-b border-gray-200 pb-3">
            <h3 className="font-bold text-gray-900">
              Textbook Details
            </h3>
          </div>

          <div className="space-y-5">
            <Field label="Textbook Name" required>
              <input
                type="text"
                value={textbookName}
                onChange={(event) =>
                  setTextbookName(event.target.value)
                }
                className="input"
                required
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Page Number">
                <input
                  type="text"
                  value={pageNumber}
                  onChange={(event) =>
                    setPageNumber(event.target.value)
                  }
                  className="input"
                />
              </Field>

              <Field label="Exercise">
                <input
                  type="text"
                  value={exercises}
                  onChange={(event) =>
                    setExercises(event.target.value)
                  }
                  className="input"
                />
              </Field>
            </div>
          </div>
        </section>
      )}

      <Field
        label="Additional Source Note"
        hint="Optional"
      >
        <textarea
          value={sourceNote}
          onChange={(event) =>
            setSourceNote(event.target.value)
          }
          rows={3}
          className="input resize-y"
        />
      </Field>

      {/* DATES */}
      <section>
        <div className="mb-4 border-b border-gray-200 pb-3">
          <h3 className="font-bold text-gray-900">
            Dates
          </h3>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Assigned Date" required>
            <DateInput
              value={assignedDate}
              onChange={setAssignedDate}
            />
          </Field>

          <Field label="Due Date" hint="Optional">
            <DateInput
              value={dueDate}
              min={assignedDate}
              onChange={setDueDate}
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            loading ||
            !sectionId ||
            !subjectId
          }
          className="inline-flex items-center gap-2 bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2
                size={17}
                className="animate-spin"
              />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 size={17} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function DateInput({
  value,
  min,
  onChange,
}: {
  value: string;
  min?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Calendar
        size={17}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="date"
        value={value}
        min={min}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="input pl-10"
      />
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {hint && (
        <p className="mb-2 text-xs text-gray-400">
          {hint}
        </p>
      )}

      {children}
    </div>
  );
}

function SourceOption({
  selected,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
 icon: React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center gap-3 border p-3 text-left transition ${
        selected
          ? "border-brand-primary bg-brand-primary/5"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <Icon
        size={19}
        className={
          selected
            ? "text-brand-primary"
            : "text-gray-500"
        }
      />

      <div>
        <p className="text-sm font-bold text-gray-900">
          {title}
        </p>

        <p className="text-xs text-gray-500">
          {description}
        </p>
      </div>
    </button>
  );
}





