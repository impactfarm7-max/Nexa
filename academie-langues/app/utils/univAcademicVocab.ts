/** Libellés académiques staff — centres université uniquement. */

export type CourseFormat = "cm" | "td" | "tp";

export function isUniversiteCenter(centerType: string | null | undefined): boolean {
  return centerType === "universite";
}

export function normalizeCourseFormat(v: unknown): CourseFormat | null {
  if (v === "cm" || v === "td" || v === "tp") return v;
  return null;
}

export function courseFormatLabel(fmt: string | null | undefined): string | null {
  if (fmt === "cm" || fmt === "td" || fmt === "tp") return fmt.toUpperCase();
  return null;
}

export function formatUeDisplayName(
  name: string,
  courseFormat?: string | null,
): string {
  const tag = courseFormatLabel(courseFormat);
  return tag ? `${name} · ${tag}` : name;
}
