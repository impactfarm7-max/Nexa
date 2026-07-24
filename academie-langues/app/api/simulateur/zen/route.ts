import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAuthUser, checkAndConsumeQuota, logSimulatorUsage } from "@/app/utils/auth-server";

export const maxDuration = 60;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante dans les variables d'environnement.");

// ⚠️ On garde maxRetries à 0 car nous gérons les retries nous-mêmes pour l'erreur 429
const anthropic = new Anthropic({
  apiKey,
  maxRetries: 0,
  timeout: 55000, // 55s timeout avant que Next.js stoppe à 60s
});

// ✅ Méthodologie spécifique par tâche
const TASK_METHODOLOGY: Record<string, string> = {
  "1": `
    MÉTHODOLOGIE TÂCHE 1 — Message court (60–120 mots) :
    L'étudiant doit écrire un message simple (mail, invitation, annonce, demande d'information).
    
    Vérifie OBLIGATOIREMENT ces 5 points dans l'ordre :
    1. OBJET : Si c'est un mail/courriel, y a-t-il un objet AVANT la salutation ? (ex: "Objet : Invitation à mon anniversaire")
    2. SALUTATION : Présente ? Adaptée au registre ? (Bonjour/Bonsoir pour formel, Coucou pour ami)
    3. INTRODUCTION : L'étudiant explique-t-il POURQUOI il écrit ? (Je vous écris pour… / Je souhaite vous informer que…)
    4. DÉVELOPPEMENT : Donne-t-il 2 ou 3 informations clés (lieu, date, description, prix, demande) ? Utilise-t-il des connecteurs simples (d'abord, ensuite, aussi, enfin) ?
    5. CONCLUSION + SIGNATURE : Formule de politesse adaptée (Cordialement / Bises) + prénom de l'expéditeur ?
    
    REGISTRE : Évalue si le ton (formel/informel) est cohérent avec la situation demandée dans le sujet.
    LONGUEUR : Entre 60 et 120 mots. En dehors de cette plage = pénalité automatique.
  `,

  "2": `
    MÉTHODOLOGIE TÂCHE 2 — Article / message argumentatif (120–150 mots) :
    L'étudiant doit exprimer son opinion sous forme de narration/récit, en style journalistique (pyramide inversée).
    
    Vérifie OBLIGATOIREMENT ces 5 points :
    1. TITRE : Présent ? Pas plus de 8 mots ? Accrocheur et en lien avec le sujet ?
    2. INTRODUCTION : Répond-elle aux questions QUI ? QUOI ? QUAND ? OÙ ?
    3. DÉVELOPPEMENT : Répond-il à la question COMMENT ? Les faits sont-ils clairs et organisés ?
    4. RECOMMANDATION : Y a-t-il une recommandation finale (vivre la même expérience OU proposition d'amélioration) ?
    5. CONCLUSION : L'étudiant donne-t-il son opinion finale clairement ?
    
    TEMPS VERBAUX : Vérifie l'utilisation correcte des temps de la narration : Imparfait, Passé composé, Plus-que-parfait.
    CONNECTEURS : Présents et variés ? (D'abord, Ensuite, Par ailleurs, Enfin, Cependant…)
    CAS SPÉCIAL : Si le sujet demande un message/courriel, la structure Tâche 1 doit être respectée EN PLUS des règles Tâche 2.
    LONGUEUR : Entre 120 et 150 mots. En dehors = pénalité.
  `,

  "3": `
    MÉTHODOLOGIE TÂCHE 3 — Texte argumentatif (120–180 mots) :
    L'étudiant doit comparer deux points de vue (Document 1 et Document 2) et donner son opinion personnelle.

    Vérifie OBLIGATOIREMENT ces 4 points :
    1. TITRE : Présent ? Pas plus de 8 mots ? Reflète-t-il la problématique ?
    2. INTRODUCTION : Présente-t-elle la situation globale ? Y a-t-il une synthèse des deux documents/points de vue soumis ?
    3. PRISE DE POSITION PERSONNELLE : L'étudiant exprime-t-il CLAIREMENT son opinion (À mon avis… / Je pense que… / Personnellement…) ? Appuie-t-il avec des ARGUMENTS (Premièrement… De plus…) et des EXEMPLES (Par exemple…) ?
    4. CONCLUSION : Conclut-il avec une formule appropriée (Pour conclure…) et une synthèse de sa position ?

    CONNECTEURS LOGIQUES : Critère ESSENTIEL pour cette tâche. Pénalise fortement leur absence ou leur mauvaise utilisation.
    REFORMULATION : L'étudiant doit reformuler les idées des documents avec ses propres mots. Pénalise la copie directe.
    LONGUEUR : Entre 120 et 180 mots. En dehors = pénalité.

    ANALYSE PAR DOCUMENT (OBLIGATOIRE pour cette tâche) :
    - Document 1 : L'étudiant a-t-il compris et reformulé le point de vue du Document 1 ?
      Évalue : reformulation correcte (pas de copie), intégration dans l'argumentation.
    - Document 2 : Même analyse pour le Document 2.
    - Ces deux analyses doivent apparaître dans le champ "details_documents" du JSON.
  `,
};

// ✅ Extraction du numéro de tâche depuis le contexte
function extractTaskNumber(contexte: string): string {
  const match = contexte.match(/Tâche\s*([123])/i);
  return match ? match[1] : "1";
}

const MAX_INPUT_LENGTH = 50_000; // 50 KB — largement suffisant pour une production écrite

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const { message, contexte, mode } = await req.json();

    if (!message || !contexte) {
      return NextResponse.json(
        { error: "Les champs 'message' et 'contexte' sont obligatoires." },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: "Message trop long (max 50 000 caractères)." },
        { status: 413 }
      );
    }

    // Vérification du quota avant d'appeler Claude (sans consommer)
    const quotaCheck = await checkAndConsumeQuota(user.id, "zen", true);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: 429 });
    }

    const selectedModel =
      mode === "EXAMEN"
        ? "claude-sonnet-4-6"
        : "claude-haiku-4-5-20251001";

    const taskNumber = extractTaskNumber(contexte);
    const taskMethodology = TASK_METHODOLOGY[taskNumber] || TASK_METHODOLOGY["1"];

    const systemPrompt = `
Tu es l'expert mondial du TCF Canada, correcteur officiel et coach pédagogique.
Tu évalues les productions écrites des candidats selon les critères officiels du CECRL
ET selon la méthodologie précise de chaque tâche de l'épreuve d'Expression Écrite.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÉTHODOLOGIE DE LA TÂCHE À ÉVALUER :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${taskMethodology}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITÈRES D'ÉVALUATION OFFICIELS (5 piliers) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Respect de la consigne (longueur, type de texte demandé, structure imposée)
2. Correction sociolinguistique (registre de langue, formules de politesse adaptées)
3. Capacité à informer et décrire (clarté, précision des idées)
4. Cohérence et cohésion (organisation du texte, connecteurs logiques)
5. Maîtrise de la langue (vocabulaire, orthographe, grammaire, temps verbaux)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BARÈME OFFICIEL (Note /20 → Niveau CECRL) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0-3: A1 | 4-5: A2 | 6-9: B1 | 10-11: B2 | 12-13: B2+ | 14-15: C1 | 16-20: C2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TON DOUBLE RÔLE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- JUGE : Note sans complaisance selon les 5 critères + la méthodologie de la tâche.
- COACH : Explique POURQUOI chaque erreur est une faute, montre COMMENT la corriger.
  Les erreurs de structure (ex: titre manquant, conclusion absente) sont aussi importantes
  que les erreurs grammaticales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS STRICTES :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Analyse le texte en vérifiant CHAQUE point de la méthodologie de la tâche.
2. Identifie les erreurs de structure ET les erreurs linguistiques.
3. Calcule la note sur 20 en tenant compte des pénalités de longueur.
4. Renvoie UNIQUEMENT un objet JSON valide.
5. INTERDICTION FORMELLE d'utiliser des balises markdown. Commence par { et termine par }.
6. LIMITE ABSOLUE DE 1500 MOTS : Ta réponse JSON complète ne doit JAMAIS dépasser 1500 mots, quelle que soit la tâche évaluée (Tâche 1, 2 ou 3).
   Pour rester dans cette limite : maximum 3 erreurs signalées, explications en 1-2 phrases, le champ "corrections" = une seule réécriture de 3-4 phrases maximum.

STRUCTURE JSON ATTENDUE (Tâches 1 et 2) :
{
  "note": 14,
  "niveau": "C1",
  "commentaire_global": "Synthèse en 2-3 phrases maximum : points forts + faiblesses principales. Ton encourageant mais lucide.",
  "erreurs": [
    {
      "faute": "La phrase ou l'élément erroné, recopié tel quel ou décrit précisément.",
      "correction": "La version correcte ou l'élément manquant.",
      "explication": "Règle expliquée en 1 phrase simple."
    }
  ],
  "corrections": [
    "Réécriture courte de la section la plus faible du texte (2-3 phrases seulement)."
  ],
  "conseil_coach": "Conseil personnalisé en 2 phrases maximum. Une seule priorité d'entraînement claire pour le jour J."
}

STRUCTURE JSON ATTENDUE (Tâche 3 uniquement — ajoute le champ details_documents) :
{
  "note": 14,
  "niveau": "C1",
  "commentaire_global": "Synthèse en 2-3 phrases maximum : points forts + faiblesses principales.",
  "details_documents": [
    {
      "document": 1,
      "reformulation": "L'étudiant a-t-il reformulé le point de vue du Document 1 avec ses propres mots ? (oui/non + explication en 1 phrase)",
      "integration": "Comment ce point de vue est-il utilisé dans l'argumentation ? (1 phrase)"
    },
    {
      "document": 2,
      "reformulation": "L'étudiant a-t-il reformulé le point de vue du Document 2 avec ses propres mots ? (oui/non + explication en 1 phrase)",
      "integration": "Comment ce point de vue est-il utilisé dans l'argumentation ? (1 phrase)"
    }
  ],
  "erreurs": [
    {
      "faute": "La phrase ou l'élément erroné.",
      "correction": "La version correcte.",
      "explication": "Règle expliquée en 1 phrase simple."
    }
  ],
  "corrections": [
    "Réécriture courte de la section la plus faible (2-3 phrases)."
  ],
  "conseil_coach": "Conseil personnalisé en 2 phrases maximum."
}
    `;

    const userPrompt = `Sujet : "${contexte}"\n\nTexte de l'étudiant :\n"${message}"`;

    // =========================================================================
    // 🛡️ GESTION DU RATE LIMITING (429) & PROMPT CACHING
    // =========================================================================
    let response: Anthropic.Messages.Message | null = null;
    let retries = 0;
    const MAX_RETRIES = 3; // 3 tentatives en cas de surcharge

    while (retries <= MAX_RETRIES) {
      try {
        response = await anthropic.messages.create(
          {
            model: selectedModel,
            max_tokens: 2000,
            // ✅ ACTIVATION DU PROMPT CACHING POUR OPTIMISER LES COÛTS
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" }
              } as any // Empêche l'erreur TypeScript si le SDK n'est pas à jour
            ],
            messages: [{ role: "user", content: userPrompt }],
          },
          {
            // Header officiel Anthropic pour forcer l'usage du cache
            headers: { "anthropic-beta": "prompt-caching-2024-07-31" }
          }
        );
        
        break; // Succès : On sort de la boucle while

      } catch (err: any) {
        // ⚠️ Si on reçoit l'erreur 429 (Surcharge de requêtes)
        if (err.status === 429 && retries < MAX_RETRIES) {
          retries++;
          const waitTime = retries * 2500; // Attend 2.5s, 5s, 7.5s...
          console.warn(`⏳ [429 Rate Limit] Surcharge détectée. Essai ${retries}/${MAX_RETRIES} dans ${waitTime}ms...`);
          // Pause de l'exécution
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          throw err; // Autre erreur ou trop d'essais : on passe au catch principal
        }
      }
    }

    if (!response) {
      throw new Error("Impossible d'obtenir une réponse après plusieurs tentatives.");
    }

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("L'IA n'a pas renvoyé un format JSON exploitable.");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Consommer le quota uniquement après succès de Claude
    await checkAndConsumeQuota(user.id, "zen");
    logSimulatorUsage(user.id, "zen");

    return NextResponse.json(result);

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue.";
    console.error("🔥 ERREUR CRITIQUE API ANTHROPIC :", msg);

    const fallback = {
      note: 0,
      niveau: "Évaluation en attente",
      commentaire_global:
        "Le système d'analyse est actuellement saturé. Vos données sont sauvegardées.",
      erreurs: [
        {
          faute: "N/A",
          correction: "N/A",
          explication: "Connexion au serveur d'évaluation retardée.",
        },
      ],
      corrections: ["L'équipe technique optimise le réseau."],
      conseil_coach:
        "Rechargez la page dans quelques instants pour obtenir votre diagnostic complet.",
    };

    return NextResponse.json(fallback, { status: 500 });
  }
}