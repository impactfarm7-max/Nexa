import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { studentMatchesCollectiveSlot } from "@/app/utils/collectiveTargeting";
import { getStudentCourseContext } from "@/app/api/student/courses/studentCourseAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCenterManagers(centerId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email, prenom")
    .eq("center_id", centerId)
    .in("role", ["center_manager", "campus_manager", "admin"]);
  return data ?? [];
}

async function isEligibleForSlot(
  userId: string,
  slot: {
    id: string;
    session_scope: string | null;
    groupe_id: string | null;
    schedule_slot_groupes?: Array<{ groupe_id: string }>;
  },
  groupeIds: string[],
) {
  const scope = slot.session_scope || "collective";

  if (scope === "live") {
    const { data: link } = await supabaseAdmin
      .from("schedule_slot_participants")
      .select("slot_id")
      .eq("slot_id", slot.id)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(link);
  }

  // Bascule 1-on-1 → collectif
  const { data: merged } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "bascule")
    .eq("merged_slot_id", slot.id)
    .limit(1)
    .maybeSingle();
  if (merged) return true;

  return studentMatchesCollectiveSlot(slot, groupeIds);
}

/** POST — refus étudiant d'une séance groupe / live programmée par le centre */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slotId = String(body.slot_id || "").trim();
  const sessionDate = String(body.session_date || "").trim();
  const reason = String(body.reason || "").trim().slice(0, 500);

  if (!slotId || !sessionDate) {
    return NextResponse.json({ error: "slot_id et session_date requis." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return NextResponse.json({ error: "Date de séance invalide." }, { status: 400 });
  }
  if (reason.length < 3) {
    return NextResponse.json({ error: "Indiquez un motif (3 caractères minimum)." }, { status: 400 });
  }

  const ctx = await getStudentCourseContext(user.id);
  if (!ctx.centerId) {
    return NextResponse.json({ error: "Aucun centre rattache." }, { status: 403 });
  }

  const { data: slot } = await supabaseAdmin
    .from("schedule_slots")
    .select("id, center_id, title, session_scope, groupe_id, start_time, schedule_slot_groupes(groupe_id)")
    .eq("id", slotId)
    .eq("center_id", ctx.centerId)
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  }

  const eligible = await isEligibleForSlot(user.id, slot, ctx.groupeIds);
  if (!eligible) {
    return NextResponse.json({ error: "Vous n'êtes pas concerné par cette séance." }, { status: 403 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("prenom, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: response, error } = await supabaseAdmin
    .from("schedule_slot_responses")
    .upsert(
      {
        slot_id: slotId,
        session_date: sessionDate,
        user_id: user.id,
        status: "refused",
        reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot_id,session_date,user_id" },
    )
    .select("id, slot_id, session_date, status, reason, created_at")
    .single();

  if (error) {
    // Table absente (migration SQL non exécutée)
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json(
        { error: "Fonction indisponible : exécutez supabase-schedule-slot-responses.sql dans Supabase." },
        { status: 503 },
      );
    }
    console.error("[collective-respond]", error);
    return NextResponse.json({ error: "Impossible d'enregistrer le refus." }, { status: 500 });
  }

  const studentName = profile?.prenom || profile?.email || "Un étudiant";
  const title = slot.title || (slot.session_scope === "live" ? "Session Live" : "Coaching de groupe");
  const message = `${studentName} a refusé « ${title} » du ${sessionDate}. Motif : ${reason}`;

  const managers = await getCenterManagers(ctx.centerId);
  if (managers.length > 0) {
    await supabaseAdmin.from("notifications").insert(
      managers.map((m) => ({ user_id: m.id, message })),
    );
  }

  return NextResponse.json({ ok: true, response });
}
