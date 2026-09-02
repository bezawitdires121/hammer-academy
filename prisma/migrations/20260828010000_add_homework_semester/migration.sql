-- Homework semester relationship was already synchronized to the database
-- with `prisma db push` before this migration was created.
ALTER TABLE "homework"
ADD COLUMN IF NOT EXISTS "semesterId" TEXT;

CREATE INDEX IF NOT EXISTS "homework_semesterId_idx"
ON "homework"("semesterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'homework_semesterId_fkey'
  ) THEN
    ALTER TABLE "homework"
    ADD CONSTRAINT "homework_semesterId_fkey"
    FOREIGN KEY ("semesterId")
    REFERENCES "semesters"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
