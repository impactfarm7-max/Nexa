import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const pauseReason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

  const { data: previousCenter } = await supabaseAdmin
    .from("centers")
    .select("id, name, status, pause_reason")
    .eq("id", id)
    .maybeSingle();

  if (!previousCenter) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  const { data: center, error: updateError } = await supabaseAdmin
    .from("centers")
    .update({
      status: "suspended",
      pause_reason: pauseReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name, status, pause_reason")
    .maybeSingle();

  if (updateError || !center) {
    return NextResponse.json({ error: updateError?.message || "Échec de la mise en pause." }, { status: 500 });
  }

  await logSuperadminAction(ctx.user.id, "center_paused", {
    targetType: "center",
    targetId: id,
    reason: pauseReason ?? undefined,
    metadata: {
      center_id: id,
      centerName: center.name,
      previousStatus: previousCenter.status,
      previousPauseReason: previousCenter.pause_reason,
      pause_reason: center.pause_reason,
    },
    req,
  });

  return NextResponse.json({ center });
}
