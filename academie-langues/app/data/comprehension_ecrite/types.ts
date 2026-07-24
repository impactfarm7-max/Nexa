export interface QuestionCE {
  id: number;
  niveau: string;
  texte: string;
  question: string;
  options: string[];
  reponseCorrecte: number;
  explication: string;
}

export interface SerieCE {
  id: number;
  titre: string;
  isPremium: boolean;
  questions: QuestionCE[];
}
