import {
  isTcfCanadaCenter,
  usesTcfLikeStaffShell,
} from "@/app/data/center-types";

/** Libellé badge / fallback titre — centres libres ≠ coaching TCF. */
export function collectiveKindLabel(
  centerType: string | null | undefined,
  kind: "live" | "group",
  mode?: string | null,
): string {
  if (kind === "live") return "Session Live";
  if (usesTcfLikeStaffShell(centerType) || isTcfCanadaCenter(centerType)) {
    return "Coaching de groupe";
  }
  return mode === "en_ligne" ? "Cours en ligne" : "Séance";
}

export function collectiveTitleFallback(
  centerType: string | null | undefined,
  kind: "live" | "group",
  mode?: string | null,
): string {
  return collectiveKindLabel(centerType, kind, mode);
}
