export function text(value: unknown, max = 100): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
export function schoolYear(value: unknown): value is string { return typeof value === "string" && /^20\d{2}-20\d{2}$/.test(value) && Number(value.slice(5)) === Number(value.slice(0,4))+1; }
export function profileInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string,unknown>;
  if (!text(v.firstName) || !text(v.lastName) || !text(v.country,80) || !schoolYear(v.schoolYear)) return null;
  return { firstName: v.firstName.trim(), lastName: v.lastName.trim(), country: v.country.trim(), schoolYear: v.schoolYear };
}
export function classInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string,unknown>;
  if (!text(v.name) || !["CM1","CM2"].includes(String(v.level)) || !text(v.country,80) || !schoolYear(v.schoolYear)) return null;
  return { name: v.name.trim(), level: String(v.level), country: v.country.trim(), schoolYear: v.schoolYear };
}
