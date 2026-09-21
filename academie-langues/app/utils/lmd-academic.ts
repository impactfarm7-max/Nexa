export type AcademicCase = {
  degree: "licence" | "master" | "doctorat";
  thesisTitle: string;
  supervisor: string;
  milestones: { title: string; date: string; report: string; completed: boolean }[];
  defenseDate: string;
  jury: string;
  juryDecision: "pending" | "accepted" | "revisions" | "rejected";
  minutes: string;
};
export const emptyAcademicCase: AcademicCase = { degree: "licence", thesisTitle: "", supervisor: "", milestones: [], defenseDate: "", jury: "", juryDecision: "pending", minutes: "" };

export function parseAcademicCase(raw: unknown): AcademicCase {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Dossier invalide.");
  const r = raw as Record<string, unknown>;
  const text = (value: unknown, max: number) => {
    if (typeof value !== "string" || value.length > max) throw new Error("Champ invalide ou trop long.");
    return value.trim();
  };
  const date = (value: unknown) => {
    const result = text(value, 10);
    if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || new Date(result).toISOString().slice(0, 10) !== result)) throw new Error("Date invalide.");
    return result;
  };
  if (!["licence", "master", "doctorat"].includes(String(r.degree)) || !["pending", "accepted", "revisions", "rejected"].includes(String(r.juryDecision))) throw new Error("Diplôme ou décision invalide.");
  if (!Array.isArray(r.milestones) || r.milestones.length > 50) throw new Error("50 étapes maximum.");
  return {
    degree: r.degree as AcademicCase["degree"], thesisTitle: text(r.thesisTitle, 500), supervisor: text(r.supervisor, 300),
    defenseDate: date(r.defenseDate), jury: text(r.jury, 2000), juryDecision: r.juryDecision as AcademicCase["juryDecision"], minutes: text(r.minutes, 10000),
    milestones: r.milestones.map(m => {
      if (!m || typeof m !== "object" || typeof m.completed !== "boolean") throw new Error("Étape invalide.");
      return { title: text(m.title, 300), date: date(m.date), report: text(m.report, 3000), completed: m.completed };
    }),
  };
}

export function diplomaBlockers(record: AcademicCase, progress: { complete: boolean; results: unknown[] }, today: string) {
  const reasons: string[] = [];
  if (!progress.complete && !(record.degree === "doctorat" && progress.results.length === 0)) reasons.push("Toutes les UE du parcours doivent être validées.");
  if (record.degree === "doctorat") {
    if (!record.thesisTitle || !record.supervisor) reasons.push("Renseignez le sujet et le directeur de thèse.");
    if (!record.milestones.length || record.milestones.some(m => !m.completed || !m.title || !m.report || !m.date || m.date > today)) reasons.push("Terminez et documentez les étapes de suivi.");
    if (!record.defenseDate || record.defenseDate > today) reasons.push("La soutenance doit avoir eu lieu.");
    if (!record.jury || !record.minutes || record.juryDecision !== "accepted") reasons.push("La décision favorable du jury et le procès-verbal sont requis.");
  }
  return reasons;
}
