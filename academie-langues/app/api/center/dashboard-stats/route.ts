import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import { getMonday, tcfEffectiveStatus } from "@/app/centre/dashboard/utils";
import type { GenericDashboardStats, TcfDashboardStats } from "@/app/centre/dashboard/types";

function aggregateFinance(rows: { tuition_fee?: number; tuition_paid?: number; financial_status?: string }[]) {
  const ca = rows.reduce((s, r) => s + (r.tuition_fee || 0), 0);
  const paid = rows.reduce((s, r) => s + (r.tuition_paid || 0), 0);
  const late = rows.filter((r) => r.financial_status === "late").length;
  const lateAmount = rows
    .filter((r) => r.financial_status === "late")
    .reduce((s, r) => s + Math.max(0, (r.tuition_fee || 0) - (r.tuition_paid || 0)), 0);
  return { ca, paid, pending: ca - paid, late, lateAmount };
}

type EnrollRow = { id: string; student_id: string; campus_id: string | null; status: string | null };
type FinRow = { enrollment_id: string; tuition_fee?: number; tuition_paid?: number; financial_status?: string };

function matchCampus(campusId: string | null, selected: string | null, scoped: string[] | null) {
  if (selected) return campusId === selected;
  if (scoped?.length) return !!campusId && scoped.includes(campusId);
  return true;
}

async function countCampusMessages(cId: string, studentIds: string[]) {
  if (studentIds.length === 0) return 0;
  const chunk = studentIds.slice(0, 200);
  const { count, error } = await supabaseAdmin
    .from("community_messages")
    .select("id", { count: "exact", head: true })
    .eq("center_id", cId)
    .in("user_id", chunk);
  if (error) {
    const fallback = await supabaseAdmin
      .from("community_messages")
      .select("id", { count: "exact", head: true })
      .eq("center_id", cId);
    return fallback.count ?? 0;
  }
  return count ?? 0;
}

async function loadGenericStats(
  cId: string,
  campusId: string | null,
  scopedCampusIds: string[] | null,
): Promise<GenericDashboardStats> {
  const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString();
  const monday = getMonday(new Date()).toISOString().split("T")[0];
  const sunday = new Date(getMonday(new Date()).getTime() + 6 * 86_400_000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const scoped = campusId ? [campusId] : scopedCampusIds;

  const [{ data: filiereRows }, finRes, enrollRes, campusFiliereRes, absentRes, msgRes] = await Promise.all([
    supabaseAdmin.from("filieres").select("id").eq("center_id", cId),
    supabaseAdmin
      .from("student_finance_summary")
      .select("enrollment_id, tuition_fee, tuition_paid, financial_status")
      .eq("center_id", cId),
    supabaseAdmin.from("enrollments").select("id, student_id, campus_id, status").eq("center_id", cId),
    scoped?.length
      ? supabaseAdmin.from("filiere_campus").select("filiere_id").in("campus_id", scoped)
      : Promise.resolve({ data: [] as { filiere_id: string }[] }),
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom")
      .eq("center_id", cId)
      .eq("role", "student")
      .lt("last_sign_in_at", fiveDaysAgo)
      .limit(40),
    scoped?.length
      ? Promise.resolve({ count: null as number | null })
      : supabaseAdmin.from("community_messages").select("id", { count: "exact", head: true }).eq("center_id", cId),
  ]);

  let enrollments = (enrollRes.data || []) as EnrollRow[];
  if (campusId || scopedCampusIds?.length) {
    enrollments = enrollments.filter((e) => matchCampus(e.campus_id, campusId, scopedCampusIds));
  }

  const campusEnrollmentIds = new Set(enrollments.map((e) => e.id));
  const campusStudentIds = new Set(enrollments.map((e) => e.student_id));
  const activeStudents = enrollments.filter((e) => e.status === "active").length;

  let finRows = (finRes.data || []) as FinRow[];
  if (campusId || scopedCampusIds?.length) finRows = finRows.filter((r) => campusEnrollmentIds.has(r.enrollment_id));
  const finAgg = aggregateFinance(finRows);

  const allFiliereIds = (filiereRows || []).map((f) => f.id);
  const campusFiliereIds = new Set((campusFiliereRes.data || []).map((r) => r.filiere_id));
  const filiereIds = scoped?.length ? allFiliereIds.filter((id) => campusFiliereIds.has(id)) : allFiliereIds;

  let absentRows = (absentRes.data || []) as { id: string; prenom: string; nom: string }[];
  if (absentRes.error) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom")
      .eq("center_id", cId)
      .eq("role", "student")
      .lt("updated_at", fiveDaysAgo)
      .limit(40);
    absentRows = (fallback.data || []) as { id: string; prenom: string; nom: string }[];
  }

  const absent = absentRows.filter((p) => !scoped?.length || campusStudentIds.has(p.id)).slice(0, 8);

  const msgCount = scoped?.length
    ? await countCampusMessages(cId, [...campusStudentIds])
    : (msgRes.count ?? 0);

  if (filiereIds.length === 0) {
    return {
      fin: { ca: finAgg.ca, paid: finAgg.paid, pending: finAgg.pending, late: finAgg.late },
      activeStudents,
      absent,
      coursesCount: 0,
      cancelledCount: 0,
      exams: [],
      msgCount,
    };
  }

  const { data: slotRows } = await supabaseAdmin.from("schedule_slots").select("id").in("filiere_id", filiereIds);
  const slotIds = (slotRows || []).map((x) => x.id);

  const [slotsRes, cancelRes, examsRes] = await Promise.all([
    supabaseAdmin.from("schedule_slots").select("id", { count: "exact", head: true }).in("filiere_id", filiereIds),
    slotIds.length > 0
      ? supabaseAdmin
          .from("schedule_exceptions")
          .select("id", { count: "exact", head: true })
          .in("slot_id", slotIds)
          .eq("status", "cancelled")
          .gte("actual_date", monday)
          .lte("actual_date", sunday)
      : Promise.resolve({ count: 0 }),
    slotIds.length > 0
      ? supabaseAdmin
          .from("schedule_exceptions")
          .select("id, actual_date, schedule_slots!inner(title, start_time, filiere_id)")
          .in("slot_id", slotIds)
          .neq("status", "cancelled")
          .gte("actual_date", today)
          .order("actual_date")
          .limit(4)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    fin: { ca: finAgg.ca, paid: finAgg.paid, pending: finAgg.pending, late: finAgg.late },
    activeStudents,
    absent,
    coursesCount: slotsRes.count ?? 0,
    cancelledCount: cancelRes.count ?? 0,
    exams: ((examsRes.data || []) as { id: string; actual_date: string; schedule_slots?: { title?: string; start_time?: string } }[]).map(
      (e) => ({
        id: e.id,
        title: e.schedule_slots?.title || "Cours modifié",
        actual_date: e.actual_date,
        start_time: e.schedule_slots?.start_time || "",
      }),
    ),
    msgCount,
  };
}

async function loadTcfStats(
  cId: string,
  campusId: string | null,
  scopedCampusIds: string[] | null,
): Promise<TcfDashboardStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
  const todayDow = now.getDay() === 0 ? 7 : now.getDay();
  const scoped = campusId ? [campusId] : scopedCampusIds;

  const [
    { data: filiereRows },
    { data: tcfRows },
    enrolledToday,
    enrolledThisWeek,
    inactiveStudents,
    paymentsToday,
    finRows,
    msgCountRes,
    examsScheduled,
    enrollRes,
    campusFiliereRes,
  ] = await Promise.all([
    supabaseAdmin.from("filieres").select("id").eq("center_id", cId),
    supabaseAdmin.from("center_tcf_students").select("student_id, center_status, tag_status, access_status").eq("center_id", cId),
    supabaseAdmin
      .from("profiles")
      .select("id, created_at", { count: "exact" })
      .eq("center_id", cId)
      .eq("role", "student")
      .gte("created_at", todayStart),
    supabaseAdmin
      .from("profiles")
      .select("id, created_at", { count: "exact" })
      .eq("center_id", cId)
      .eq("role", "student")
      .gte("created_at", weekStart),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("center_id", cId)
      .eq("role", "student")
      .eq("center_status", "active")
      .lt("last_sign_in_at", threeDaysAgo),
    supabaseAdmin.from("student_payments").select("amount, enrollment_id").eq("center_id", cId).gte("payment_date", todayStart),
    supabaseAdmin
      .from("student_finance_summary")
      .select("enrollment_id, tuition_fee, tuition_paid, financial_status")
      .eq("center_id", cId),
    scoped?.length
      ? Promise.resolve({ count: null as number | null })
      : supabaseAdmin.from("community_messages").select("id", { count: "exact", head: true }).eq("center_id", cId),
    supabaseAdmin
      .from("tcf_exam_sessions")
      .select("id", { count: "exact", head: true })
      .eq("center_id", cId)
      .in("status", ["scheduled", "open"])
      .gte("scheduled_at", todayStart),
    supabaseAdmin.from("enrollments").select("id, student_id, campus_id").eq("center_id", cId),
    scoped?.length
      ? supabaseAdmin.from("filiere_campus").select("filiere_id").in("campus_id", scoped)
      : Promise.resolve({ data: [] as { filiere_id: string }[] }),
  ]);

  const enrollments = ((enrollRes.data || []) as EnrollRow[]).filter((e) =>
    matchCampus(e.campus_id, campusId, scopedCampusIds),
  );
  const campusStudentIds = new Set(enrollments.map((e) => e.student_id));
  const campusEnrollmentIds = new Set(enrollments.map((e) => e.id));
  const filterStudents = Boolean(scoped?.length);

  let viewRows = tcfRows || [];
  if (filterStudents) {
    viewRows = viewRows.filter((s) => campusStudentIds.has(s.student_id));
  }

  const enrolledTodayCount = filterStudents
    ? (enrolledToday.data || []).filter((p) => campusStudentIds.has(p.id)).length
    : enrolledToday.count || 0;
  const enrolledThisWeekCount = filterStudents
    ? (enrolledThisWeek.data || []).filter((p) => campusStudentIds.has(p.id)).length
    : enrolledThisWeek.count || 0;

  const allFiliereIds = (filiereRows || []).map((f) => f.id);
  const campusFiliereIds = new Set((campusFiliereRes.data || []).map((r) => r.filiere_id));
  const filiereIds = scoped?.length ? allFiliereIds.filter((id) => campusFiliereIds.has(id)) : allFiliereIds;

  const coursesToday =
    filiereIds.length > 0
      ? await supabaseAdmin
          .from("schedule_slots")
          .select("id", { count: "exact", head: true })
          .in("filiere_id", filiereIds)
          .eq("day_of_week", todayDow)
      : { count: 0 };

  let pendingValidation = 0;
  if (viewRows.length > 0) {
    const ids = viewRows.map((s) => s.student_id).filter(Boolean);
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, tag_status, center_status")
      .in("id", ids);

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    pendingValidation = viewRows.filter((s) => {
      const p = profileMap.get(s.student_id);
      return (
        tcfEffectiveStatus({
          center_status: s.center_status ?? p?.center_status ?? null,
          tag_status: s.tag_status ?? p?.tag_status ?? null,
          access_status: s.access_status,
        }) === "pending"
      );
    }).length;
  }

  let finData = (finRows.data || []) as FinRow[];
  if (filterStudents) finData = finData.filter((r) => campusEnrollmentIds.has(r.enrollment_id));
  const finAgg = aggregateFinance(finData);

  let payRows = paymentsToday.data || [];
  if (filterStudents) payRows = payRows.filter((p) => campusEnrollmentIds.has(p.enrollment_id));
  const collectedToday = payRows.reduce((s, p) => s + Number(p.amount), 0);

  const studentIds = viewRows.map((s) => s.student_id).filter(Boolean);
  let onSimulator = 0;
  if (studentIds.length > 0) {
    const { data: simRows, error: simErr } = await supabaseAdmin
      .from("simulator_logs")
      .select("user_id")
      .in("user_id", studentIds.slice(0, 200))
      .gte("created_at", todayStart);
    if (!simErr) onSimulator = new Set((simRows || []).map((r) => r.user_id)).size;
  }

  const todayKey = now.toISOString().slice(0, 10);
  let liveQuery = supabaseAdmin
    .from("schedule_slots")
    .select("id, day_of_week, specific_date, filiere_id, schedule_exceptions(exception_date, type)")
    .eq("center_id", cId)
    .eq("session_scope", "collective")
    .eq("mode", "en_ligne");
  const { data: liveSlotRows } = await liveQuery;

  let livesScheduled = 0;
  for (const slot of liveSlotRows || []) {
    if (scoped?.length && slot.filiere_id && !campusFiliereIds.has(slot.filiere_id)) continue;
    const isOneOff = !!slot.specific_date;
    if (isOneOff && slot.specific_date !== todayKey) continue;
    if (!isOneOff && slot.day_of_week !== todayDow) continue;
    const cancelled = (slot.schedule_exceptions || []).some(
      (ex: { exception_date: string; type: string }) =>
        ex.exception_date === todayKey && ex.type === "cancelled",
    );
    if (!cancelled) livesScheduled++;
  }

  let examsCount = examsScheduled.count ?? 0;
  if (filterStudents && examsCount > 0) {
    const { data: openSessions } = await supabaseAdmin
      .from("tcf_exam_sessions")
      .select("id")
      .eq("center_id", cId)
      .in("status", ["scheduled", "open"])
      .gte("scheduled_at", todayStart);
    const ids = (openSessions || []).map((s) => s.id);
    if (ids.length && studentIds.length) {
      const { data: assigns } = await supabaseAdmin
        .from("tcf_exam_assignments")
        .select("session_id, user_id")
        .in("session_id", ids);
      examsCount = new Set(
        (assigns || []).filter((a) => studentIds.includes(a.user_id)).map((a) => a.session_id),
      ).size;
    } else {
      examsCount = 0;
    }
  }

  const msgCount = scoped?.length
    ? await countCampusMessages(cId, [...campusStudentIds])
    : (msgCountRes.count ?? 0);

  let inactiveCount = inactiveStudents.count || 0;
  if (filterStudents) {
    const { data: inactiveRows } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("center_id", cId)
      .eq("role", "student")
      .eq("center_status", "active")
      .lt("last_sign_in_at", threeDaysAgo);
    inactiveCount = (inactiveRows || []).filter((p) => campusStudentIds.has(p.id)).length;
  }

  return {
    totalStudents: viewRows.length,
    enrolledToday: enrolledTodayCount,
    enrolledThisWeek: enrolledThisWeekCount,
    pendingValidation,
    inactiveStudents: inactiveCount,
    onSimulator,
    coursesToday: coursesToday.count ?? 0,
    livesScheduled,
    examsScheduled: examsCount,
    collectedToday,
    latePayments: finAgg.late,
    lateAmount: finAgg.lateAmount,
    msgCount,
  };
}

const EMPTY_GENERIC: GenericDashboardStats = {
  fin: { ca: 0, paid: 0, pending: 0, late: 0 },
  activeStudents: 0,
  coursesCount: 0,
  cancelledCount: 0,
  absent: [],
  exams: [],
  msgCount: 0,
};

const EMPTY_TCF: TcfDashboardStats = {
  totalStudents: 0,
  enrolledToday: 0,
  enrolledThisWeek: 0,
  pendingValidation: 0,
  inactiveStudents: 0,
  onSimulator: 0,
  coursesToday: 0,
  livesScheduled: 0,
  examsScheduled: 0,
  collectedToday: 0,
  latePayments: 0,
  lateAmount: 0,
  msgCount: 0,
};

export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const url = new URL(req.url);
  const requestedCampusId = url.searchParams.get("campusId");
  const isTCF = ctx!.centerType === "tcf_canada";
  const scoped = ctx!.scopedCampusIds;

  try {
    const { data: campuses } = await supabaseAdmin
      .from("campuses")
      .select("id, name")
      .eq("center_id", ctx!.centerId)
      .order("name");

    let campusList = campuses || [];
    if (scoped?.length) campusList = campusList.filter((c) => scoped.includes(c.id));

    const campusId =
      requestedCampusId && campusList.some((c) => c.id === requestedCampusId) ? requestedCampusId : null;

    const stats = isTCF
      ? await loadTcfStats(ctx!.centerId, campusId, scoped)
      : await loadGenericStats(ctx!.centerId, campusId, scoped);

    return NextResponse.json({
      isTCF,
      campuses: campusList,
      generic: isTCF ? null : stats,
      tcf: isTCF ? stats : null,
    });
  } catch (e) {
    console.error("dashboard-stats:", e);
    return NextResponse.json({
      isTCF,
      campuses: [],
      generic: isTCF ? null : EMPTY_GENERIC,
      tcf: isTCF ? EMPTY_TCF : null,
      error: e instanceof Error ? e.message : "Erreur dashboard",
    });
  }
}
