-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SemesterSubjectSubmissionStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'LIBRARIAN', 'HEALTH');

-- CreateEnum
CREATE TYPE "TeacherApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('TEACHER', 'CLEANER', 'SECURITY', 'SECRETARY', 'LIBRARIAN', 'HEALTH', 'OTHER');

-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('MEMBER', 'ASSISTANT', 'SECRETARY', 'DEPUTY');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'LOST', 'DAMAGED');

-- CreateEnum
CREATE TYPE "VisitOutcome" AS ENUM ('RECOVERED', 'REFERRED', 'UNDER_OBSERVATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CERTIFICATE', 'LEAVE_LETTER', 'ATTENDANCE_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "IdRegenerationReason" AS ENUM ('LOST_ID', 'SECURITY_REPLACEMENT', 'ADMINISTRATIVE_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'WITHDREW', 'GRADUATED');

-- CreateEnum
CREATE TYPE "ShuffleBatchStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'PERMISSION_GIVEN');

-- CreateEnum
CREATE TYPE "HomeworkSource" AS ENUM ('TEXTBOOK', 'CLASSWORK', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolCalendarEventType" AS ENUM ('PUBLIC_HOLIDAY', 'SCHOOL_HOLIDAY', 'TEACHER_TRAINING', 'EXAM_DAY', 'EMERGENCY_CLOSURE', 'OTHER');

-- CreateEnum
CREATE TYPE "HomeworkAssessmentLevel" AS ENUM ('NOT_DONE', 'DONE', 'GOOD', 'VERY_GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "AdminMessageSender" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('SCHOOL_WIDE', 'GRADE', 'SECTION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "phone" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "signatureUrl" TEXT,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_applications" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "status" "TeacherApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedRole" "EmployeeRole" NOT NULL DEFAULT 'TEACHER',
    "clubName" TEXT,
    "clubType" TEXT,
    "passwordHash" TEXT,

    CONSTRAINT "teacher_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "userId" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clubName" TEXT,
    "clubType" TEXT,
    "employeeLoginId" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "photoUrl" TEXT,
    "teacherLoginId" TEXT NOT NULL,
    "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
    "signatureUrl" TEXT,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_years" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "homeroomTeacherId" TEXT,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "teacher_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "studentLoginId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "currentSectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "age" INTEGER NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_parent_contacts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_parent_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_shuffle_batches" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "status" "ShuffleBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balancingRules" JSONB NOT NULL,
    "selectedSectionIds" JSONB NOT NULL,

    CONSTRAINT "section_shuffle_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_shuffle_proposals" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "proposedSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_shuffle_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolYearId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "semesterId" TEXT NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_cards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "result_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "resultCardId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "grade" TEXT,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_subject_submissions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "SemesterSubjectSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semester_subject_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_subject_results" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semester_subject_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendanceBatchId" TEXT,
    "semesterId" TEXT NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "source" "HomeworkSource" NOT NULL,
    "textbookName" TEXT,
    "pageNumber" TEXT,
    "exercises" TEXT,
    "sourceNote" TEXT,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "teacherId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "semesterId" TEXT,

    CONSTRAINT "homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework_assessments" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "level" "HomeworkAssessmentLevel" NOT NULL,
    "note" TEXT,
    "assessedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_teacher_messages" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "senderRole" "MessageSender" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "student_teacher_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_admin_messages" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "handledById" TEXT,
    "senderRole" "AdminMessageSender" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "student_admin_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL DEFAULT 'SCHOOL_WIDE',
    "gradeId" TEXT,
    "sectionId" TEXT,
    "schoolYearId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherId" TEXT,
    "subjectId" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "announcementId" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "sectionId" TEXT,
    "schoolYearId" TEXT,
    "semesterId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_status_history" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "TeacherStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_batches" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clubType" TEXT,
    "leaderId" TEXT,
    "description" TEXT,
    "schoolYearId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_memberships" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isbn" TEXT,
    "category" TEXT,
    "grade" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "shelf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_copies" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "copyNo" INTEGER NOT NULL,
    "condition" TEXT,

    CONSTRAINT "book_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "bookCopyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'BORROWED',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_library_roles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_library_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_conditions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_visits" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "symptoms" TEXT,
    "treatment" TEXT,
    "medication" TEXT,
    "referral" TEXT,
    "followUpAt" TIMESTAMP(3),
    "outcome" "VisitOutcome" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "template" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "schoolName" TEXT NOT NULL DEFAULT 'Hammer Academy',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "stampUrl" TEXT,
    "directorName" TEXT NOT NULL DEFAULT '',
    "directorSignatureUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_calendar_events" (
    "id" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "SchoolCalendarEventType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isStudentClosed" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE INDEX "teacher_applications_status_idx" ON "teacher_applications"("status");

-- CreateIndex
CREATE INDEX "teacher_applications_email_idx" ON "teacher_applications"("email");

-- CreateIndex
CREATE INDEX "teacher_applications_createdAt_idx" ON "teacher_applications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeLoginId_key" ON "employees"("employeeLoginId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_userId_key" ON "teachers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_teacherLoginId_key" ON "teachers"("teacherLoginId");

-- CreateIndex
CREATE UNIQUE INDEX "school_years_label_key" ON "school_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_schoolYearId_number_key" ON "semesters"("schoolYearId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_schoolYearId_name_key" ON "semesters"("schoolYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "grades_level_key" ON "grades"("level");

-- CreateIndex
CREATE UNIQUE INDEX "sections_gradeId_label_schoolYearId_key" ON "sections"("gradeId", "label", "schoolYearId");

-- CreateIndex
CREATE UNIQUE INDEX "sections_schoolYearId_homeroomTeacherId_key" ON "sections"("schoolYearId", "homeroomTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_sectionId_subjectId_key" ON "teacher_assignments"("sectionId", "subjectId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_teacherId_idx" ON "teacher_assignment_history"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_sectionId_idx" ON "teacher_assignment_history"("sectionId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_subjectId_idx" ON "teacher_assignment_history"("subjectId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_schoolYearId_idx" ON "teacher_assignment_history"("schoolYearId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_teacherId_schoolYearId_idx" ON "teacher_assignment_history"("teacherId", "schoolYearId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_sectionId_subjectId_idx" ON "teacher_assignment_history"("sectionId", "subjectId");

-- CreateIndex
CREATE INDEX "teacher_assignment_history_sectionId_subjectId_startDate_idx" ON "teacher_assignment_history"("sectionId", "subjectId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentLoginId_key" ON "students"("studentLoginId");

-- CreateIndex
CREATE INDEX "students_currentSectionId_idx" ON "students"("currentSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_studentId_schoolYearId_key" ON "student_enrollments"("studentId", "schoolYearId");

-- CreateIndex
CREATE INDEX "student_parent_contacts_studentId_idx" ON "student_parent_contacts"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "section_shuffle_proposals_batchId_studentId_key" ON "section_shuffle_proposals"("batchId", "studentId");

-- CreateIndex
CREATE INDEX "exams_semesterId_subjectId_idx" ON "exams"("semesterId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "exams_semesterId_subjectId_name_key" ON "exams"("semesterId", "subjectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "result_cards_studentId_examId_key" ON "result_cards"("studentId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "results_resultCardId_subjectId_key" ON "results"("resultCardId", "subjectId");

-- CreateIndex
CREATE INDEX "semester_subject_submissions_teacherId_semesterId_idx" ON "semester_subject_submissions"("teacherId", "semesterId");

-- CreateIndex
CREATE INDEX "semester_subject_submissions_sectionId_semesterId_idx" ON "semester_subject_submissions"("sectionId", "semesterId");

-- CreateIndex
CREATE INDEX "semester_subject_submissions_status_idx" ON "semester_subject_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "semester_subject_submissions_sectionId_semesterId_subjectId_key" ON "semester_subject_submissions"("sectionId", "semesterId", "subjectId");

-- CreateIndex
CREATE INDEX "semester_subject_results_studentId_idx" ON "semester_subject_results"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "semester_subject_results_submissionId_studentId_key" ON "semester_subject_results"("submissionId", "studentId");

-- CreateIndex
CREATE INDEX "attendance_sectionId_date_idx" ON "attendance"("sectionId", "date");

-- CreateIndex
CREATE INDEX "attendance_semesterId_date_idx" ON "attendance"("semesterId", "date");

-- CreateIndex
CREATE INDEX "attendance_studentId_semesterId_idx" ON "attendance"("studentId", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_studentId_semesterId_date_key" ON "attendance"("studentId", "semesterId", "date");

-- CreateIndex
CREATE INDEX "homework_teacherId_idx" ON "homework"("teacherId");

-- CreateIndex
CREATE INDEX "homework_sectionId_idx" ON "homework"("sectionId");

-- CreateIndex
CREATE INDEX "homework_subjectId_idx" ON "homework"("subjectId");

-- CreateIndex
CREATE INDEX "homework_semesterId_idx" ON "homework"("semesterId");

-- CreateIndex
CREATE INDEX "homework_dueDate_idx" ON "homework"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "homework_assessments_homeworkId_studentId_key" ON "homework_assessments"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "student_teacher_messages_studentId_teacherId_createdAt_idx" ON "student_teacher_messages"("studentId", "teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "student_admin_messages_studentId_createdAt_idx" ON "student_admin_messages"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "announcements_schoolYearId_semesterId_idx" ON "announcements"("schoolYearId", "semesterId");

-- CreateIndex
CREATE INDEX "announcements_sectionId_idx" ON "announcements"("sectionId");

-- CreateIndex
CREATE INDEX "notifications_userId_channel_status_idx" ON "notifications"("userId", "channel", "status");

-- CreateIndex
CREATE INDEX "notifications_sectionId_idx" ON "notifications"("sectionId");

-- CreateIndex
CREATE INDEX "notifications_schoolYearId_semesterId_idx" ON "notifications"("schoolYearId", "semesterId");

-- CreateIndex
CREATE INDEX "notifications_announcementId_idx" ON "notifications"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "club_memberships_clubId_studentId_key" ON "club_memberships"("clubId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_bookId_copyNo_key" ON "book_copies"("bookId", "copyNo");

-- CreateIndex
CREATE INDEX "school_calendar_events_schoolYearId_startDate_idx" ON "school_calendar_events"("schoolYearId", "startDate");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignment_history" ADD CONSTRAINT "teacher_assignment_history_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignment_history" ADD CONSTRAINT "teacher_assignment_history_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignment_history" ADD CONSTRAINT "teacher_assignment_history_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignment_history" ADD CONSTRAINT "teacher_assignment_history_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignment_history" ADD CONSTRAINT "teacher_assignment_history_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parent_contacts" ADD CONSTRAINT "student_parent_contacts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_shuffle_batches" ADD CONSTRAINT "section_shuffle_batches_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_shuffle_batches" ADD CONSTRAINT "section_shuffle_batches_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_shuffle_proposals" ADD CONSTRAINT "section_shuffle_proposals_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "section_shuffle_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_shuffle_proposals" ADD CONSTRAINT "section_shuffle_proposals_proposedSectionId_fkey" FOREIGN KEY ("proposedSectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_shuffle_proposals" ADD CONSTRAINT "section_shuffle_proposals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_cards" ADD CONSTRAINT "result_cards_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_cards" ADD CONSTRAINT "result_cards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_resultCardId_fkey" FOREIGN KEY ("resultCardId") REFERENCES "result_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_submissions" ADD CONSTRAINT "semester_subject_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_submissions" ADD CONSTRAINT "semester_subject_submissions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_submissions" ADD CONSTRAINT "semester_subject_submissions_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_submissions" ADD CONSTRAINT "semester_subject_submissions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_submissions" ADD CONSTRAINT "semester_subject_submissions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_results" ADD CONSTRAINT "semester_subject_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_subject_results" ADD CONSTRAINT "semester_subject_results_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "semester_subject_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_attendanceBatchId_fkey" FOREIGN KEY ("attendanceBatchId") REFERENCES "attendance_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assessments" ADD CONSTRAINT "homework_assessments_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assessments" ADD CONSTRAINT "homework_assessments_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_assessments" ADD CONSTRAINT "homework_assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_messages" ADD CONSTRAINT "student_teacher_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teacher_messages" ADD CONSTRAINT "student_teacher_messages_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_admin_messages" ADD CONSTRAINT "student_admin_messages_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_admin_messages" ADD CONSTRAINT "student_admin_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_status_history" ADD CONSTRAINT "teacher_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_status_history" ADD CONSTRAINT "teacher_status_history_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_batches" ADD CONSTRAINT "attendance_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "book_copies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_library_roles" ADD CONSTRAINT "student_library_roles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_conditions" ADD CONSTRAINT "health_conditions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_visits" ADD CONSTRAINT "health_visits_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_visits" ADD CONSTRAINT "health_visits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_calendar_events" ADD CONSTRAINT "school_calendar_events_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
