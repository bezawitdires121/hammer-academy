/**
 * Stable Class Number / Roll Number System
 *
 * Class No. is stored on StudentEnrollment.classNo.
 *
 * Rules:
 * - Initial section enrollment is numbered alphabetically A-Z.
 * - Once assigned, class numbers are stable.
 * - Students added later receive the next available number.
 * - Students transferred into a section receive the next available number.
 * - Existing students are never renumbered because of a later enrollment,
 *   transfer, or name change.
 *
 * Display pages must read the stored classNo. They must not calculate it.
 */

import { prisma } from "@/lib/prisma";

export type ClassNumberStudent = {
  id: string;
  fullName: string;
};

/**
 * Sort students alphabetically by full name.
 * Student ID is used only as a stable tiebreaker.
 */
export function sortStudentsAlphabetically<T extends ClassNumberStudent>(
  students: T[]
): T[] {
  return [...students].sort((a, b) => {
    const nameCompare = a.fullName.localeCompare(b.fullName, undefined, {
      sensitivity: "base",
      numeric: true,
    });

    if (nameCompare !== 0) return nameCompare;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Build the initial alphabetical class-number map.
 */
export function buildClassNumberMap(
  students: ClassNumberStudent[]
): Map<string, number> {
  const sorted = sortStudentsAlphabetically(students);
  const map = new Map<string, number>();

  sorted.forEach((student, index) => {
    map.set(student.id, index + 1);
  });

  return map;
}

/**
 * Return the next available class number for a section.
 *
 * Existing class numbers are never changed.
 */
export function getNextAvailableClassNo(
  enrollments: Array<{ classNo: number | null | undefined }>
): number {
  const numbers = enrollments
    .map((enrollment) => enrollment.classNo)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
    );

  return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

/**
 * Assign initial class numbers alphabetically.
 *
 * This is intended for initial section enrollment finalization only.
 */
export function assignInitialClassNumbersAlphabetically<
  T extends {
    id: string;
    classNo: number | null | undefined;
    student?: {
      id?: string;
      fullName?: string | null;
    } | null;
  }
>(enrollments: T[]) {
  const sorted = [...enrollments].sort((a, b) => {
    const left = (a.student?.fullName ?? "").trim();
    const right = (b.student?.fullName ?? "").trim();

    const nameCompare = left.localeCompare(right, undefined, {
      sensitivity: "base",
      numeric: true,
    });

    if (nameCompare !== 0) return nameCompare;

    const leftId = a.student?.id ?? a.id;
    const rightId = b.student?.id ?? b.id;

    return leftId.localeCompare(rightId);
  });

  return sorted.map((enrollment, index) => ({
    ...enrollment,
    classNo: index + 1,
  }));
}

/**
 * Return the class number for a newly enrolled/transferred student.
 *
 * Existing enrollments are not modified.
 */
export function assignNextAvailableClassNo<
  T extends {
    classNo: number | null | undefined;
  }
>(enrollments: T[]) {
  return {
    classNo: getNextAvailableClassNo(enrollments),
  };
}

/**
 * Assign initial alphabetical class numbers and STORE them.
 *
 * Use only after a section's initial enrollment list has been finalized.
 */
export async function assignInitialClassNumbers(
  sectionId: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<void> {
  const db = tx ?? prisma;

  const enrollments = await (db as typeof prisma).studentEnrollment.findMany({
    where: {
      sectionId,
      status: "ACTIVE",
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  const numbered = assignInitialClassNumbersAlphabetically(enrollments);

  await Promise.all(
    numbered.map((enrollment) =>
      (db as typeof prisma).studentEnrollment.update({
        where: { id: enrollment.id },
        data: { classNo: enrollment.classNo },
      })
    )
  );
}

/**
 * Assign the next available class number to one enrollment.
 *
 * Existing students are never renumbered.
 */
export async function assignNextClassNo(
  enrollmentId: string,
  sectionId: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<number> {
  const db = tx ?? prisma;

  const existingEnrollments =
    await (db as typeof prisma).studentEnrollment.findMany({
      where: {
        sectionId,
        status: "ACTIVE",
        id: { not: enrollmentId },
      },
      select: {
        classNo: true,
      },
    });

  const classNo = getNextAvailableClassNo(existingEnrollments);

  await (db as typeof prisma).studentEnrollment.update({
    where: { id: enrollmentId },
    data: { classNo },
  });

  return classNo;
}
/**
 * Regenerate missing class numbers for a section.
 *
 * IMPORTANT:
 * - Existing class numbers are preserved.
 * - Students who already have a class number are never renumbered.
 * - Only active enrollments without a class number receive a number.
 * - New numbers are assigned sequentially from the next available number.
 *
 * This is used after adding, transferring, or promoting students.
 */
export async function regenerateClassNumbers(
  sectionId: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<void> {
  const db = tx ?? prisma;

  const enrollments =
    await (db as typeof prisma).studentEnrollment.findMany({
      where: {
        sectionId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        classNo: true,
      },
    });

  const existingNumbers = enrollments
    .map((enrollment) => enrollment.classNo)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value > 0
    );

  let nextNumber =
    existingNumbers.length === 0
      ? 1
      : Math.max(...existingNumbers) + 1;

  const missing = enrollments.filter(
    (enrollment) =>
      enrollment.classNo === null ||
      enrollment.classNo === undefined
  );

  for (const enrollment of missing) {
    await (db as typeof prisma).studentEnrollment.update({
      where: {
        id: enrollment.id,
      },
      data: {
        classNo: nextNumber,
      },
    });

    nextNumber++;
  }
}
