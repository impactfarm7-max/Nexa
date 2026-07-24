import { formatNoteSur20, niveauFromNote } from "@/app/utils/oral-score-niveau";

export function extractAiJsonText(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

export function parseAiJson<T = Record<string, unknown>>(content: string): T {
  const raw = extractAiJsonText(content);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("L'IA n'a pas renvoyé un format JSON exploitable.");
  }
}

export type OralCorrectionResult = {
  note: string;
  niveau: string;
  commentaire_global: string;
  version_ideale: string;
  erreurs_identifiees: string[];
  conseils: string[];
};

export function normalizeOralCorrectionResult(raw: unknown): OralCorrectionResult {
  const data = (raw && typeof raw === "object" ? raw : {}) as Partial<OralCorrectionResult>;
  const note = formatNoteSur20(String(data.note ?? "0/20"));
  const niveau = niveauFromNote(note) ?? "A1";

  return {
    note,
    niveau,
    commentaire_global: String(data.commentaire_global ?? "Correction indisponible pour le moment."),
    version_ideale: String(data.version_ideale ?? ""),
    erreurs_identifiees: Array.isArray(data.erreurs_identifiees)
      ? data.erreurs_identifiees.map(String)
      : [],
    conseils: Array.isArray(data.conseils) ? data.conseils.map(String) : [],
  };
}
