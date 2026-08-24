import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";

export async function GET(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const denied = await requireCenterPermission(auth.ctx, "finance");
  if (denied) return denied;

  const { data, error } = await supabaseAdmin.from("document_purchases")
    .select("id, document_id, buyer_id, buyer_center_id, amount, currency, payment_method, payment_reference, buyer_note, status, requested_at, paid_at, refunded_at, refund_reason, bibliotheque_documents(titre), profiles!document_purchases_buyer_id_fkey(prenom, nom, email)")
    .eq("seller_center_id", auth.ctx.centerId)
    .order("requested_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purchases: data || [] });
}
