"use client";

import { useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { createStudent } from "./actions";
import { ethiopianToGregorian } from "@/lib/ethiopian-calendar";

type FormState = {
  error?: string;
  success: boolean;
  loginId?: string;
};

const initialState: FormState = {
  error: undefined,
  success: false,
};

const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagumen",
];

const ETHIOPIAN_YEARS = Array.from(
  { length: 31 },
  (_, index) => 1995 + index
);

export default function StudentForm({
  sections,
}: {
  sections: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const result = await createStudent(formData);

      return {
        error: result?.error,
        success: !!result?.success,
        loginId: result?.studentLoginId,
      };
    },
    initialState
  );

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoName, setPhotoName] = useState("");

  const [ecYear, setEcYear] = useState("");
  const [ecMonth, setEcMonth] = useState("");
  const [ecDay, setEcDay] = useState("");

  const daysInMonth = useMemo(() => {
    if (!ecMonth) return 30;

    if (Number(ecMonth) === 13) {
      const year = Number(ecYear);

      if (!year) return 5;

      return year % 4 === 3 ? 6 : 5;
    }

    return 30;
  }, [ecYear, ecMonth]);

  const gregorianDob = useMemo(() => {
    if (!ecYear || !ecMonth || !ecDay) return "";

    const date = ethiopianToGregorian(
      Number(ecYear),
      Number(ecMonth),
      Number(ecDay)
    );

    if (!date) return "";

    return date.toISOString().slice(0, 10);
  }, [ecYear, ecMonth, ecDay]);

  function handleMonthChange(value: string) {
    setEcMonth(value);

    const month = Number(value);

    if (month === 13 && Number(ecDay) > 6) {
      setEcDay("");
    }
  }

  return (
    <form
      action={formAction}
      className="grid gap-4 md:grid-cols-2"
    >
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">
          Student enrolled successfully. Login ID:{" "}
          {state.loginId}
        </p>
      )}

      {/* Student name */}
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Student full name *
        </label>

        <input
          name="fullName"
          placeholder="Student full name"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        />
      </div>

      {/* Student photo */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Student photo *
        </label>

        <input
          ref={photoInputRef}
          name="photo"
          type="file"
          accept="image/*"
          required
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPhotoName(file?.name ?? "");
          }}
        />

        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left transition hover:border-[#0f2a47] hover:bg-gray-50"
        >
          <span className="truncate text-sm text-gray-700">
            {photoName || "Choose student photo"}
          </span>

          <span className="ml-3 shrink-0 rounded-md bg-[#0f2a47] px-3 py-1.5 text-xs font-semibold text-white">
            Browse
          </span>
        </button>

        <p className="mt-1 text-xs text-gray-500">
          JPG, PNG or other image • Maximum 5MB
        </p>
      </div>

      {/* Gender */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Gender *
        </label>

        <select
          name="gender"
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        >
          <option value="">Select gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      {/* Age */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Age *
        </label>

        <input
          name="age"
          type="number"
          min="1"
          max="100"
          required
          placeholder="Student age"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        />
      </div>

      {/* Ethiopian date of birth */}
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Date of birth *
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={ecYear}
            onChange={(event) => {
              setEcYear(event.target.value);
              setEcDay("");
            }}
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
          >
            <option value="">Year E.C.</option>

            {ETHIOPIAN_YEARS.map((year) => (
              <option key={year} value={year}>
                {year} E.C.
              </option>
            ))}
          </select>

          <select
            value={ecMonth}
            onChange={(event) =>
              handleMonthChange(event.target.value)
            }
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
          >
            <option value="">Month</option>

            {ETHIOPIAN_MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={ecDay}
            onChange={(event) =>
              setEcDay(event.target.value)
            }
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
          >
            <option value="">Day</option>

            {Array.from(
              { length: daysInMonth },
              (_, index) => index + 1
            ).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <input
          type="hidden"
          name="dateOfBirth"
          value={gregorianDob}
          required
        />

        <p className="mt-1 text-xs text-gray-500">
          Ethiopian calendar • Meskerem to Pagumen
        </p>

        {gregorianDob && (
          <p className="mt-1 text-xs font-medium text-[#0f2a47]">
            Selected: {ecYear} E.C. /{" "}
            {ETHIOPIAN_MONTHS[Number(ecMonth) - 1]} / {ecDay}
          </p>
        )}
      </div>

      {/* Grade / Section */}
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Grade / Section *
        </label>

        <select
          name="sectionId"
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        >
          <option value="">Select section</option>

          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>

      {/* Guardian */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Guardian full name *
        </label>

        <input
          name="parentFullName"
          placeholder="Guardian full name"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Guardian phone *
        </label>

        <input
          name="parentPhone"
          type="tel"
          placeholder="Guardian phone"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Guardian relationship *
        </label>

        <select
          name="parentRelationship"
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        >
          <option value="">Select relationship</option>
          <option value="Mother">Mother</option>
          <option value="Father">Father</option>
          <option value="Guardian">Guardian</option>
          <option value="Grandmother">Grandmother</option>
          <option value="Grandfather">Grandfather</option>
          <option value="Aunt">Aunt</option>
          <option value="Uncle">Uncle</option>
          <option value="Sibling">Sibling</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Guardian email
        </label>

        <input
          name="parentEmail"
          type="email"
          placeholder="Guardian email (optional)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#0f2a47] px-4 py-2.5 font-semibold text-white transition hover:bg-[#0b2037] disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
      >
        {isPending ? "Enrolling..." : "Enroll Student"}
      </button>
    </form>
  );
}
