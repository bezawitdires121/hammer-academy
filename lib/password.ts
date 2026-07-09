import bcrypt from "bcryptjs";

// 12 rounds is the current industry-standard baseline for bcrypt in 2026 —
// high enough to resist brute force, low enough to not slow down real logins
const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}