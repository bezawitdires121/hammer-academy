"use server";

import { checkLoginRateLimit } from "@/lib/rate-limit";

export async function checkRateLimit(email: string) {
  const allowed = await checkLoginRateLimit(email);
  return { allowed };
}