import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { notifyCollectiveSlotStudents } from "@/app/utils/notifyCollectiveSlot.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const slotId = body.slot_id as string | undefined;
  if (!slotId) return NextResponse.json({ error: "slot_id requis." }, { status: 400 });

  const notified = await notifyCollectiveSlotStudents({
    centerId: profile.center_id,
    slotId,
    event: (body.event as "created" | "cancelled" | "rescheduled") || "created",
    sessionDate: (body.session_date as string | null) ?? null,
    title: body.title as string | undefined,
    startTime: body.start_time as string | undefined,
    endTime: body.end_time as string | undefined,
    mode: body.mode as string | undefined,
  });

  return NextResponse.json({ ok: true, notified });
}
