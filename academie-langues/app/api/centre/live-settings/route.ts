import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { ALLOWED_REMINDER_MINUTES, normalizeReminderMinutes } from "@/app/utils/collectiveLive";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MANAGER_ROLES = ["admin", "center_manager", "campus_manager"];

async function getManagerContext(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", userId)
    .single();

  if (!profile?.center_id || !MANAGER_ROLES.includes(profile.role)) {
    return null;
  }
  return { centerId: profile.center_id };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getManagerContext(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("centers")
    .select("coaching_reminder_minutes, center_type")
    .eq("id", ctx.centerId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    coaching_reminder_minutes: normalizeReminderMinutes(data?.coaching_reminder_minutes),
    center_type: data?.center_type ?? "generic",
    allowed_minutes: ALLOWED_REMINDER_MINUTES,
  });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getManagerContext(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json();
  const minutes = normalizeReminderMinutes(body.coaching_reminder_minutes);

  const { error } = await supabaseAdmin
    .from("centers")
    .update({ coaching_reminder_minutes: minutes })
    .eq("id", ctx.centerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, coaching_reminder_minutes: minutes });
}
