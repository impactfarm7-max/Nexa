import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import { parseReportFilters } from "@/app/utils/reports-period";

const FULL_ACCESS_ROLES = new Set(["center_manager", "campus_manager", "manager"]);

type ReportLocale = "fr" | "en";

function reqLocale(req: Request): ReportLocale {
  return req.headers.get("x-nexa-locale") === "en" ? "en" : "fr";
}

function msg(locale: ReportLocale, fr: string, en: string) {
  return locale === "en" ? en : fr;
}

export function reportsCatchError(req: Request, e: unknown) {
  const locale = reqLocale(req);
  const message =
    e instanceof Error ? e.message : msg(locale, "Erreur serveur", "Server error");
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function getReportsContext(req: Request) {
  const locale = reqLocale(req);
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return { ctx: null, filters: null, locale, error };

  const filters = { ...parseReportFilters(new URL(req.url), locale), locale };
  if (ctx!.scopedCampusIds?.length) {
    filters.campusIds = ctx!.scopedCampusIds;
    if (filters.campusId && !ctx!.scopedCampusIds.includes(filters.campusId)) {
      filters.campusId = ctx!.scopedCampusIds.length === 1 ? ctx!.scopedCampusIds[0] : null;
    }
  }

  if (FULL_ACCESS_ROLES.has(ctx!.role)) {
    return { ctx, filters, locale, error: null };
  }

  const { data: membership } = await supabaseAdmin
    .from("center_users")
    .select("permissions")
    .eq("user_id", ctx!.user.id)
    .eq("center_id", ctx!.centerId)
    .maybeSingle();

  const perms = (membership?.permissions || []) as string[];
  if (!perms.includes("rapports")) {
    const { data: staffPerm } = await supabaseAdmin
      .from("staff_permissions")
      .select("permission")
      .eq("profile_id", ctx!.user.id)
      .eq("permission", "rapports")
      .maybeSingle();
    if (!staffPerm) {
      return {
        ctx: null,
        filters: null,
        locale,
        error: NextResponse.json(
          { error: msg(locale, "Accès rapports refusé.", "Reports access denied.") },
          { status: 403 },
        ),
      };
    }
  }

  return { ctx, filters, locale, error: null };
}

export type FinanceSummaryRow = {
  enrollment_id: string;
  student_id: string;
  prenom: string;
  nom: string;
  center_status: string | null;
  filiere_name: string;
  niveau_annee: number | null;
  groupe_nom: string | null;
  tuition_fee: number;
  tuition_paid: number;
  reste_a_payer: number;
  enrollment_status: string;
  financial_status: string;
  aging_bucket: string;
  campus_id: string | null;
  late_installments: number;
  next_due_date: string | null;
  enrolled_at: string | null;
};

const FINANCE_SELECT =
  "enrollment_id, student_id, prenom, nom, center_status, filiere_name, niveau_annee, groupe_nom, tuition_fee, tuition_paid, reste_a_payer, enrollment_status, financial_status, aging_bucket, late_installments, next_due_date, enrolled_at";

export async function loadFinanceSummary(centerId: string) {
  const { data, error } = await supabaseAdmin
    .from("student_finance_summary")
    .select(FINANCE_SELECT)
    .eq("center_id", centerId);
  if (error) throw new Error(error.message);

  const rows = (data || []) as Omit<FinanceSummaryRow, "campus_id">[];
  const enrollmentIds = rows.map((r) => r.enrollment_id).filter(Boolean);
  const campusByEnrollment = new Map<string, string | null>();
  const enrolledAtByEnrollment = new Map<string, string | null>();

  if (enrollmentIds.length > 0) {
    const { data: enrollRows, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("id, campus_id, enrolled_at")
      .in("id", enrollmentIds);
    if (enrollError) throw new Error(enrollError.message);
    for (const row of enrollRows || []) {
      campusByEnrollment.set(row.id, row.campus_id ?? null);
      enrolledAtByEnrollment.set(row.id, row.enrolled_at ?? null);
    }
  }

  return rows.map((row) => ({
    ...row,
    campus_id: campusByEnrollment.get(row.enrollment_id) ?? null,
    enrolled_at: row.enrolled_at ?? enrolledAtByEnrollment.get(row.enrollment_id) ?? null,
  })) as FinanceSummaryRow[];
}

export async function enrollmentIdsForFiliere(centerId: string, filiereId: string) {
  const { data: filiere } = await supabaseAdmin
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("id", filiereId)
    .maybeSingle();
  if (!filiere) return new Set<string>();

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("filiere_id", filiereId);
  if (error) throw new Error(error.message);
  return new Set((data || []).map((r) => r.id));
}

export function filterFinanceRows(
  rows: FinanceSummaryRow[],
  opts: {
    campusId?: string | null;
    campusIds?: string[] | null;
    filiereId?: string | null;
    enrollmentIds?: Set<string> | null;
  },
) {
  let out = rows;
  if (opts.campusId) out = out.filter((r) => r.campus_id === opts.campusId);
  else if (opts.campusIds?.length) out = out.filter((r) => r.campus_id && opts.campusIds!.includes(r.campus_id));
  if (opts.enrollmentIds) out = out.filter((r) => opts.enrollmentIds!.has(r.enrollment_id));
  return out;
}

export async function loadCampuses(centerId: string) {
  const { data } = await supabaseAdmin
    .from("campuses")
    .select("id, name")
    .eq("center_id", centerId)
    .order("name");
  return data || [];
}

export async function loadFilieres(centerId: string) {
  const { data } = await supabaseAdmin
    .from("filieres")
    .select("id, name, status")
    .eq("center_id", centerId)
    .order("name");
  return data || [];
}
