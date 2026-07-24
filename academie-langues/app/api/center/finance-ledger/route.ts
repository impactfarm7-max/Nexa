import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import { fetchDocumentExportConfig, filterSignatures } from "@/app/utils/documentConfig";

const FINANCE_COLUMNS =
  "enrollment_id, student_id, prenom, nom, phone, center_status, filiere_name, niveau_annee, groupe_nom, tuition_fee, tuition_paid, reste_a_payer, enrollment_status, enrolled_at, next_due_date, next_due_amount, next_due_label, total_installments, paid_installments, late_installments, financial_status, aging_bucket, coupon_discount";

export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const [{ data: records, error: finError }, { data: branding }, { data: sigRows }] = await Promise.all([
    supabaseAdmin.from("student_finance_summary").select(FINANCE_COLUMNS).eq("center_id", ctx!.centerId),
    supabaseAdmin.from("center_branding").select("*").eq("center_id", ctx!.centerId).maybeSingle(),
    supabaseAdmin.from("bulletin_signatures").select("id, name, title, signature_url").eq("center_id", ctx!.centerId).order("display_order"),
  ]);

  if (finError) {
    return NextResponse.json({ error: finError.message }, { status: 500 });
  }

  const rows = records || [];
  const enrollmentIds = rows.map((r: { enrollment_id: string }) => r.enrollment_id).filter(Boolean);
  let discountByEnrollment: Record<string, { discount_amount: number; discount_reason: string | null }> = {};
  if (enrollmentIds.length > 0) {
    const { data: discRows } = await supabaseAdmin
      .from("enrollments")
      .select("id, discount_amount, discount_reason")
      .in("id", enrollmentIds);
    discountByEnrollment = Object.fromEntries(
      (discRows || []).map((e: { id: string; discount_amount: number | null; discount_reason: string | null }) => [
        e.id,
        {
          discount_amount: Number(e.discount_amount) || 0,
          discount_reason: e.discount_reason ?? null,
        },
      ]),
    );
  }

  const enriched = rows.map((r: { enrollment_id: string; coupon_discount?: number }) => ({
    ...r,
    discount_amount: discountByEnrollment[r.enrollment_id]?.discount_amount ?? (Number(r.coupon_discount) || 0),
    discount_reason: discountByEnrollment[r.enrollment_id]?.discount_reason ?? null,
  }));

  const docConfig = await fetchDocumentExportConfig(supabaseAdmin, ctx!.centerId, {
    documentType: "facture",
  });
  const signatures = filterSignatures(sigRows || [], docConfig.signatureIds);

  return NextResponse.json({
    records: enriched,
    branding: branding || null,
    docConfig,
    signatures,
  });
}
