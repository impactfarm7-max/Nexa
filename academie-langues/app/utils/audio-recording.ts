export const MIN_RECORDING_BYTES = 800;

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/ogg")) return "audio/ogg";
  return "audio/webm";
}

export function recordingFilenameForMime(mime: string): string {
  if (mime.includes("mp4")) return "recording.mp4";
  if (mime.includes("ogg")) return "recording.ogg";
  return "recording.webm";
}

export async function transcribeRecordingBlob(
  audioBlob: Blob,
  mimeType: string,
  accessToken: string,
): Promise<{ ok: true; transcript: string } | { ok: false; error: string }> {
  if (audioBlob.size < MIN_RECORDING_BYTES) {
    return {
      ok: false,
      error: "Enregistrement trop court. Parlez au moins une seconde.",
    };
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, recordingFilenameForMime(mimeType));

  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  const data = (await res.json().catch(() => null)) as
    | { transcript?: string; error?: string }
    | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? "Erreur de transcription. Réessayez.",
    };
  }

  return { ok: true, transcript: data?.transcript ?? "" };
}
