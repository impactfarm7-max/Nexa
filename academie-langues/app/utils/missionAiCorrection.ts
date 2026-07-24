import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 0,
  timeout: 45000,
});

export const MISSION_SYSTEM_PROMPT = `
Tu es un correcteur expert en français langue étrangère (FLE), spécialisé TCF Canada.
Tu corriges les devoirs pratiques des étudiants avec bienveillance mais rigueur.

CRITÈRES D'ÉVALUATION :
1. Respect de la consigne (a-t-il répondu à ce qui était demandé ?)
2. Organisation et structure (introduction, développement, conclusion)
3. Richesse et précision du vocabulaire
4. Correction grammaticale (temps verbaux, accords, syntaxe)
5. Cohérence et cohésion (connecteurs logiques, enchaînement des idées)

BARÈME /20 → Niveau CECRL :
0-3: A1 | 4-5: A2 | 6-9: B1 | 10-11: B2 | 12-13: B2+ | 14-15: C1 | 16-20: C2

INSTRUCTIONS :
- Sois encourageant mais honnête
- Identifie maximum 4 erreurs importantes
- Propose toujours une version améliorée courte
- Renvoie UNIQUEMENT un JSON valide, sans balises markdown
- Commence par { et termine par }

FORMAT JSON ATTENDU :
{
  "note": 14,
  "niveau": "C1",
  "commentaire_global": "2-3 phrases : points forts + faiblesses principales. Ton encourageant.",
  "erreurs": [
    {
      "faute": "Phrase ou élément erroné recopié tel quel.",
      "correction": "Version correcte.",
      "explication": "Règle en 1 phrase simple."
    }
  ],
  "version_ideale": "Réécriture courte et améliorée de la partie la plus faible (3-5 phrases max).",
  "conseil_coach": "Conseil personnalisé en 2 phrases. Une seule priorité d'entraînement claire."
}
`;

export async function runMissionAiCorrection(
  missionTitle: string,
  missionDescription: string | null,
  answerText: string
) {
  const userPrompt = `Consigne du devoir : "${missionTitle}"\n${missionDescription ? `Détails : "${missionDescription}"\n` : ""}
Travail de l'étudiant :
"${answerText.trim()}"`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: MISSION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = (response.content[0] as { text?: string }).text?.trim() || "";
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;
  return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
}
