// Single source of truth for phone number formatting across the whole app.
// Always store and compare phone numbers in this normalized form:
// 251XXXXXXXXX (country code, no +, no leading 0, no spaces/dashes).
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = "251" + digits.slice(1);
  if (!digits.startsWith("251")) digits = "251" + digits;
  return digits;
}