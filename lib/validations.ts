import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

export const createTeacherSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(9).max(15).optional().transform((p) => (p ? normalizePhone(p) : p)),
  password: z.string().min(8).max(72),
});

export const createParentSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(9).max(15).transform(normalizePhone),
  password: z.string().min(8).max(72),
});

export const createClassSchema = z.object({
  name: z.string().min(1).max(50),
  grade: z.number().int().min(1).max(5),
  teacherId: z.string().optional(),
});

export const createStudentSchema = z.object({
  fullName: z.string().min(2).max(100),
  admissionNo: z.string().min(1).max(30),
  classId: z.string().min(1),
  parentId: z.string().min(1),
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
  scope: z.enum(["SCHOOL_WIDE", "GRADE", "CLASS"]),
  classId: z.string().optional(),
  grade: z.number().int().min(1).max(5).optional(),
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
  admissionNo: z.string().min(1).max(30),
  classId: z.string().min(1),
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