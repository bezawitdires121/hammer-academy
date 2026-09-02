CREATE TABLE "teacher_assignment_history" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "teacher_assignment_history_teacherId_idx" ON "teacher_assignment_history"("teacherId");
CREATE INDEX "teacher_assignment_history_sectionId_idx" ON "teacher_assignment_history"("sectionId");
CREATE INDEX "teacher_assignment_history_subjectId_idx" ON "teacher_assignment_history"("subjectId");
CREATE INDEX "teacher_assignment_history_schoolYearId_idx" ON "teacher_assignment_history"("schoolYearId");
CREATE INDEX "teacher_assignment_history_teacherId_schoolYearId_idx" ON "teacher_assignment_history"("teacherId", "schoolYearId");
CREATE INDEX "teacher_assignment_history_sectionId_subjectId_idx" ON "teacher_assignment_history"("sectionId", "subjectId");

ALTER TABLE "teacher_assignment_history"
ADD CONSTRAINT "teacher_assignment_history_assignedById_fkey"
FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teacher_assignment_history"
ADD CONSTRAINT "teacher_assignment_history_schoolYearId_fkey"
FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teacher_assignment_history"
ADD CONSTRAINT "teacher_assignment_history_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teacher_assignment_history"
ADD CONSTRAINT "teacher_assignment_history_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teacher_assignment_history"
ADD CONSTRAINT "teacher_assignment_history_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
