import { EXAMINER_TTS_MODE, type ExaminerTtsMode } from "@/app/config/examiner-tts";

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let revealFrame: number | null = null;

let activePlayResolve: (() => void) | null = null;
let speechGeneration = 0;

function clearRevealFrame() {
  if (revealFrame !== null) {
    cancelAnimationFrame(revealFrame);
    revealFrame = null;
  }
}

function cleanupActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio.ontimeupdate = null;
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

async function fetchTtsBlob(text: string, accessToken: string): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`TTS ${res.status}`);
  }

  return res.blob();
}

function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1200, words * 380);
}

function startEstimatedTextReveal(
  fullText: string,
  durationMs: number,
  onTextReveal: (visible: string) => void,
) {
  clearRevealFrame();
  const startedAt = performance.now();

  const tick = () => {
    const ratio = Math.min(1, (performance.now() - startedAt) / durationMs);
    const visibleLength = Math.max(1, Math.ceil(fullText.length * ratio));
    onTextReveal(fullText.slice(0, visibleLength));
    if (ratio < 1) {
      revealFrame = requestAnimationFrame(tick);
    } else {
      onTextReveal(fullText);
      revealFrame = null;
    }
  };

  revealFrame = requestAnimationFrame(tick);
}

function playBlobSyncedWithText(
  blob: Blob,
  fullText: string,
  onTextReveal: (visible: string) => void,
): Promise<void> {
  const generation = speechGeneration;

  return new Promise((resolve, reject) => {
    const finish = () => {
      activePlayResolve = null;
      onTextReveal(fullText);
      cleanupActiveAudio();
      clearRevealFrame();
      resolve();
    };

    activePlayResolve = () => {
      activePlayResolve = null;
      resolve();
    };

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    activeAudio = audio;
    activeObjectUrl = url;

    const syncText = () => {
      if (generation !== speechGeneration) return;
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const ratio = Math.min(1, audio.currentTime / audio.duration);
      const visibleLength = Math.max(1, Math.ceil(fullText.length * ratio));
      onTextReveal(fullText.slice(0, visibleLength));
    };

    audio.onloadedmetadata = () => {
      if (generation !== speechGeneration) return;
      onTextReveal("");
    };

    audio.ontimeupdate = syncText;
    audio.onended = finish;

    audio.onerror = () => {
      activePlayResolve = null;
      cleanupActiveAudio();
      clearRevealFrame();
      reject(new Error("Lecture audio impossible"));
    };

    void audio.play().then(syncText).catch(reject);
  });
}

export function stopEdgeTts() {
  speechGeneration += 1;
  activePlayResolve?.();
  activePlayResolve = null;
  clearRevealFrame();
  cleanupActiveAudio();
  window.speechSynthesis?.cancel();
}

export async function readAiTextStream(
  response: Response,
  shouldAbort?: () => boolean,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Pas de stream");

  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    if (shouldAbort?.()) break;
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  return fullText;
}

export async function speakExaminerWithSyncedText(
  text: string,
  accessToken: string,
  browserVoice: SpeechSynthesisVoice | null,
  onTextReveal: (visible: string) => void,
  mode: ExaminerTtsMode = EXAMINER_TTS_MODE,
  shouldAbort?: () => boolean,
): Promise<void> {
  const clean = text.trim();
  if (!clean) {
    onTextReveal("");
    return;
  }

  stopEdgeTts();
  if (shouldAbort?.()) return;
  onTextReveal("…");

  if (mode === "browser") {
    startEstimatedTextReveal(clean, estimateSpeechMs(clean), onTextReveal);
    await speakBrowserFallback(clean, browserVoice);
    onTextReveal(clean);
    clearRevealFrame();
    return;
  }

  try {
    const blob = await fetchTtsBlob(clean, accessToken);
    if (shouldAbort?.()) return;
    await playBlobSyncedWithText(blob, clean, onTextReveal);
  } catch {
    if (shouldAbort?.()) return;
    startEstimatedTextReveal(clean, estimateSpeechMs(clean), onTextReveal);
    await speakBrowserFallback(clean, browserVoice);
    onTextReveal(clean);
    clearRevealFrame();
  }
}

export async function runExaminerSpeechFromStream(
  response: Response,
  accessToken: string,
  browserVoice: SpeechSynthesisVoice | null,
  onTextReveal: (visible: string) => void,
  shouldAbort?: () => boolean,
): Promise<void> {
  onTextReveal("…");
  const fullText = await readAiTextStream(response, shouldAbort);
  if (shouldAbort?.()) return;
  await speakExaminerWithSyncedText(
    fullText,
    accessToken,
    browserVoice,
    onTextReveal,
    EXAMINER_TTS_MODE,
    shouldAbort,
  );
}

export async function speakEdgeTts(text: string, accessToken: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;

  stopEdgeTts();
  const blob = await fetchTtsBlob(clean, accessToken);
  await playBlobSyncedWithText(blob, clean, () => {});
}

export function speakBrowserFallback(
  text: string,
  voice: SpeechSynthesisVoice | null,
): Promise<void> {
  const clean = text.trim();
  if (!clean) return Promise.resolve();

  return new Promise((resolve) => {
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "fr-FR";
    utt.rate = 0.96;
    utt.pitch = 1;
    if (voice) utt.voice = voice;
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}
