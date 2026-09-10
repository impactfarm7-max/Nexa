import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeTutorUnlockAt } from "@/app/utils/tutor-unlock";
import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";
import { getTcfCenterQuotas } from "@/app/data/packOffers";
import { assignPendingClassroom } from "@/app/utils/studentClassroom.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Finalise l'inscription cote serveur (service_role), sans dependre d'une
 * session client active. `supabase.auth.signUp()` ne renvoie pas toujours
 * de session (ex: confirmation email active) : l'ancienne ecriture directe
 * `supabase.from("profiles").upsert(...)` cote client tournait alors sans
 * authentification et etait bloquee silencieusement par les policies RLS
 * ("to authenticated" uniquement), laissant un profil vide et sans centre.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!userId || !email) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr || !userRes?.user || (userRes.user.email || "").toLowerCase() !== email) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const createdAt = userRes.user.created_at ? new Date(userRes.user.created_at).getTime() : 0;
  if (!createdAt || Date.now() - createdAt > FIVE_MINUTES_MS) {
    return NextResponse.json({ error: "Fenêtre de finalisation expirée." }, { status: 403 });
  }

  // Pas de garde d'idempotence sur center_id : un trigger DB peut deja avoir
  // copie center_id depuis raw_user_meta_data avant notre appel, alors que le
  // reste du profil (prenom, ville, pays...) reste a ecrire. L'upsert plus bas
  // est de toute facon idempotent (rejouable sans effet de bord).
  const prenom = String(body.prenom || "").trim();
  const nom = String(body.nom || "").trim() || null;
  const phone = String(body.phone || "").trim() || null;
  const ville = String(body.ville || "").trim() || null;
  const country = body.country ? String(body.country).trim() : null;
  const countryCode = body.countryCode ? String(body.countryCode).trim() : null;
  const birthDate = body.birthDate ? String(body.birthDate) : null;
  const centerId = body.centerId ? String(body.centerId).trim() : null;

  let center: { id: string; name: string } | null = null;
  if (centerId) {
    const { data } = await supabaseAdmin.from("centers").select("id, name").eq("id", centerId).maybeSingle();
    center = data || null;
    if (!center) {
      return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
    }
  }

  const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    prenom,
    nom,
    phone,
    email,
    ville,
    city: ville,
    country,
    country_code: countryCode,
    birth_date: birthDate,
    role: "student",
    ...(center
      ? {
          center_id: center.id,
          created_by_center_id: center.id,
          center_status: "pending_center_approval",
          subscription_ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          tutor_unlock_at: computeTutorUnlockAt(new Date()),
          ...getTcfCenterQuotas(3),
          tag_status: "pending_center_approval",
        }
      : {
          pack_name: "essai",
          subscription_ends_at: trialEndsAt,
          tag_status: "actif",
          ee_total: 9999,
          ee_used: 0,
          exam_total: 9999,
          exam_used: 0,
          exam_4m_total: 4,
          exam_4m_used: 0,
          eo_total: 9999,
          eo_used: 0,
          coaching_total: 9999,
          coaching_used: 0,
          tutor_ia_total: TUTOR_EXCHANGE_QUOTA,
          tutor_ia_used: 0,
        }),
    simulations_completed: 0,
    last_sign_in_at: new Date().toISOString(),
  });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  if (center) {
    // L'ecriture ci-dessus peut arriver avant un trigger d'auth qui remettrait
    // des valeurs par defaut : on reaffirme le rattachement centre.
    await supabaseAdmin
      .from("profiles")
      .update({
        center_id: center.id,
        created_by_center_id: center.id,
        center_status: "pending_center_approval",
        tag_status: "pending_center_approval",
      })
      .eq("id", userId);
  }

  if (center || country) {
    await supabaseAdmin.from("student_details").upsert({
      student_id: userId,
      country,
      country_code: countryCode,
    });
  }

  if (center) {
    const { data: filiere } = await supabaseAdmin
      .from("filieres")
      .select("id")
      .eq("center_id", center.id)
      .eq("name", "TCF Canada")
      .maybeSingle();
    if (filiere?.id) {
      await assignPendingClassroom(supabaseAdmin, {
        studentId: userId,
        centerId: center.id,
        filiereId: filiere.id,
        groupeId: null,
      });
    }
  }

  return NextResponse.json({ ok: true, alreadyDone: false });
}
