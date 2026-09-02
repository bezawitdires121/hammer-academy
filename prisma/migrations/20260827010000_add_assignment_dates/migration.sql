ALTER TABLE "teacher_assignment_history"
ADD COLUMN "startDate" TIMESTAMP(3);

ALTER TABLE "teacher_assignment_history"
ADD COLUMN "endDate" TIMESTAMP(3);

UPDATE "teacher_assignment_history"
SET "startDate" = "assignedAt"
WHERE "startDate" IS NULL;

ALTER TABLE "teacher_assignment_history"
ALTER COLUMN "startDate" SET NOT NULL;
