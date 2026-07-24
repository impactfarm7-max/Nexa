export type SubmissionFormat = "text" | "file" | "audio" | "video";

export const ALL_SUBMISSION_FORMATS: SubmissionFormat[] = ["text", "file", "audio", "video"];

export const SUBMISSION_FORMAT_LABELS: Record<SubmissionFormat, string> = {
  text: "Texte",
  file: "Fichier (PDF, image…)",
  audio: "Audio",
  video: "Vidéo",
};

const ALLOWED = new Set<string>(ALL_SUBMISSION_FORMATS);

/** Normalise les formats ; si vide / absent → tous autorisés (rétrocompat). */
export function normalizeSubmissionFormats(raw: unknown): SubmissionFormat[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...ALL_SUBMISSION_FORMATS];
  const cleaned = [...new Set(raw.map(String).filter((f) => ALLOWED.has(f)))] as SubmissionFormat[];
  return cleaned.length > 0 ? cleaned : [...ALL_SUBMISSION_FORMATS];
}

export function allowsFormat(formats: SubmissionFormat[], format: SubmissionFormat): boolean {
  return formats.includes(format);
}

/** Classe un fichier joint dans un format autorisé. */
export function detectFileSubmissionFormat(file: {
  type?: string | null;
  name?: string | null;
}): "file" | "audio" | "video" {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(name)) return "audio";
  if (type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi)$/i.test(name)) {
    // webm peut être audio-only : si type audio déjà géré au-dessus
    if (type.startsWith("audio/")) return "audio";
    return "video";
  }
  return "file";
}
