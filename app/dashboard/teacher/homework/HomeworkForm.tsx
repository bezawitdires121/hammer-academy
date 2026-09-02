"use client";

import {
  formatEthiopianDisplay,
  parseEthiopianDate,
} from "@/lib/ethiopian-calendar";
import EthiopianHomeworkDatePicker from "./EthiopianHomeworkDatePicker";

import { useState } from "react";

import {
  createHomework,
  updateHomework,
} from "./actions";

import { HomeworkSource } from "@prisma/client";

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Save,
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

type SemesterOption = {
  id: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
};

type InitialData = {
  id: string;
  title: string;
  instructions: string;
  source: HomeworkSource;
  textbookName: string;
  pageNumber: string;
  exercises: string;
  sourceNote: string;
  assignedDate: string;
  dueDate: string;
  sectionId: string;
  subjectId: string;
  semesterId?: string;
};

function ecDateToGregorianInput(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = parseEthiopianDate(trimmed);

  if (!parsed) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatEcInput(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return formatEthiopianDisplay(value);
  } catch {
    return "";
  }
}

export default function HomeworkForm({
  assignments,
  semesters,
  selectedSemesterId,
  initialData,
  isLocked = false,
}: {
  assignments: Assignment[];
  semesters: SemesterOption[];
  selectedSemesterId: string;
  initialData?: InitialData;
  isLocked?: boolean;
}) {
  const initialAssignment = initialData
    ? assignments.find(
        (assignment) =>
          assignment.sectionId === initialData.sectionId &&
          assignment.subjectId === initialData.subjectId
      )
    : undefined;

  const initialSemester =
    semesters.find(
      (semester) =>
        semester.id ===
        (initialData?.semesterId ?? selectedSemesterId)
    ) ?? semesters[0];

  const [semesterId, setSemesterId] = useState(
    initialData?.semesterId ??
      initialSemester?.id ??
      selectedSemesterId ??
      ""
  );

  const [selectedYear, setSelectedYear] = useState(
    initialAssignment?.section.schoolYear.label ?? ""
  );

  const [selectedGradeValue, setSelectedGradeValue] =
    useState(
      initialAssignment
        ? String(initialAssignment.section.grade.level)
        : ""
    );

  const [sectionId, setSectionId] = useState(
    initialData?.sectionId ?? ""
  );

  const [subjectId, setSubjectId] = useState(
    initialData?.subjectId ?? ""
  );

  const [title, setTitle] = useState(
    initialData?.title ?? ""
  );

  const [instructions, setInstructions] = useState(
    initialData?.instructions ?? ""
  );

  const [source, setSource] =
    useState<HomeworkSource>(
      initialData?.source ?? "TEXTBOOK"
    );

  const [textbookName, setTextbookName] = useState(
    initialData?.textbookName ?? ""
  );

  const [pageNumber, setPageNumber] = useState(
    initialData?.pageNumber ?? ""
  );

  const [exercises, setExercises] = useState(
    initialData?.exercises ?? ""
  );

  const [sourceNote, setSourceNote] = useState(
    initialData?.sourceNote ?? ""
  );

  const [assignedDate, setAssignedDate] = useState(
    initialData?.assignedDate
      ? formatEcInput(initialData.assignedDate)
      : initialSemester
        ? formatEthiopianDisplay(initialSemester.startDate)
        : ""
  );

  const [dueDate, setDueDate] = useState(
    initialData?.dueDate
      ? formatEcInput(initialData.dueDate)
      : ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSemester = semesters.find(
    (semester) => semester.id === semesterId
  );

  /*
   * ------------------------------------------------------------
   * SCHOOL YEARS
   * ------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------
   * GRADES
   * ------------------------------------------------------------
   */

  const availableGrades = Array.from(
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

  /*
   * ------------------------------------------------------------
   * SECTIONS
   * ------------------------------------------------------------
   */

  const availableSections = assignments
    .filter(
      (assignment) =>
        assignment.section.schoolYear.label ===
          selectedYear &&
        String(assignment.section.grade.level) ===
          selectedGradeValue
    )
    .sort((a, b) =>
      a.section.label.localeCompare(
        b.section.label
      )
    );

  /*
   * ------------------------------------------------------------
   * SUBJECTS
   * ------------------------------------------------------------
   */

  const availableSubjects = assignments
    .filter(
      (assignment) =>
        assignment.sectionId === sectionId
    )
    .sort((a, b) =>
      a.subject.name.localeCompare(
        b.subject.name
      )
    );

  const selectedAssignment = assignments.find(
    (assignment) =>
      assignment.sectionId === sectionId &&
      assignment.subjectId === subjectId
  );

  /*
   * ------------------------------------------------------------
   * CHANGE HANDLERS
   * ------------------------------------------------------------
   */

  function onSemesterChange(value: string) {
    setSemesterId(value);

    const semester = semesters.find(
      (item) => item.id === value
    );

    setAssignedDate(
      semester
        ? formatEthiopianDisplay(semester.startDate)
        : ""
    );

    setDueDate("");
    setError("");
    setSuccess("");
  }

  function onYearChange(value: string) {
    setSelectedYear(value);
    setSemesterId("");
    setSelectedGradeValue("");
    setSectionId("");
    setSubjectId("");
    setAssignedDate("");
    setDueDate("");
    setError("");
    setSuccess("");
  }

  function onGradeChange(value: string) {
    setSelectedGradeValue(value);
    setSectionId("");
    setSubjectId("");
    setError("");
    setSuccess("");
  }

  function onSectionChange(value: string) {
    setSectionId(value);
    setSubjectId("");
    setError("");
    setSuccess("");
  }

  function onSubjectChange(value: string) {
    setSubjectId(value);
    setError("");
    setSuccess("");
  }

  /*
   * ------------------------------------------------------------
   * SUBMIT
   * ------------------------------------------------------------
   */

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

    if (!semesterId) {
      setError("Please select a semester.");
      setLoading(false);
      return;
    }

    if (!selectedSemester) {
      setError("The selected semester could not be found.");
      setLoading(false);
      return;
    }

    if (!selectedGradeValue) {
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

    if (!selectedAssignment) {
      setError(
        "The selected subject is not assigned to you for this section."
      );
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setError("Please enter a homework title.");
      setLoading(false);
      return;
    }

    if (!assignedDate.trim()) {
      setError("Please enter an assigned date.");
      setLoading(false);
      return;
    }

    const assignedGregorian =
      ecDateToGregorianInput(assignedDate);

    if (!assignedGregorian) {
      setError(
        "Assigned date must be a valid Ethiopian date, for example: Nehase 24, 2018 E.C."
      );
      setLoading(false);
      return;
    }

    let dueGregorian: string | undefined;

    if (dueDate.trim()) {
      dueGregorian =
        ecDateToGregorianInput(dueDate) ?? undefined;

      if (!dueGregorian) {
        setError(
          "Due date must be a valid Ethiopian date, for example: Nehase 24, 2018 E.C."
        );
        setLoading(false);
        return;
      }
    }

    if (
      dueGregorian &&
      dueGregorian < assignedGregorian
    ) {
      setError(
        "Due date cannot be before the assigned date."
      );
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

    const input = {
      title,
      instructions,
      source,
      textbookName,
      pageNumber,
      exercises,
      sourceNote,
      assignedDate: assignedGregorian,
      dueDate: dueGregorian,
      sectionId,
      subjectId,
      semesterId,
    };

    const result = initialData
      ? await updateHomework(
          initialData.id,
          input
        )
      : await createHomework(input);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (initialData) {
      setSuccess(
        "Homework updated successfully."
      );
    } else {
      setSuccess(
        "Homework created successfully."
      );

      setTitle("");
      setInstructions("");
      setTextbookName("");
      setPageNumber("");
      setExercises("");
      setSourceNote("");
      setDueDate("");

      if (selectedSemester) {
        setAssignedDate(
          formatEthiopianDisplay(
            selectedSemester.startDate
          )
        );
      }
    }

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-green-600"
          />

          <p className="text-sm font-medium text-green-700">
            {success}
          </p>
        </div>
      )}

      {/* CLASS SELECTION */}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-5">
          <h3 className="text-base font-bold text-gray-900">
            Select Class
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Choose the school year, semester, grade,
            section, and subject.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-5">

          {/* SCHOOL YEAR */}

          <Field
            label="School Year"
            required
          >
            <select
              value={selectedYear}
              onChange={(event) =>
                onYearChange(
                  event.target.value
                )
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

          {/* SEMESTER */}

          <Field
            label="Semester"
            required
          >
            <select
              value={semesterId}
              onChange={(event) =>
                onSemesterChange(
                  event.target.value
                )
              }
              className="input"
              disabled={!selectedYear}
              required
            >
              <option value="">
                {selectedYear
                  ? "Select semester"
                  : "Select year first"}
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
          </Field>

          {/* GRADE */}

          <Field
            label="Grade"
            required
          >
            <select
              value={selectedGradeValue}
              onChange={(event) =>
                onGradeChange(
                  event.target.value
                )
              }
              className="input"
              disabled={
                !selectedYear ||
                !semesterId
              }
              required
            >
              <option value="">
                {!selectedYear
                  ? "Select year first"
                  : !semesterId
                    ? "Select semester first"
                    : "Select grade"}
              </option>

              {availableGrades.map(
                (grade) => (
                  <option
                    key={grade.level}
                    value={grade.level}
                  >
                    Grade {grade.level}
                  </option>
                )
              )}
            </select>
          </Field>

          {/* SECTION */}

          <Field
            label="Section"
            required
          >
            <select
              value={sectionId}
              onChange={(event) =>
                onSectionChange(
                  event.target.value
                )
              }
              className="input"
              disabled={
                !selectedYear ||
                !semesterId ||
                !selectedGradeValue
              }
              required
            >
              <option value="">
                {!selectedYear
                  ? "Select year first"
                  : !semesterId
                    ? "Select semester first"
                    : !selectedGradeValue
                      ? "Select grade first"
                      : "Select section"}
              </option>

              {availableSections.map(
                (assignment) => (
                  <option
                    key={assignment.sectionId}
                    value={assignment.sectionId}
                  >
                    Section{" "}
                    {assignment.section.label}
                  </option>
                )
              )}
            </select>
          </Field>

          {/* SUBJECT */}

          <Field
            label="Subject"
            required
          >
            <select
              value={subjectId}
              onChange={(event) =>
                onSubjectChange(
                  event.target.value
                )
              }
              className="input"
              disabled={!sectionId}
              required
            >
              <option value="">
                {!sectionId
                  ? "Select section first"
                  : "Select subject"}
              </option>

              {availableSubjects.map(
                (assignment) => (
                  <option
                    key={assignment.subjectId}
                    value={assignment.subjectId}
                  >
                    {assignment.subject.name}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>

        {selectedAssignment && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <BookOpen
                  size={19}
                  strokeWidth={2.2}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Assigned Subject
                </p>

                <p className="mt-0.5 text-sm font-bold text-green-900">
                  {selectedAssignment.subject.name}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HOMEWORK DETAILS */}

      <Field
        label="Homework Title"
        required
      >
        <input
          type="text"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="e.g. Chapter 4 Exercises"
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
            setInstructions(
              event.target.value
            )
          }
          placeholder="Complete exercises 1-10 and show all your working."
          rows={4}
          className="input resize-y"
        />
      </Field>

      {/* SOURCE */}

      <div>
        <div className="mb-3">
          <label className="text-sm font-semibold text-gray-800">
            Source
          </label>

          <p className="mt-1 text-xs text-gray-400">
            Where does this homework come from?
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SourceOption
            selected={source === "TEXTBOOK"}
            icon={BookOpen}
            title="Textbook"
            description="From a textbook"
            onClick={() => {
              setSource("TEXTBOOK");
              setError("");
            }}
          />

          <SourceOption
            selected={source === "CLASSWORK"}
            icon={FileText}
            title="Classwork"
            description="Based on classwork"
            onClick={() => {
              setSource("CLASSWORK");
              setError("");
            }}
          />

          <SourceOption
            selected={source === "OTHER"}
            icon={Plus}
            title="Other"
            description="Other source"
            onClick={() => {
              setSource("OTHER");
              setError("");
            }}
          />
        </div>
      </div>

      {/* TEXTBOOK DETAILS */}

      {source === "TEXTBOOK" && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900">
              Textbook Details
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Add the textbook information for this homework.
            </p>
          </div>

          <div className="space-y-5">
            <Field
              label="Textbook Name"
              required
            >
              <input
                type="text"
                value={textbookName}
                onChange={(event) =>
                  setTextbookName(
                    event.target.value
                  )
                }
                placeholder="e.g. Mathematics Grade 8"
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
                    setPageNumber(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 45"
                  className="input"
                />
              </Field>

              <Field label="Exercise">
                <input
                  type="text"
                  value={exercises}
                  onChange={(event) =>
                    setExercises(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 1-10"
                  className="input"
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* SOURCE NOTE */}

      <Field
        label="Additional Source Note"
        hint="Optional additional information about the source."
      >
        <textarea
          value={sourceNote}
          onChange={(event) =>
            setSourceNote(
              event.target.value
            )
          }
          placeholder="e.g. Review the examples discussed in today's lesson."
          rows={3}
          className="input resize-y"
        />
      </Field>
      {/* EC DATES */}

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-5">
          <h3 className="font-bold text-gray-900">
            Homework Dates
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Select dates from the Ethiopian calendar. Dates are limited to the selected semester.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Assigned Date"
            required
          >
            <EthiopianHomeworkDatePicker
              label="Assigned Date"
              value={assignedDate}
              onChange={setAssignedDate}
              semesterStart={
                selectedSemester?.startDate ?? ""
              }
              semesterEnd={
                selectedSemester?.endDate ?? ""
              }
              required
            />
          </Field>

          <Field
            label="Due Date"
            hint={
              selectedSemester
                ? `Must be within ${selectedSemester.name} and cannot be before the assigned date.`
                : "Optional."
            }
          >
            <EthiopianHomeworkDatePicker
              label="Due Date"
              value={dueDate}
              onChange={setDueDate}
              semesterStart={
                selectedSemester?.startDate ?? ""
              }
              semesterEnd={
                selectedSemester?.endDate ?? ""
              }
              minDate={
                assignedDate
                  ? ecDateToGregorianInput(assignedDate) ??
                    undefined
                  : undefined
              }
              optional
            />
          </Field>
        </div>
      </div>


      {/* SUBMIT */}

      <div className="flex justify-end border-t border-gray-100 pt-5">
        <button
          type="submit"
          disabled={
            loading ||
            isLocked ||
            !sectionId ||
            !subjectId ||
            !semesterId
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              {initialData
                ? "Saving..."
                : "Creating..."}
            </>
          ) : (
            <>
              {initialData ? (
                <Save
                  size={18}
                  strokeWidth={2.5}
                />
              ) : (
                <Plus
                  size={18}
                  strokeWidth={2.5}
                />
              )}

              {initialData
                ? "Save Changes"
                : "Create Homework"}
            </>
          )}
        </button>
      </div>
    </form>
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
      <div className="mb-2">
        <label className="text-sm font-semibold text-gray-800">
          {label}

          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </label>

        {hint && (
          <p className="mt-1 text-xs text-gray-400">
            {hint}
          </p>
        )}
      </div>

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
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          selected
            ? "bg-brand-primary text-white"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        <Icon
          size={19}
          strokeWidth={2.2}
        />
      </div>

      <div>
        <p className="text-sm font-bold text-gray-900">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-gray-500">
          {description}
        </p>
      </div>
    </button>
  );
}


