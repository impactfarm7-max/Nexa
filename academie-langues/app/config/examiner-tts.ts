/** Voix française native (évite les bascules de langue des voix « Multilingual ») */

export const EXAMINER_VOICE = "fr-FR-HenriNeural";

export const EXAMINER_TTS_RATE = "+4%";

export const EXAMINER_TTS_PITCH = "+0Hz";



/**

 * edge   — Edge TTS en un seul bloc (fluide, qualité haute, ~0,5 s avant le début)

 * browser — Web Speech API (instantané, qualité variable selon l'OS)

 */

export type ExaminerTtsMode = "edge" | "browser";

export const EXAMINER_TTS_MODE: ExaminerTtsMode = "edge";

