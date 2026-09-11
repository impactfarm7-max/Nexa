import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { generateCertificate } from "@/app/utils/certificate.server";
import { assertCanStartExam } from "@/app/utils/tcfExamEligibility";
import { examensComplets } from "@/app/data/examens_complets";
import { catalogueSeriesCE } from "@/app/data/comprehension_ecrite";
import { seriesData } from "@/app/data/comprehension_orale";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Durée officielle totale de l'Examen Complet TCF Canada (4 épreuves
// d'affilée, un seul chrono continu -- correspond à TOTAL_TIME dans
// TunnelExamenComplet.tsx). currentStep ne fait QUE naviguer entre les
// écrans, il ne réinitialise jamais ce chrono.
// ─────────────────────────────────────────────────────────────────────────────
const TOTAL_DURATION_SEC = 9900; // 2h45

// ─────────────────────────────────────────────────────────────────────────────
// Scores CE/CO recalculés côté serveur à partir des réponses sauvegardées --
// jamais depuis le body envoyé par le client (c'était la faille : un score
// falsifié directement dans le body produisait un certificat mensonger).
// ─────────────────────────────────────────────────────────────────────────────
const CE_POINTS: Record<string, number> = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 };
const CE_TOTAL = 699;

function getCELevel(score: number): string {
  if (score >= 600) return "C2";
  if (score >= 500) return "C1";
  if (score >= 400) return "B2";
  if (score >= 300) return "B1";
  if (score >= 200) return "A2";
  return "A1";
}

function getCOLevel(score: number, total: number): string {
  const p = total > 0 ? score / total : 0;
  if (p >= 0.9) return "C2";
  if (p >= 0.75) return "C1";
  if (p >= 0.6) return "B2";
  if (p >= 0.45) return "B1";
  if (p >= 0.3) return "A2";
  return "A1";
}

function computeCeCoResults(examenId: number, ceAnswers: Record<number, number> | null, coAnswers: Record<number, string> | null) {
  const config = examensComplets.find((e) => e.id === examenId);
  const questionsCE = config ? catalogueSeriesCE.find((s) => s.id === config.sujet_ce)?.questions ?? [] : [];
  const questionsCO = config ? seriesData[config.sujet_co] ?? [] : [];

  const ce = ceAnswers || {};
  const scoreCE = questionsCE.reduce((acc, q, i) => acc + (ce[i] === q.reponseCorrecte ? (CE_POINTS[q.niveau] ?? 3) : 0), 0);
  const correctCE = questionsCE.filter((q, i) => ce[i] === q.reponseCorrecte).length;

  const co = coAnswers || {};
  const scoreCO = questionsCO.reduce((acc, q, i) => acc + (co[i] === q.correctAnswer ? q.points : 0), 0);
  const totalCO = questionsCO.reduce((acc, q) => acc + q.points, 0);
  const correctCO = questionsCO.filter((q, i) => co[i] === q.correctAnswer).length;

  return {
    ceResult: { score: scoreCE, total: CE_TOTAL, niveau: getCELevel(scoreCE), correctCount: correctCE },
    coResult: { score: scoreCO, total: totalCO, niveau: getCOLevel(scoreCO, totalCO), correctCount: correctCO },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/exam-session?examenId=N
// Renvoie la session 'in_progress' active pour cet user + examen, ou null.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const url = new URL(req.url);
  const examenIdRaw = url.searchParams.get("examenId");
  if (!examenIdRaw) return NextResponse.json({ error: "examenId requis." }, { status: 400 });
  const examenId = parseInt(examenIdRaw, 10);
  if (!Number.isFinite(examenId)) return NextResponse.json({ error: "examenId invalide." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("exam_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("examen_id", examenId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalcule le temps restant AUTORITAIRE avant de renvoyer la session,
  // pour que la page restaurée affiche d'emblée la vraie valeur (et pas
  // l'ancien time_left potentiellement périmé depuis la dernière sauvegarde).
  if (data && data.status === "in_progress") {
    const elapsedSec = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
    data.time_left = Math.max(0, TOTAL_DURATION_SEC - elapsedSec);
  }

  return NextResponse.json({ session: data });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/exam-session
// Body : { action, ...payload }
// Actions : init | save | correct-ee | correct-eo | finalize | abandon
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  // ── INIT : creer une nouvelle session (ou renvoyer l'existante)
  if (action === "init") {
    const examenId = parseInt(body?.examenId, 10);
    if (!Number.isFinite(examenId)) {
      return NextResponse.json({ error: "examenId requis." }, { status: 400 });
    }

    const access = await assertCanStartExam(supabaseAdmin, user.id, examenId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error || "Accès refusé." }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from("exam_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("examen_id", examenId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (existing) {
      const elapsedSec = Math.floor((Date.now() - new Date(existing.started_at).getTime()) / 1000);
      existing.time_left = Math.max(0, TOTAL_DURATION_SEC - elapsedSec);
      return NextResponse.json({ session: existing });
    }

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      examen_id: examenId,
      time_left: TOTAL_DURATION_SEC,
    };
    if (access.centerId) insertPayload.center_id = access.centerId;
    if (access.assignmentId) insertPayload.assignment_id = access.assignmentId;
    insertPayload.counts_toward_quota = access.countsTowardQuota !== false;

    const { data, error } = await supabaseAdmin
      .from("exam_sessions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (access.assignmentId) {
      await supabaseAdmin
        .from("tcf_exam_assignments")
        .update({ status: "started" })
        .eq("id", access.assignmentId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ session: data });
  }

  // Les actions ci-dessous necessitent un sessionId
  const sessionId = String(body?.sessionId || "");
  if (!sessionId) return NextResponse.json({ error: "sessionId requis." }, { status: 400 });

  // Verifie que la session appartient bien a l'utilisateur
  const { data: session } = await supabaseAdmin
    .from("exam_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  // ── SAVE : autosave progress (reponses + step + chrono)
  if (action === "save") {
    const updates: Record<string, any> = {};

    if (body.currentStep !== undefined) updates.current_step = Number(body.currentStep);
    if (body.ceAnswers !== undefined) updates.ce_answers = body.ceAnswers;
    if (body.coAnswers !== undefined) updates.co_answers = body.coAnswers;
    if (body.eeAnswers !== undefined) updates.ee_answers = body.eeAnswers;
    if (body.eoData !== undefined) updates.eo_data = body.eoData;
    // ce_result/co_result ne sont plus acceptés du client ici : ils sont
    // recalculés côté serveur au moment du finalize, à partir des réponses.

    // Temps restant TOUJOURS recalculé par le serveur à partir de
    // started_at -- le body.timeLeft envoyé par le client est ignoré.
    // C'était la faille : avant, on lui faisait confiance tel quel.
    const elapsedSec = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    const authoritativeTimeLeft = Math.max(0, TOTAL_DURATION_SEC - elapsedSec);
    updates.time_left = authoritativeTimeLeft;

    const { error } = await supabaseAdmin
      .from("exam_sessions")
      .update(updates)
      .eq("id", sessionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Le client doit utiliser CETTE valeur pour corriger son affichage --
    // et déclencher la soumission forcée si elle atteint 0.
    return NextResponse.json({ ok: true, timeLeft: authoritativeTimeLeft });
  }

  // ── CORRECT-EE : lance la correction IA en background (asynchrone)
  if (action === "correct-ee") {
    if (session.ee_correction_status === "running" || session.ee_correction_status === "done") {
      return NextResponse.json({ status: session.ee_correction_status });
    }
    const eeAnswers = body.eeAnswers ?? session.ee_answers;
    const sujetEE = body.sujetEE;
    if (!eeAnswers || !sujetEE) {
      return NextResponse.json({ error: "Reponses ou sujet EE manquant." }, { status: 400 });
    }

    await supabaseAdmin
      .from("exam_sessions")
      .update({ ee_correction_status: "running", ee_answers: eeAnswers })
      .eq("id", sessionId);

    // Fire-and-forget : on lance la correction sans attendre la fin
    void runEECorrection(sessionId, eeAnswers, sujetEE, req.headers.get("Authorization") || "");
    return NextResponse.json({ status: "running" });
  }

  // ── CORRECT-EO : lance les 3 corrections oral en background
  if (action === "correct-eo") {
    if (session.eo_correction_status === "running" || session.eo_correction_status === "done") {
      return NextResponse.json({ status: session.eo_correction_status });
    }
    const eoData = body.eoData ?? session.eo_data;
    const sujetEO = body.sujetEO;
    if (!eoData || !sujetEO) {
      return NextResponse.json({ error: "Donnees ou sujet EO manquant." }, { status: 400 });
    }

    await supabaseAdmin
      .from("exam_sessions")
      .update({ eo_correction_status: "running", eo_data: eoData })
      .eq("id", sessionId);

    void runEOCorrection(sessionId, eoData, sujetEO, req.headers.get("Authorization") || "");
    return NextResponse.json({ status: "running" });
  }

  // ── FINALIZE : marque la session comme completed
  if (action === "finalize") {
    // CE/CO recalculés côté serveur à partir des réponses déjà sauvegardées
    // (session.ce_answers/co_answers) -- jamais depuis body.ceResult/coResult,
    // que le client ne peut plus influencer.
    const { ceResult, coResult } = computeCeCoResults(session.examen_id, session.ce_answers, session.co_answers);

    const updates: Record<string, any> = {
      status: "completed",
      finished_at: new Date().toISOString(),
      ce_result: ceResult,
      co_result: coResult,
    };

    const { error } = await supabaseAdmin
      .from("exam_sessions")
      .update(updates)
      .eq("id", sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!session.assignment_id && session.counts_toward_quota !== false) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("exam_4m_used, exam_4m_total")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && profile.exam_4m_total !== 9999) {
        await supabaseAdmin
          .from("profiles")
          .update({ exam_4m_used: (profile.exam_4m_used ?? 0) + 1 })
          .eq("id", user.id);
      }
    }

    if (session.assignment_id) {
      await supabaseAdmin
        .from("tcf_exam_assignments")
        .update({ status: "completed", exam_session_id: sessionId })
        .eq("id", session.assignment_id)
        .eq("user_id", user.id);
    }

    // Génère le certificat en arrière-plan (fire-and-forget) -- ne bloque
    // pas la réponse. Le client poll la table exam_certificates pour
    // savoir quand le PDF est prêt (voir patch TunnelExamenComplet).
    void (async () => {
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("prenom")
          .eq("id", user.id)
          .single();

        const ce = ceResult;
        const co = coResult;
        const ee = session.ee_result;
        const eo = session.eo_result;

        const sections = [
          ce ? { label: "Compréhension Écrite", score: `${ce.score}/${ce.total}`, niveau: ce.niveau } : null,
          co ? { label: "Compréhension Orale", score: `${co.score}/${co.total}`, niveau: co.niveau } : null,
          ee ? { label: "Expression Écrite", score: String(ee.note), niveau: ee.niveau } : null,
          eo ? { label: "Expression Orale", score: "Voir détail" } : null,
        ].filter(Boolean) as any[];

        await generateCertificate({
          sessionId,
          userId: user.id,
          disciplineCode: "tcf_canada",
          disciplineLabel: "TCF Canada",
          studentName: profile?.prenom || "Candidat NEXA",
          examLabel: `Examen Officiel ${String(session.examen_id).padStart(2, "0")}`,
          sections,
        });
      } catch (err) {
        console.error("[exam-session] certificate generation trigger failed:", err);
      }
    })();

    return NextResponse.json({ ok: true });
  }
  // ── ABANDON : marque comme abandonnee
  if (action === "abandon") {
    const { error } = await supabaseAdmin
      .from("exam_sessions")
      .update({ status: "abandoned", finished_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Correction EE en background : appelle /api/simulateur/examen, stocke le resultat
// ─────────────────────────────────────────────────────────────────────────────
async function runEECorrection(sessionId: string, eeAnswers: any, sujetEE: any, authHeader: string) {
  try {
    const t3 = sujetEE[3];
    const t3Fmt = t3?.document1 && t3?.document2
      ? `Consigne: ${t3.consigne}\nTitre: ${t3.titre}\nDoc 1: ${t3.document1}\nDoc 2: ${t3.document2}`
      : String(t3?.consigne || t3 || "");
    const message = `EXAMEN COMPLET\nT1: ${sujetEE[1]} -> Rep: ${eeAnswers[1]}\nT2: ${sujetEE[2]} -> Rep: ${eeAnswers[2]}\nT3: ${t3Fmt} -> Rep: ${eeAnswers[3]}`;

    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

    const res = await fetch(`${baseUrl}/api/simulateur/examen`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error(`API examen ${res.status}`);
    const data = await res.json();
    const raw = (data.reply ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(raw);

    await supabaseAdmin
      .from("exam_sessions")
      .update({ ee_result: result, ee_correction_status: "done", ee_correction_error: null })
      .eq("id", sessionId);
  } catch (err: any) {
    console.error("[exam-session] EE correction failed:", err);
    await supabaseAdmin
      .from("exam_sessions")
      .update({ ee_correction_status: "failed", ee_correction_error: err?.message || String(err) })
      .eq("id", sessionId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Correction EO en background : 3 appels paralleles a /api/simulateur/oral
// ─────────────────────────────────────────────────────────────────────────────
async function runEOCorrection(sessionId: string, eoData: any, sujetEO: any, authHeader: string) {
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

    const callOral = async (message: string, taskSubject: string, task: 1 | 2 | 3, turns?: number) => {
      const res = await fetch(`${baseUrl}/api/simulateur/oral`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          action: "correction",
          message,
          sujet: taskSubject,
          task,
          isTask2: task === 2,
          tours: turns,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Oral API ${res.status}`);
      }
      return res.json();
    };

    const dialogueTxt = (eoData.t2 || [])
      .filter((m: any) => m.role === "user" && String(m.text || "").trim())
      .map((m: any) => `Moi: ${m.text}`)
      .join("\n") ||
      (eoData.t2 || []).map((m: any) =>
        `${m.role === "user" ? "Moi" : "Examinateur"}: ${m.text}`
      ).join("\n");
    const userTurns = (eoData.t2 || []).filter((m: any) => m.role === "user").length;

    const [r1, r2, r3] = await Promise.all([
      callOral(eoData.t1 || "", sujetEO[1], 1),
      callOral(dialogueTxt, sujetEO[2], 2, userTurns),
      callOral(eoData.t3 || "", sujetEO[3], 3),
    ]);

    await supabaseAdmin
      .from("exam_sessions")
      .update({
        eo_result: { tache1: r1, tache2: r2, tache3: r3 },
        eo_correction_status: "done",
        eo_correction_error: null,
      })
      .eq("id", sessionId);
  } catch (err: any) {
    console.error("[exam-session] EO correction failed:", err);
    await supabaseAdmin
      .from("exam_sessions")
      .update({ eo_correction_status: "failed", eo_correction_error: err?.message || String(err) })
      .eq("id", sessionId);
  }
}