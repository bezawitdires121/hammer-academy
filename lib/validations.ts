import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

export const createTeacherSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(9).max(15).optional().transform((p) => (p ? normalizePhone(p) : p)),
});



export const createClassSchema = z.object({
  name: z.string().min(1).max(50),
  grade: z.number().int().min(1).max(5),
  teacherId: z.string().optional(),
});

export const createStudentSchema = z.object({
    fullName: z.string().min(2).max(100),
    sectionId: z.string().min(1),
    gender: z.enum(["MALE", "FEMALE"]),
    age: z.coerce.number().int().min(1).max(100),
    dateOfBirth: z.coerce.date(),
    parentFullName: z.string().min(2).max(100),
    parentPhone: z.string().min(9).max(15).transform((p) => normalizePhone(p)),
    parentRelationship: z.string().min(2).max(50),
    parentEmail: z.string().email().optional(),
  });
export const createResultSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  examId: z.string().min(1),
  marksObtained: z.number().min(0),
  maxMarks: z.number().min(1).default(100),
});
export const createAnnouncementSchema = z.object({
  title: z.string().min(2).max(150),
  body: z.string().min(2).max(2000),
  scope: z.enum(["SCHOOL_WIDE", "GRADE", "SECTION"]),
  classId: z.string().optional(),
  grade: z.number().int().min(0).max(8).optional(),
  schoolYearId: z.string().min(1),
  semesterId: z.string().min(1),
  priority: z.boolean().default(false),
});
export const createIssueSchema = z.object({
  message: z.string().min(5).max(1000),
});

export const respondToIssueSchema = z.object({
  issueId: z.string().min(1),
  message: z.string().min(2).max(1000),
});
export const requestResetSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
export const editStudentSchema = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(2).max(100),
  sectionId: z.string().min(1),
});

export const editClassSchema = z.object({
  classId: z.string().min(1),
  name: z.string().min(1).max(50),
  grade: z.number().int().min(1).max(5),
});

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});
export const submitResultCardSchema = z.object({
  studentId: z.string().min(1),
  examId: z.string().min(1),
  remarks: z.string().max(1000).optional(),
  subjectMarks: z.array(
    z.object({
      subjectId: z.string().min(1),
      marksObtained: z.number().min(0),
      maxMarks: z.number().min(1),
    })
  ).min(1),
});
export const teacherApplicationSchema = z.object({
  fullName: z
    .string()
    .min(2, "Please enter your full name.")
    .max(100),

  email: z
    .string()
    .email("Please enter a valid email."),

  phone: z
    .string()
    .min(9, "Please enter a valid phone number.")
    .max(15, "Please enter a valid phone number.")
    .transform(normalizePhone)
    .optional(),
  requestedRole: z.enum(["TEACHER","CLEANER","SECURITY","SECRETARY","LIBRARIAN","HEALTH","OTHER"]).optional(),
});

export const acceptApplicationSchema = z.object({
  applicationId: z.string().min(1),
  password: z.string().min(8).max(72),
});

export const rejectApplicationSchema = z.object({
  applicationId: z.string().min(1),
  reason: z.string().min(2).max(500),
});




