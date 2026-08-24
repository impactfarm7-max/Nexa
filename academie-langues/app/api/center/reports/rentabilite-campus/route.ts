import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";
import { getReportsContext, loadCampuses, reportsCatchError } from "../shared";

const CATEGORIES = new Set(["loyer", "electricite", "internet", "materiel", "transport", "entretien", "marketing", "autre"]);

function allowedCampusIds(campuses: { id: string }[], scoped?: string[] | null) {
  const ids = campuses.map((c) => c.id);
  return scoped?.length ? ids.filter((id) => scoped.includes(id)) : ids;
}

async function buildReport(centerId: string, from: string, to: string, campusIds: string[]) {
  const [{ data: campuses, error: campusesError }, { data: payments, error: paymentsError }, { data: expenses, error: expensesError }, { data: periods, error: payrollError }] = await Promise.all([
    supabaseAdmin.from("campuses").select("id, name").eq("center_id", centerId).in("id", campusIds).order("name"),
    supabaseAdmin.from("student_payments").select("id, enrollment_id, amount, payment_date").eq("center_id", centerId).gte("payment_date", `${from}T00:00:00`).lte("payment_date", `${to}T23:59:59.999`),
    supabaseAdmin.from("campus_expenses").select("id, campus_id, expense_date, category, label, amount, notes").eq("center_id", centerId).in("campus_id", campusIds).gte("expense_date", from).lte("expense_date", to).order("expense_date", { ascending: false }),
    supabaseAdmin.from("staff_payroll_periods").select("id, staff_id, base_salary_snapshot, period_ym").eq("center_id", centerId).gte("period_ym", from.slice(0, 7)).lte("period_ym", to.slice(0, 7)),
  ]);
  if (campusesError) throw new Error(campusesError.message);
  if (paymentsError) throw new Error(paymentsError.message);
  if (expensesError) throw new Error(expensesError.message.includes("campus_expenses") ? "Configuration requise : exécutez supabase-campus-profitability.sql dans Supabase." : expensesError.message);
  if (payrollError && !payrollError.message.toLowerCase().includes("staff_payroll")) throw new Error(payrollError.message);

  const paymentEnrollmentIds = [...new Set((payments || []).map((p) => p.enrollment_id).filter(Boolean))];
  const { data: enrollments } = paymentEnrollmentIds.length
    ? await supabaseAdmin.from("enrollments").select("id, campus_id").in("id", paymentEnrollmentIds)
    : { data: [] as { id: string; campus_id: string | null }[] };
  const campusByEnrollment = new Map((enrollments || []).map((e) => [e.id, e.campus_id]));

  const payrollPeriods = payrollError ? [] : (periods || []);
  const periodIds = payrollPeriods.map((p) => p.id);
  const staffIds = [...new Set(payrollPeriods.map((p) => p.staff_id))];
  const [{ data: lines }, { data: access }] = await Promise.all([
    periodIds.length ? supabaseAdmin.from("staff_payroll_lines").select("period_id, type, amount").in("period_id", periodIds) : Promise.resolve({ data: [] }),
    staffIds.length ? supabaseAdmin.from("staff_campus_access").select("profile_id, campus_id").in("profile_id", staffIds) : Promise.resolve({ data: [] }),
  ]);
  const linesByPeriod = new Map<string, { type: string; amount: number }[]>();
  for (const line of lines || []) linesByPeriod.set(line.period_id, [...(linesByPeriod.get(line.period_id) || []), line]);
  const campusesByStaff = new Map<string, string[]>();
  for (const row of access || []) campusesByStaff.set(row.profile_id, [...(campusesByStaff.get(row.profile_id) || []), row.campus_id]);

  const values = new Map(campusIds.map((id) => [id, { collections: 0, payroll: 0, expenses: 0 }]));
  let unassignedCollections = 0;
  for (const payment of payments || []) {
    const campusId = campusByEnrollment.get(payment.enrollment_id);
    const value = campusId ? values.get(campusId) : null;
    if (value) value.collections += Number(payment.amount || 0);
    else if (!campusId) unassignedCollections += Number(payment.amount || 0);
  }
  for (const expense of expenses || []) {
    const value = values.get(expense.campus_id);
    if (value) value.expenses += Number(expense.amount || 0);
  }
  let unassignedPayroll = 0;
  for (const period of payrollPeriods) {
    const periodLines = linesByPeriod.get(period.id) || [];
    const net = Number(period.base_salary_snapshot || 0) + periodLines.reduce((sum, line) => sum + (line.type === "deduction" ? -1 : 1) * Number(line.amount || 0), 0);
    const assigned = (campusesByStaff.get(period.staff_id) || []).filter((id) => values.has(id));
    if (!assigned.length) { unassignedPayroll += net; continue; }
    for (const campusId of assigned) values.get(campusId)!.payroll += net / assigned.length;
  }

  const campusNames = new Map((campuses || []).map((c) => [c.id, c.name]));
  const rows = campusIds.map((campusId) => {
    const value = values.get(campusId)!;
    const profit = value.collections - value.payroll - value.expenses;
    return { campusId, campusName: campusNames.get(campusId) || "Campus", ...value, profit, marginPercent: value.collections ? (profit / value.collections) * 100 : 0 };
  });
  const totals = rows.reduce((sum, row) => ({ collections: sum.collections + row.collections, payroll: sum.payroll + row.payroll, expenses: sum.expenses + row.expenses, profit: sum.profit + row.profit }), { collections: 0, payroll: 0, expenses: 0, profit: 0 });
  return { period: { from, to }, totals, rows, expenses: (expenses || []).map((e) => ({ ...e, campusName: campusNames.get(e.campus_id) || "Campus" })), warnings: { unassignedCollections, unassignedPayroll } };
}

export async function GET(req: Request) {
  try {
    const { ctx, filters, error } = await getReportsContext(req);
    if (error) return error;
    const allCampuses = await loadCampuses(ctx!.centerId);
    const accessibleIds = allowedCampusIds(allCampuses, ctx!.scopedCampusIds);
    let ids = accessibleIds;
    if (filters!.campusId) ids = ids.filter((id) => id === filters!.campusId);
    const report = await buildReport(ctx!.centerId, filters!.period.from, filters!.period.to, ids);
    return NextResponse.json({ report, campuses: allCampuses.filter((c) => accessibleIds.includes(c.id)), filieres: [] });
  } catch (e) { return reportsCatchError(req, e); }
}

export async function POST(req: Request) {
  try {
    const { ctx, error } = await getReportsContext(req);
    if (error) return error;
    const body = await req.json();
    const amount = Number(body.amount);
    if (!body.campus_id || !body.expense_date || !body.label?.trim() || !CATEGORIES.has(body.category) || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Dépense invalide." }, { status: 400 });
    const campuses = await loadCampuses(ctx!.centerId);
    if (!allowedCampusIds(campuses, ctx!.scopedCampusIds).includes(body.campus_id)) return NextResponse.json({ error: "Campus non autorisé." }, { status: 403 });
    const { data, error: insertError } = await supabaseAdmin.from("campus_expenses").insert({ center_id: ctx!.centerId, campus_id: body.campus_id, expense_date: body.expense_date, category: body.category, label: body.label.trim(), amount, notes: body.notes?.trim() || null, created_by: ctx!.user.id }).select().single();
    if (insertError) throw new Error(insertError.message);
    return NextResponse.json({ expense: data }, { status: 201 });
  } catch (e) { return reportsCatchError(req, e); }
}

export async function DELETE(req: Request) {
  try {
    const { ctx, error } = await getReportsContext(req);
    if (error) return error;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
    const campuses = await loadCampuses(ctx!.centerId);
    const ids = allowedCampusIds(campuses, ctx!.scopedCampusIds);
    const { error: deleteError } = await supabaseAdmin.from("campus_expenses").delete().eq("id", id).eq("center_id", ctx!.centerId).in("campus_id", ids);
    if (deleteError) throw new Error(deleteError.message);
    return NextResponse.json({ ok: true });
  } catch (e) { return reportsCatchError(req, e); }
}
