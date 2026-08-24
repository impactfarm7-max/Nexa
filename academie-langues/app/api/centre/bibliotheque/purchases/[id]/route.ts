import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";

const ACTIONS = new Set(["confirm", "reject", "refund"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const denied = await requireCenterPermission(auth.ctx, "finance");
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const reason = String(body.reason || "").trim().slice(0, 500) || null;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  if ((action === "reject" || action === "refund") && !reason) {
    return NextResponse.json({ error: "Un motif est obligatoire." }, { status: 400 });
  }

  const { data: purchase } = await supabaseAdmin.from("document_purchases")
    .select("id, status").eq("id", id).eq("seller_center_id", auth.ctx.centerId).maybeSingle();
  if (!purchase) return NextResponse.json({ error: "Achat introuvable." }, { status: 404 });
  if (action === "confirm" && purchase.status !== "pending") return NextResponse.json({ error: "Seule une demande en attente peut être confirmée." }, { status: 409 });
  if (action === "reject" && purchase.status !== "pending") return NextResponse.json({ error: "Seule une demande en attente peut être refusée." }, { status: 409 });
  if (action === "refund" && purchase.status !== "paid") return NextResponse.json({ error: "Seul un achat payé peut être remboursé." }, { status: 409 });

  const now = new Date().toISOString();
  const newStatus = action === "confirm" ? "paid" : action === "refund" ? "refunded" : "rejected";
  const patch: Record<string, unknown> = { status: newStatus, updated_at: now };
  if (action === "confirm") Object.assign(patch, { paid_at: now, confirmed_by: auth.ctx.user.id });
  if (action === "refund") Object.assign(patch, { refunded_at: now, refunded_by: auth.ctx.user.id, refund_reason: reason });
  if (action === "reject") patch.refund_reason = reason;

  const { data: updated, error } = await supabaseAdmin.from("document_purchases")
    .update(patch).eq("id", id).eq("status", purchase.status).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "La demande a déjà été modifiée." }, { status: 409 });

  await supabaseAdmin.from("document_purchase_events").insert({
    purchase_id: id,
    event_type: action === "confirm" ? "confirmed" : action === "refund" ? "refunded" : "rejected",
    previous_status: purchase.status,
    new_status: newStatus,
    actor_id: auth.ctx.user.id,
    reason,
  });
  return NextResponse.json({ purchase: updated });
}
