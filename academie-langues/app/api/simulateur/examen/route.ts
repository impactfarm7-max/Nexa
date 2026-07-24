import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkSubscription, checkAndConsumeQuota, logSimulatorUsage } from "@/app/utils/auth-server";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  timeout: 55000, // 55s timeout avant que Next.js stoppe à 60s
});

const MAX_INPUT_LENGTH = 50_000;

export async function POST(req: Request) {
  const { user, error, status } = await checkSubscription(req);
  if (!user) return NextResponse.json({ error }, { status });

  try {
    const { message, etudiantId, email } = await req.json();

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Le contenu de l'examen est manquant." },
        { status: 400 },
      );
    }

    if (message.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: "Message trop long (max 50 000 caractères)." },
        { status: 413 }
      );
    }

    // Vérification du quota avant d'appeler Claude (sans consommer)
    const quotaCheck = await checkAndConsumeQuota(user.id, "examen", true);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: 429 });
    }

    const systemPrompt = `
      Tu es un examinateur officiel du TCF Canada, reconnu pour ta rigueur et ta capacité
      à faire progresser les candidats. Tu notes avec une honnêteté absolue, mais chaque
      retour que tu donnes est une leçon concrète, pas une punition.

      TON DOUBLE RÔLE :
      - JUGE : Tu évalues sans complaisance selon les critères officiels.
      - COACH : Chaque erreur identifiée est accompagnée d'une explication claire
        et d'un exemple corrigé, pour que l'étudiant comprenne POURQUOI c'est faux
        et comment l'écrire correctement.

      CRITÈRES D'ÉVALUATION OFFICIELS (5 piliers) :
      1. Respect de la consigne (longueur et adéquation au sujet).
      2. Correction sociolinguistique (tutoiement/vouvoiement, ton adapté au destinataire).
      3. Capacité à informer et décrire (clarté et pertinence des idées développées).
      4. Cohérence et cohésion (progression logique, connecteurs, ponctuation).
      5. Maîtrise de la langue (richesse lexicale, orthographe, syntaxe).

      📏 BARÈME OFFICIEL (Note globale /20 → Niveau CECRL) :
      0-3: A1 | 4-5: A2 | 6-9: B1 | 10-11: B2 | 12-13: B2+ | 14-15: C1 | 16-20: C2

      RÈGLES DE PONDÉRATION :
      - Tâche 1 (message court)    : pondération légère
      - Tâche 2 (lettre formelle)  : pondération moyenne
      - Tâche 3 (texte argumenté)  : pondération forte (compte le plus)
      - La note globale reflète cette hiérarchie.

      ANALYSE DOCUMENTS POUR LA TÂCHE 3 (OBLIGATOIRE) :
      La Tâche 3 est basée sur deux documents (Document 1 et Document 2).
      Dans details_taches pour la tâche 3, tu dois OBLIGATOIREMENT ajouter un champ
      "details_documents" contenant pour chaque document :
      - "document" : numéro (1 ou 2)
      - "reformulation" : L'étudiant a-t-il reformulé avec ses propres mots ? (1 phrase)
      - "integration" : Comment a-t-il utilisé ce document dans son argumentation ? (1 phrase)

      LIMITE ABSOLUE DE TAILLE DE RÉPONSE :
      Ta réponse JSON complète ne doit JAMAIS dépasser 2500 mots.
      Pour respecter cette limite :
      - "commentaire_global" : 2-3 phrases maximum.
      - "details_taches" : "conseil" en 2 phrases max par tâche, "points_forts" en 1 phrase.
      - "erreurs" : maximum 3 erreurs signalées, explication en 1 phrase simple chacune.
      - "ameliorations" : 3 astuces courtes, 1 phrase chacune.
      - "conseil_coach" : 2 phrases maximum, 1 seule priorité claire.
      
      Si tu dois choisir entre exhaustivité et respect de cette limite, respecte TOUJOURS la limite.

      RÈGLES DE FORMAT — IMPÉRATIVES :
      - Renvoie UNIQUEMENT un objet JSON valide.
      - INTERDICTION FORMELLE d'utiliser des balises markdown (pas de \`\`\`json).
      - Commence directement par { et termine par }.
      - Les champs texte ne doivent JAMAIS contenir de guillemets doubles ("). 
      Utilise des guillemets simples (') à la place si nécessaire. 
      STRUCTURE JSON ATTENDUE :
      {
        "note": "Note Globale/20",
        "niveau": "Niveau Global CECRL (ex: B2)",
        "commentaire_global": "Synthèse équilibrée : points forts reconnus + axes prioritaires. Ton encourageant mais lucide.",
        "details_taches": [
          {
            "tache": 1,
            "note": "Note/20",
            "points_forts": "Ce qui fonctionne bien dans cette tâche.",
            "conseil": "Ce qui doit changer, avec un exemple concret corrigé."
          },
          {
            "tache": 2,
            "note": "Note/20",
            "points_forts": "Ce qui fonctionne bien dans cette tâche.",
            "conseil": "Ce qui doit changer, avec un exemple concret corrigé."
          },
          {
            "tache": 3,
            "note": "Note/20",
            "points_forts": "Ce qui fonctionne bien dans cette tâche.",
            "conseil": "Ce qui doit changer, avec un exemple concret corrigé.",
            "details_documents": [
              {
                "document": 1,
                "reformulation": "L'étudiant a-t-il reformulé le Doc 1 avec ses propres mots ? (1 phrase)",
                "integration": "Comment ce document est-il utilisé dans l'argumentation ? (1 phrase)"
              },
              {
                "document": 2,
                "reformulation": "L'étudiant a-t-il reformulé le Doc 2 avec ses propres mots ? (1 phrase)",
                "integration": "Comment ce document est-il utilisé dans l'argumentation ? (1 phrase)"
              }
            ]
          }
        ],
        "erreurs": [
          {
            "faute": "La phrase ou le mot erroné, recopié tel quel.",
            "correction": "La version correcte.",
            "explication": "Règle grammaticale ou stylistique expliquée simplement."
          }
        ],
        "ameliorations": [
          "Astuce concrète 1 (ex: technique pour structurer une argumentation)",
          "Astuce concrète 2 (ex: connecteurs logiques à mémoriser)",
          "Astuce concrète 3 (ex: formules de politesse adaptées au TCF)"
        ],
        "conseil_coach": "Message final motivant, personnalisé selon le niveau détecté. Donne une priorité d'entraînement claire pour les semaines à venir."
      }
    `;

    const userPrompt = `
      L'étudiant vient de soumettre son EXAMEN COMPLET (Tâches 1, 2 et 3 d'expression écrite).
      Évalue sa production avec rigueur et bienveillance pédagogique.

      CONTENU DE L'EXAMEN :
      "${message}"
    `;

    // =========================================================================
    // 🛡️ GESTION DU RATE LIMITING (429) & PROMPT CACHING
    // =========================================================================
    let response: Anthropic.Messages.Message | null = null;
    let retries = 0;
    const MAX_RETRIES = 3; // On essaie jusqu'à 3 fois si le serveur est surchargé

    while (retries <= MAX_RETRIES) {
      try {
        response = await anthropic.messages.create(
          // 1er argument : Le contenu du message
          {
            model: MODEL,
            max_tokens: 4000,
            // ✅ ACTIVATION DU PROMPT CACHING
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" }
              } as any // <-- Astuce TypeScript : empêche le soulignement rouge si ton SDK n'est pas à jour
            ],
            messages: [{ role: "user", content: userPrompt }],
          },
          // 2ème argument : Les options réseau (C'est ici que va le header Bêta !)
          {
            headers: { "anthropic-beta": "prompt-caching-2024-07-31" }
          }
        );
        
        break; // Succès ! On sort de la boucle while.
        break; // Succès ! On sort de la boucle while.

      } catch (err: any) {
        // ⚠️ Si on reçoit l'erreur 429 (Surcharge de tes 500 étudiants)
        if (err.status === 429 && retries < MAX_RETRIES) {
          retries++;
          const waitTime = retries * 2500; // On attend 2.5s, puis 5s, puis 7.5s...
          console.warn(`⏳ [429 Rate Limit] Surcharge API détectée. Nouvel essai ${retries}/${MAX_RETRIES} dans ${waitTime}ms...`);
          // On met le code en pause avant de réessayer
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          // Si ce n'est pas une erreur 429 (ex: clé API invalide) ou qu'on a dépassé les 3 essais, on déclenche le catch principal
          throw err;
        }
      }
    }

    // Sécurité au cas où la réponse serait toujours nulle
    if (!response) {
      throw new Error("Impossible d'obtenir une réponse de l'API après plusieurs essais.");
    }

    const responseContent = response.content[0];
    const textContent =
      responseContent.type === "text" ? responseContent.text : "";

    try {
      const clean = textContent
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON introuvable dans la réponse.");
      const result = JSON.parse(jsonMatch[0]);

      // Consommer le quota uniquement après succès de Claude
      await checkAndConsumeQuota(user.id, "examen");
      logSimulatorUsage(user.id, "examen");

      return NextResponse.json({ reply: JSON.stringify(result) });
    } catch (parseError) {
      console.error(
        "🔥 Parse error:",
        parseError,
        "Raw:",
        textContent.slice(0, 200),
      );
      throw parseError;
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue.";
    console.error("🔥 ERREUR CRITIQUE NEXA Examen Engine :", msg);

    const fallback = {
      note: "En attente",
      niveau: "Calcul...",
      commentaire_global:
        "L'analyse a pris trop de temps. L'afflux d'étudiants est élevé, veuillez soumettre à nouveau vos réponses.",
      details_taches: [
        { tache: 1, note: "--", points_forts: "N/A", conseil: "N/A" },
        { tache: 2, note: "--", points_forts: "N/A", conseil: "N/A" },
        { tache: 3, note: "--", points_forts: "N/A", conseil: "N/A" },
      ],
      erreurs: [
        {
          faute: "N/A",
          correction: "N/A",
          explication: "Erreur de communication temporaire avec le simulateur.",
        },
      ],
      ameliorations: ["Rechargez la page et réessayez dans quelques secondes."],
      conseil_coach:
        "Ne vous découragez pas ! Soumettez à nouveau votre examen.",
    };

    return NextResponse.json(
      { reply: JSON.stringify(fallback) },
      { status: 500 },
    );
  }
}