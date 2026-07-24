export type QuestionCO = {
  id: number;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  points: number;
  image?: string;
  audio: string;
  instruction: string;
  options: { label: "A" | "B" | "C" | "D"; text?: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
};

export const buildPlaceholders = (serieId: number): QuestionCO[] =>
  Array.from({ length: 39 }, (_, i) => {
    const n = i + 1;
    const level: QuestionCO["level"] =
      n <= 4 ? "A1" : n <= 10 ? "A2" : n <= 19 ? "B1" : n <= 29 ? "B2" : n <= 35 ? "C1" : "C2";
    const points = n <= 4 ? 3 : n <= 10 ? 9 : n <= 19 ? 15 : n <= 29 ? 21 : n <= 35 ? 26 : 33;
    return {
      id: n,
      level,
      points,
      audio: `/audio/co/serie${serieId}/${n}.mp3`,
      instruction: "Écoutez et choisissez la bonne réponse.",
      options: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
      correctAnswer: "A",
    };
  });
