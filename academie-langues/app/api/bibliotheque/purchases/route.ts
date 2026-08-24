import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";

const PAYMENT_METHODS = new Set(["cash", "mobile_money", "bank_transfer", "other"]);

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("document_purchases")
    .select("id, document_id, amount, currency, payment_method, payment_reference, status, requested_at, paid_at, refunded_at, refund_reason, bibliotheque_documents(titre, categorie)")
    .eq("buyer_id", user.id)
    .order("requested_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purchases: data || [] });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const documentId = Number(body.documentId);
  const paymentMethod = String(body.paymentMethod || "");
  const paymentReference = String(body.paymentReference || "").trim().slice(0, 160) || null;
  const buyerNote = String(body.note || "").trim().slice(0, 500) || null;
  if (!Number.isInteger(documentId) || !PAYMENT_METHODS.has(paymentMethod)) {
    return NextResponse.json({ error: "Document ou moyen de paiement invalide." }, { status: 400 });
  }

  const [{ data: profile }, { data: document }] = await Promise.all([
    supabaseAdmin.from("profiles").select("center_id").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("bibliotheque_documents")
      .select("id, center_id, price, is_paid, visibility, status")
      .eq("id", documentId).maybeSingle(),
  ]);
  if (!document || !document.is_paid || document.visibility !== "public" || document.status !== "approved" || !document.center_id) {
    return NextResponse.json({ error: "Ce document n'est pas disponible à la vente." }, { status: 404 });
  }
  const amount = Number(document.price);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Prix du document invalide." }, { status: 409 });
  }

  const { data: existing } = await supabaseAdmin.from("document_purchases")
    .select("id, status").eq("document_id", documentId).eq("buyer_id", user.id)
    .in("status", ["pending", "paid"]).maybeSingle();
  if (existing) return NextResponse.json({ purchase: existing, alreadyExists: true });

  const { data: purchase, error } = await supabaseAdmin.from("document_purchases").insert({
    document_id: documentId,
    buyer_id: user.id,
    buyer_center_id: profile?.center_id || null,
    seller_center_id: document.center_id,
    amount,
    payment_method: paymentMethod,
    payment_reference: paymentReference,
    buyer_note: buyerNote,
  }).select("id, status, amount, currency, requested_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("document_purchase_events").insert({
    purchase_id: purchase.id, event_type: "requested", new_status: "pending", actor_id: user.id,
    metadata: { payment_method: paymentMethod, payment_reference: paymentReference },
  });
  return NextResponse.json({ purchase }, { status: 201 });
}
