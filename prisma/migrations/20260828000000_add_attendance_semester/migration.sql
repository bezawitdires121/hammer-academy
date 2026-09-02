-- Add semesterId only if it does not already exist.
ALTER TABLE "attendance"
ADD COLUMN IF NOT EXISTS "semesterId" TEXT;

-- Fill attendance records using the semester whose date range
-- contains the attendance date.
UPDATE "attendance" a
SET "semesterId" = s.id
FROM "sections" sec
JOIN "semesters" s
  ON s."schoolYearId" = sec."schoolYearId"
WHERE a."sectionId" = sec.id
  AND a.date >= s."startDate"
  AND a.date <= s."endDate"
  AND a."semesterId" IS NULL;

-- Any remaining attendance gets the nearest semester
-- belonging to its section's school year.
UPDATE "attendance" a
SET "semesterId" = (
  SELECT s.id
  FROM "sections" sec
  JOIN "semesters" s
    ON s."schoolYearId" = sec."schoolYearId"
  WHERE sec.id = a."sectionId"
  ORDER BY
    CASE
      WHEN a.date < s."startDate"
        THEN EXTRACT(EPOCH FROM (s."startDate" - a.date))
      WHEN a.date > s."endDate"
        THEN EXTRACT(EPOCH FROM (a.date - s."endDate"))
      ELSE 0
    END,
    s."number"
  LIMIT 1
)
WHERE a."semesterId" IS NULL;

-- semesterId must be populated before becoming required.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "attendance"
    WHERE "semesterId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot make attendance.semesterId required: unmatched attendance records remain.';
  END IF;
END $$;

ALTER TABLE "attendance"
ALTER COLUMN "semesterId" SET NOT NULL;

-- Add the foreign key only if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_semesterId_fkey'
  ) THEN
    ALTER TABLE "attendance"
    ADD CONSTRAINT "attendance_semesterId_fkey"
    FOREIGN KEY ("semesterId")
    REFERENCES "semesters"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "attendance_semesterId_idx"
ON "attendance"("semesterId");