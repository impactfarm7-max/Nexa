import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;

  const { data: previousCenter } = await supabaseAdmin
    .from("centers")
    .select("id, name, status")
    .eq("id", id)
    .maybeSingle();

  if (!previousCenter) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  const { data: center, error: updateError } = await supabaseAdmin
    .from("centers")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name, status")
    .maybeSingle();

  if (updateError || !center) {
    return NextResponse.json({ error: updateError?.message || "Échec de la révocation." }, { status: 500 });
  }

  await logSuperadminAction(ctx.user.id, "center_revoked", {
    targetType: "center",
    targetId: id,
    metadata: {
      center_id: id,
      centerName: center.name,
      previousStatus: previousCenter.status,
    },
    req,
  });

  return NextResponse.json({ center });
}
