import { supabaseAdmin } from "@/app/utils/center-auth-server";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { groupCount, groupSum, roundPct, sum } from "@/app/utils/reports-aggregate";
import { periodEndIso, periodStartIso, type ReportPeriod } from "@/app/utils/reports-period";
import {
  enrollmentIdsForFiliere,
  filterFinanceRows,
  loadCampuses,
  loadFilieres,
  loadFinanceSummary,
  type FinanceSummaryRow,
} from "@/app/api/center/reports/shared";
import {
  loadEffectifsByFiliereFromView,
} from "@/app/utils/reports-sql-views.server";

export type ReportFilters = {
  period: ReportPeriod;
  campusId: string | null;
  campusIds?: string[] | null;
  filiereId: string | null;
  locale?: "fr" | "en";
};

export type ReportLocale = "fr" | "en";

export function reportLocale(filters: ReportFilters | null | undefined): ReportLocale {
  return filters?.locale === "en" ? "en" : "fr";
}

/** Bilingual label helper for report payloads. */
export function rtl(locale: ReportLocale, fr: string, en: string) {
  return locale === "en" ? en : fr;
}

type EnrollRow = {
  id: string;
  student_id: string;
  status: string | null;
  filiere_id: string;
  niveau_id: string | null;
  groupe_id: string | null;
  campus_id: string | null;
  enrolled_at: string | null;
  filieres: { name?: string } | null;
  niveaux: { annee?: number } | null;
  groupes: { nom?: string } | null;
};

async function loadEnrollments(centerId: string) {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, center_status")
    .eq("center_id", centerId)
    .eq("role", "student");

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  const studentIds = [...profileMap.keys()];
  if (!studentIds.length) return { profiles: profileMap, enrollments: [] as EnrollRow[] };

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id, student_id, status, filiere_id, niveau_id, groupe_id, campus_id, enrolled_at,
      filieres(name),
      niveaux(annee),
      groupes(nom)
    `)
    .in("student_id", studentIds);

  if (error) throw new Error(error.message);
  return { profiles: profileMap, enrollments: (data || []) as EnrollRow[] };
}

function filterEnrollments(rows: EnrollRow[], filters: ReportFilters) {
  let out = rows;
  if (filters.filiereId) out = out.filter((e) => e.filiere_id === filters.filiereId);
  if (filters.campusId) out = out.filter((e) => e.campus_id === filters.campusId);
  else if (filters.campusIds?.length) {
    out = out.filter((e) => e.campus_id && filters.campusIds!.includes(e.campus_id));
  }
  return out;
}

function inPeriod(iso: string | null, period: ReportPeriod) {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= period.from && d <= period.to;
}

async function financeContext(centerId: string, filters: ReportFilters) {
  const all = await loadFinanceSummary(centerId);
  let enrollmentIds: Set<string> | null = null;
  if (filters.filiereId) {
    enrollmentIds = await enrollmentIdsForFiliere(centerId, filters.filiereId);
  }
  return filterFinanceRows(all, {
    campusId: filters.campusId,
    campusIds: filters.campusIds,
    enrollmentIds,
  });
}

function activeFinanceRows(rows: FinanceSummaryRow[]) {
  return rows.filter((r) => r.enrollment_status === "active");
}

export async function buildEffectifsReport(centerId: string, filters: ReportFilters) {
  const { profiles, enrollments: allEnrollments } = await loadEnrollments(centerId);
  const enrollments = filterEnrollments(allEnrollments, filters);

  const statusCount = { active: 0, draft: 0, completed: 0, cancelled: 0 };
  for (const e of enrollments) {
    const st = (e.status || "draft") as keyof typeof statusCount;
    if (st in statusCount) statusCount[st] += 1;
  }

  let paused = 0;
  const seenStudents = new Set<string>();
  for (const e of enrollments) {
    if (seenStudents.has(e.student_id)) continue;
    seenStudents.add(e.student_id);
    const p = profiles.get(e.student_id);
    if (p?.center_status === "paused") paused += 1;
  }

  const flatRows = enrollments.map((e) => {
    const p = profiles.get(e.student_id);
    return {
      prenom: p?.prenom || "",
      nom: p?.nom || "",
      filiere: e.filieres?.name || "—",
      filiereId: e.filiere_id,
      niveau: e.niveaux?.annee ?? null,
      classe: e.groupes?.nom || "—",
      enrollmentStatus: e.status || "draft",
      centerStatus: p?.center_status || "active",
      enrolledAt: e.enrolled_at,
    };
  });

  const newInPeriod = flatRows.filter((r) => inPeriod(r.enrolledAt, filters.period)).length;

  const byPeriodMap = new Map<string, number>();
  for (const r of flatRows) {
    if (!inPeriod(r.enrolledAt, filters.period)) continue;
    const key = r.enrolledAt!.slice(0, 10);
    byPeriodMap.set(key, (byPeriodMap.get(key) || 0) + 1);
  }
  const byPeriod = [...byPeriodMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let byFiliere = groupCount(flatRows, (r) => r.filiereId, (r) => r.filiere);
  if (!filters.campusId && !filters.filiereId) {
    const fromView = await loadEffectifsByFiliereFromView(centerId);
    if (fromView?.length) {
      byFiliere = fromView.map((x) => ({ key: x.label, label: x.label, count: x.count }));
    }
  }

  return {
    period: filters.period,
    kpis: {
      total: enrollments.length,
      active: statusCount.active,
      draft: statusCount.draft,
      completed: statusCount.completed,
      cancelled: statusCount.cancelled,
      paused,
      newInPeriod,
    },
    byPeriod,
    byFiliere,
    byNiveau: groupCount(
      flatRows.filter((r) => r.niveau != null),
      (r) => String(r.niveau),
      (r) => `Niveau ${r.niveau}`,
    ),
    byClasse: groupCount(flatRows, (r) => r.classe, (r) => r.classe),
    byHierarchy: (() => {
      const map = new Map<string, { filiere: string; niveau: string; classe: string; count: number }>();
      for (const r of flatRows) {
        const key = `${r.filiere}|${r.niveau ?? "—"}|${r.classe}`;
        const cur = map.get(key) || {
          filiere: r.filiere,
          niveau: r.niveau != null ? String(r.niveau) : "—",
          classe: r.classe,
          count: 0,
        };
        cur.count += 1;
        map.set(key, cur);
      }
      return [...map.values()].sort((a, b) => b.count - a.count);
    })(),
    rows: flatRows,
  };
}

export async function buildRecouvrementReport(centerId: string, filters: ReportFilters) {
  const allRows = activeFinanceRows(await financeContext(centerId, filters));
  const rows = allRows.filter((r) => {
    if (!r.enrolled_at) return true;
    const d = r.enrolled_at.slice(0, 10);
    return d >= filters.period.from && d <= filters.period.to;
  });
  const caFacture = sum(rows.map((r) => r.tuition_fee));
  const encaisse = sum(rows.map((r) => r.tuition_paid));
  const reste = sum(rows.map((r) => r.reste_a_payer));

  let byFiliere = groupSum(
    rows,
    (r) => r.filiere_name,
    (r) => r.filiere_name,
    (r) => r.tuition_paid,
  ).map((g) => {
    const filiereRows = rows.filter((r) => r.filiere_name === g.label);
    const ca = sum(filiereRows.map((r) => r.tuition_fee));
    const enc = sum(filiereRows.map((r) => r.tuition_paid));
    const rest = sum(filiereRows.map((r) => r.reste_a_payer));
    return { ...g, ca, encaisse: enc, reste: rest, taux: roundPct(enc, ca) };
  });

  return {
    period: filters.period,
    kpis: {
      caFacture,
      encaisse,
      resteARecouvrer: reste,
      tauxRecouvrement: roundPct(encaisse, caFacture),
      nbDossiers: rows.length,
    },
    byFiliere,
    byNiveau: groupSum(
      rows.filter((r) => r.niveau_annee != null),
      (r) => String(r.niveau_annee),
      (r) => `Niveau ${r.niveau_annee}`,
      (r) => r.reste_a_payer,
    ),
    rows: rows
      .filter((r) => r.reste_a_payer > 0)
      .sort((a, b) => b.reste_a_payer - a.reste_a_payer)
      .slice(0, 20)
      .map((r) => ({
      student: `${r.prenom} ${r.nom}`.trim(),
      filiere: r.filiere_name,
      niveau: r.niveau_annee,
      classe: r.groupe_nom,
      ca: r.tuition_fee,
      encaisse: r.tuition_paid,
      reste: r.reste_a_payer,
      statut: r.financial_status,
      nextDueDate: r.next_due_date,
    })),
  };
}

export async function buildEncaissementsReport(centerId: string, filters: ReportFilters) {
  let query = supabaseAdmin
    .from("student_payments")
    .select(`
      id, enrollment_id, amount, payment_method, payment_date,
      enrollments!inner(
        filiere_id,
        campus_id,
        filieres(name),
        profiles:student_id(prenom, nom)
      )
    `)
    .eq("center_id", centerId)
    .gte("payment_date", periodStartIso(filters.period.from))
    .lte("payment_date", periodEndIso(filters.period.to))
    .order("payment_date", { ascending: false });

  const { data, error } = await query.limit(2000);
  if (error) throw new Error(error.message);

  let payments = (data || []) as unknown as {
    id: string;
    enrollment_id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    enrollments: {
      filiere_id: string;
      campus_id: string | null;
      filieres: { name?: string } | null;
      profiles: { prenom?: string; nom?: string } | null;
    };
  }[];

  if (filters.filiereId) {
    payments = payments.filter((p) => p.enrollments?.filiere_id === filters.filiereId);
  }
  if (filters.campusId) {
    payments = payments.filter((p) => p.enrollments?.campus_id === filters.campusId);
  }

  const totalEncaisse = sum(payments.map((p) => p.amount));
  const nbPaiements = payments.length;

  const byDateMap = new Map<string, number>();
  for (const p of payments) {
    const key = p.payment_date.slice(0, 10);
    byDateMap.set(key, (byDateMap.get(key) || 0) + (Number(p.amount) || 0));
  }
  const byPeriod = [...byDateMap.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: filters.period,
    kpis: {
      totalEncaisse,
      nbPaiements,
      panierMoyen: nbPaiements ? Math.round(totalEncaisse / nbPaiements) : 0,
    },
    byPeriod,
    byFiliere: groupSum(
      payments,
      (p) => p.enrollments?.filieres?.name || "—",
      (p) => p.enrollments?.filieres?.name || "—",
      (p) => p.amount,
    ),
    byMode: groupSum(
      payments,
      (p) => p.payment_method || "—",
      (p) => p.payment_method || "—",
      (p) => p.amount,
    ),
    rows: payments.map((p) => ({
      date: p.payment_date.slice(0, 10),
      student: `${p.enrollments?.profiles?.prenom || ""} ${p.enrollments?.profiles?.nom || ""}`.trim(),
      filiere: p.enrollments?.filieres?.name || "—",
      amount: Number(p.amount) || 0,
      method: p.payment_method,
    })),
  };
}

export async function buildRetardsReport(centerId: string, filters: ReportFilters) {
  const rows = activeFinanceRows(await financeContext(centerId, filters));
  const lateRows = rows.filter((r) => {
    if (r.financial_status !== "late") return false;
    if (!r.next_due_date) return true;
    return r.next_due_date.slice(0, 10) <= filters.period.to;
  });

  const montantRetard = sum(lateRows.map((r) => r.reste_a_payer));

  const agingKeys = ["current", "30d", "60d", "90d_plus"] as const;
  const loc = reportLocale(filters);
  const agingLabels: Record<string, string> = {
    current: rtl(loc, "Courant", "Current"),
    "30d": rtl(loc, "1–30 j", "1–30 d"),
    "60d": rtl(loc, "31–60 j", "31–60 d"),
    "90d_plus": rtl(loc, "90 j +", "90 d +"),
  };

  const unpaid = rows.filter((r) => r.financial_status !== "paid" && r.financial_status !== "exempt");
  const byAging: Record<string, { count: number; amount: number; label: string }> = {};
  for (const key of agingKeys) {
    const bucket = unpaid.filter((r) => r.aging_bucket === key);
    byAging[key] = {
      label: agingLabels[key],
      count: bucket.length,
      amount: sum(bucket.map((r) => r.reste_a_payer)),
    };
  }

  let deferralQuery = supabaseAdmin
    .from("enrollment_installments")
    .select("id, deferral_reason, enrollment_id, enrollments!inner(filiere_id, campus_id, filieres!inner(center_id))")
    .eq("enrollments.filieres.center_id", centerId)
    .not("deferral_reason", "is", null);

  const { data: deferrals } = await deferralQuery;
  type DeferralRow = {
    enrollments?: { filiere_id?: string; campus_id?: string | null } | { filiere_id?: string; campus_id?: string | null }[];
  };
  const deferralRows = (deferrals || []) as DeferralRow[];
  let nbMoratoires = deferralRows.length;
  const matchDeferralFilters = (d: DeferralRow) => {
    const en = d.enrollments;
    const enrollment = Array.isArray(en) ? en[0] : en;
    if (filters.filiereId && enrollment?.filiere_id !== filters.filiereId) return false;
    if (filters.campusId && enrollment?.campus_id !== filters.campusId) return false;
    return true;
  };
  if (filters.filiereId || filters.campusId) {
    nbMoratoires = deferralRows.filter(matchDeferralFilters).length;
  }

  return {
    period: filters.period,
    kpis: {
      nbEnRetard: lateRows.length,
      montantRetard,
      nbMoratoires,
    },
    byAging,
    byFiliere: groupSum(
      lateRows,
      (r) => r.filiere_name,
      (r) => r.filiere_name,
      (r) => r.reste_a_payer,
    ),
    rows: lateRows.map((r) => ({
      student: `${r.prenom} ${r.nom}`.trim(),
      filiere: r.filiere_name,
      reste: r.reste_a_payer,
      agingBucket: r.aging_bucket,
      nextDueDate: r.next_due_date,
      lateInstallments: r.late_installments,
    })),
  };
}

function assembleSyntheseReport(
  filters: ReportFilters,
  centerType: string | null | undefined,
  parts: {
    effectifs: Awaited<ReturnType<typeof buildEffectifsReport>>;
    encaissements: Awaited<ReturnType<typeof buildEncaissementsReport>>;
    recouvrement: Awaited<ReturnType<typeof buildRecouvrementReport>>;
    retards: Awaited<ReturnType<typeof buildRetardsReport>>;
    examens: Awaited<ReturnType<typeof buildExamensReport>>;
    filieres: Awaited<ReturnType<typeof buildFilieresReport>> | null;
    personnel: Awaited<ReturnType<typeof buildPersonnelReport>> | null;
    paie: Awaited<ReturnType<typeof buildMasseSalarialeReport>> | null;
  },
) {
  const isTcf = isTcfCanadaCenter(centerType);
  const { effectifs, encaissements, recouvrement, retards, examens, filieres, personnel, paie } = parts;

  const alertes: { level: "danger" | "warning"; label: string; href: string }[] = [];
  const loc = reportLocale(filters);

  if (retards.kpis.nbEnRetard > 0) {
    alertes.push({
      level: retards.kpis.montantRetard > 500_000 ? "danger" : "warning",
      label: rtl(
        loc,
        `${retards.kpis.nbEnRetard} dossier(s) en retard (${retards.kpis.montantRetard.toLocaleString("fr-FR")} FCFA)`,
        `${retards.kpis.nbEnRetard} overdue record(s) (${retards.kpis.montantRetard.toLocaleString("en-US")} FCFA)`,
      ),
      href: "/centre/rapports/retards",
    });
  }
  if (recouvrement.kpis.tauxRecouvrement < 70 && recouvrement.kpis.caFacture > 0) {
    alertes.push({
      level: "warning",
      label: rtl(
        loc,
        `Taux de recouvrement : ${recouvrement.kpis.tauxRecouvrement} %`,
        `Recovery rate: ${recouvrement.kpis.tauxRecouvrement} %`,
      ),
      href: "/centre/rapports/recouvrement",
    });
  }
  if (effectifs.kpis.draft > 0) {
    alertes.push({
      level: "warning",
      label: rtl(
        loc,
        `${effectifs.kpis.draft} inscription(s) en attente de validation`,
        `${effectifs.kpis.draft} enrollment(s) awaiting validation`,
      ),
      href: "/centre/rapports/effectifs-apprenants",
    });
  }
  if (filieres && filieres.kpis.draft > 0) {
    alertes.push({
      level: "warning",
      label: rtl(
        loc,
        `${filieres.kpis.draft} filière(s) en brouillon`,
        `${filieres.kpis.draft} draft program(s)`,
      ),
      href: "/centre/rapports/filieres-programmes",
    });
  }
  if (personnel && personnel.kpis.suspended > 0) {
    alertes.push({
      level: "warning",
      label: rtl(
        loc,
        `${personnel.kpis.suspended} membre(s) du personnel suspendu(s)`,
        `${personnel.kpis.suspended} suspended staff member(s)`,
      ),
      href: "/centre/rapports/effectifs-personnel",
    });
  }

  return {
    period: filters.period,
    centerType: centerType || "generic",
    isTcf,
    kpis: {
      apprenantsActifs: effectifs.kpis.active,
      encaissePeriode: encaissements.kpis.totalEncaisse,
      tauxRecouvrement: recouvrement.kpis.tauxRecouvrement,
      resteARecouvrer: recouvrement.kpis.resteARecouvrer,
      nbRetard: retards.kpis.nbEnRetard,
      montantRetard: retards.kpis.montantRetard,
      nouvellesInscriptions: effectifs.kpis.newInPeriod,
      filieresPubliees: filieres?.kpis.published ?? null,
      staffActifs: personnel?.kpis.active ?? null,
      masseSalarialeNet: paie?.available ? paie.kpis.netTotal : null,
      examensProgrammes: examens.kpis.programmes,
    },
    alertes,
    sections: {
      effectifs: {
        active: effectifs.kpis.active,
        draft: effectifs.kpis.draft,
        paused: effectifs.kpis.paused,
      },
      finance: {
        encaissePeriode: encaissements.kpis.totalEncaisse,
        caFacture: recouvrement.kpis.caFacture,
        reste: recouvrement.kpis.resteARecouvrer,
        taux: recouvrement.kpis.tauxRecouvrement,
      },
      offre: filieres
        ? { total: filieres.kpis.total, published: filieres.kpis.published, draft: filieres.kpis.draft }
        : null,
      rh: personnel
        ? {
            total: personnel.kpis.total,
            academic: personnel.kpis.academic,
            admin: personnel.kpis.administrative,
            active: personnel.kpis.active,
          }
        : null,
      examens: {
        programmes: examens.kpis.programmes,
        realises: examens.kpis.realises,
        annules: examens.kpis.annules,
      },
    },
    charts: {
      encaissementTrend: encaissements.byPeriod.map((p) => ({
        label: p.date.slice(5).replace("-", "/"),
        value: p.amount,
      })),
      encaissementByFiliere: encaissements.byFiliere.map((x) => ({
        label: x.label,
        value: x.amount,
      })),
      effectifsByFiliere: effectifs.byFiliere.map((x) => ({
        label: x.label,
        value: x.count,
      })),
      financeSplit: [
        { label: rtl(loc, "CA facturé", "Invoiced revenue"), value: recouvrement.kpis.caFacture },
        { label: rtl(loc, "Encaissé", "Collected"), value: recouvrement.kpis.encaisse },
        { label: rtl(loc, "Reste", "Balance"), value: recouvrement.kpis.resteARecouvrer },
      ],
      recouvrementByFiliere: recouvrement.byFiliere.map((x) => ({
        label: x.label,
        value: x.taux,
      })),
    },
    summaryTable: [
      { domaine: rtl(loc, "Apprenants", "Learners"), indicateur: rtl(loc, "Actifs", "Active"), valeur: String(effectifs.kpis.active) },
      { domaine: rtl(loc, "Apprenants", "Learners"), indicateur: rtl(loc, "Nouvelles inscriptions", "New enrollments"), valeur: String(effectifs.kpis.newInPeriod) },
      { domaine: rtl(loc, "Finance", "Finance"), indicateur: rtl(loc, "Encaissé (période)", "Collected (period)"), valeur: String(encaissements.kpis.totalEncaisse) },
      { domaine: rtl(loc, "Finance", "Finance"), indicateur: rtl(loc, "Taux recouvrement", "Recovery rate"), valeur: `${recouvrement.kpis.tauxRecouvrement} %` },
      { domaine: rtl(loc, "Finance", "Finance"), indicateur: rtl(loc, "Reste à recouvrer", "Outstanding"), valeur: String(recouvrement.kpis.resteARecouvrer) },
      { domaine: rtl(loc, "Finance", "Finance"), indicateur: rtl(loc, "Dossiers en retard", "Overdue records"), valeur: String(retards.kpis.nbEnRetard) },
      { domaine: rtl(loc, "Activité", "Activity"), indicateur: rtl(loc, "Examens programmés", "Scheduled exams"), valeur: String(examens.kpis.programmes) },
    ],
  };
}

export async function buildSyntheseReport(centerId: string, filters: ReportFilters, centerType?: string | null) {
  /** §8 multi-campus : la synthèse globale ignore campus et filière. */
  const globalFilters: ReportFilters = { ...filters, campusId: null, filiereId: null };

  const [effectifs, encaissements, recouvrement, retards, examens] = await Promise.all([
    buildEffectifsReport(centerId, globalFilters),
    buildEncaissementsReport(centerId, globalFilters),
    buildRecouvrementReport(centerId, globalFilters),
    buildRetardsReport(centerId, globalFilters),
    buildExamensReport(centerId, globalFilters, centerType),
  ]);

  const [filieres, personnel, paie] = await Promise.all([
    buildFilieresReport(centerId, globalFilters),
    buildPersonnelReport(centerId, globalFilters),
    buildMasseSalarialeReport(centerId, globalFilters),
  ]);

  return assembleSyntheseReport(globalFilters, centerType, {
    effectifs,
    encaissements,
    recouvrement,
    retards,
    examens,
    filieres,
    personnel,
    paie,
  });
}

export async function buildReportsBundle(centerId: string, filters: ReportFilters, centerType?: string | null) {
  const [
    synthese,
    effectifs,
    encaissements,
    recouvrement,
    retards,
    examens,
    filieres,
    personnel,
    paie,
    reductions,
    campuses,
    filieresOptions,
  ] = await Promise.all([
    buildSyntheseReport(centerId, filters, centerType),
    buildEffectifsReport(centerId, filters),
    buildEncaissementsReport(centerId, filters),
    buildRecouvrementReport(centerId, filters),
    buildRetardsReport(centerId, filters),
    buildExamensReport(centerId, filters, centerType),
    buildFilieresReport(centerId, filters),
    buildPersonnelReport(centerId, filters),
    buildMasseSalarialeReport(centerId, filters),
    buildReductionsReport(centerId, filters),
    loadCampuses(centerId),
    loadFilieres(centerId),
  ]);

  return {
    reports: {
      synthese,
      "effectifs-apprenants": effectifs,
      encaissements,
      recouvrement,
      retards,
      "reductions-coupons": reductions,
      examens,
      "filieres-programmes": filieres,
      "effectifs-personnel": personnel,
      "masse-salariale": paie,
    },
    campuses,
    filieres: filieresOptions,
  };
}

const ADMIN_ROLES = new Set(["campus_manager", "staff"]);
const ACADEMIC_ROLES = new Set(["trainer"]);

function periodYmRange(from: string, to: string) {
  return { fromYm: from.slice(0, 7), toYm: to.slice(0, 7) };
}

function inPeriodDate(iso: string | null, period: ReportFilters["period"]) {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= period.from && d <= period.to;
}

export async function buildFilieresReport(centerId: string, filters: ReportFilters) {
  const { data: rows, error } = await supabaseAdmin
    .from("filieres")
    .select(`
      id, name, type, mode, status, created_at, nb_niveaux, default_tuition_fee,
      filiere_campus(campus_id)
    `)
    .eq("center_id", centerId)
    .order("name");

  if (error) throw new Error(error.message);

  let filieres = (rows || []) as {
    id: string;
    name: string;
    type: string | null;
    mode: string | null;
    status: string;
    created_at: string;
    nb_niveaux: number | null;
    default_tuition_fee: number | null;
    filiere_campus: { campus_id: string }[] | null;
  }[];

  if (filters.campusId) {
    filieres = filieres.filter((f) =>
      (f.filiere_campus || []).some((c) => c.campus_id === filters.campusId),
    );
  }
  if (filters.filiereId) {
    filieres = filieres.filter((f) => f.id === filters.filiereId);
  }

  const filiereIds = filieres.map((f) => f.id);
  let enrollRows: { filiere_id: string; status: string | null }[] = [];
  if (filiereIds.length > 0) {
    const { data, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("filiere_id, status")
      .in("filiere_id", filiereIds)
      .eq("status", "active");
    if (enrollError) throw new Error(enrollError.message);
    enrollRows = data || [];
  }

  const { data: campusRows } = await supabaseAdmin
    .from("campuses")
    .select("id, name")
    .eq("center_id", centerId);
  const campusNameById = new Map((campusRows || []).map((c) => [c.id, c.name]));

  const byCampusMap = new Map<string, number>();
  const loc = reportLocale(filters);
  const unassigned = rtl(loc, "Non assigné", "Unassigned");
  for (const f of filieres) {
    const links = f.filiere_campus || [];
    if (links.length === 0) {
      byCampusMap.set(unassigned, (byCampusMap.get(unassigned) || 0) + 1);
      continue;
    }
    for (const link of links) {
      const label = campusNameById.get(link.campus_id) || "Campus";
      byCampusMap.set(label, (byCampusMap.get(label) || 0) + 1);
    }
  }
  const byCampus = [...byCampusMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const activeByFiliere = new Map<string, number>();
  for (const e of enrollRows || []) {
    activeByFiliere.set(e.filiere_id, (activeByFiliere.get(e.filiere_id) || 0) + 1);
  }

  const published = filieres.filter((f) => f.status === "published").length;
  const draft = filieres.filter((f) => f.status === "draft").length;
  const cursus = filieres.filter((f) => f.type === "cursus").length;
  const courte = filieres.filter((f) => f.type === "formation_courte").length;
  const newInPeriod = filieres.filter((f) => inPeriodDate(f.created_at, filters.period)).length;

  const flatRows = filieres.map((f) => ({
    name: f.name,
    type: f.type === "cursus"
      ? rtl(loc, "Cursus", "Curriculum")
      : f.type === "formation_courte"
        ? rtl(loc, "Formation courte", "Short course")
        : f.type || "—",
    status: f.status === "published" ? rtl(loc, "Publié", "Published") : rtl(loc, "Brouillon", "Draft"),
    mode: f.mode || "—",
    niveaux: f.nb_niveaux ?? "—",
    effectifActif: activeByFiliere.get(f.id) || 0,
    tuition: f.default_tuition_fee ?? 0,
    createdAt: f.created_at?.slice(0, 10) || "—",
  }));

  return {
    period: filters.period,
    kpis: {
      total: filieres.length,
      published,
      draft,
      cursus,
      formationCourte: courte,
      newInPeriod,
    },
    byStatus: [
      { label: rtl(loc, "Publiées", "Published"), count: published },
      { label: rtl(loc, "Brouillon", "Draft"), count: draft },
    ],
    byType: [
      { label: rtl(loc, "Cursus", "Curriculum"), count: cursus },
      { label: rtl(loc, "Formation courte", "Short course"), count: courte },
    ],
    byCampus,
    rows: flatRows,
  };
}

export async function buildPersonnelReport(centerId: string, filters: ReportFilters) {
  const { data: staffRows, error } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, role, center_status, job_title, base_salary")
    .eq("center_id", centerId)
    .in("role", ["campus_manager", "trainer", "staff"]);

  if (error) throw new Error(error.message);

  let staff = staffRows || [];
  const ids = staff.map((s) => s.id);

  let campusByStaff = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: accessRows } = await supabaseAdmin
      .from("staff_campus_access")
      .select("profile_id, campus_id")
      .in("profile_id", ids);
    for (const row of accessRows || []) {
      const list = campusByStaff.get(row.profile_id) || [];
      list.push(row.campus_id);
      campusByStaff.set(row.profile_id, list);
    }
  }

  if (filters.campusId) {
    staff = staff.filter((s) => (campusByStaff.get(s.id) || []).includes(filters.campusId!));
  } else if (filters.campusIds?.length) {
    staff = staff.filter((s) => (campusByStaff.get(s.id) || []).some((id) => filters.campusIds!.includes(id)));
  }

  if (filters.filiereId) {
    const { data: groupes } = await supabaseAdmin.from("groupes").select("id").eq("filiere_id", filters.filiereId);
    const gids = (groupes || []).map((g) => g.id);
    if (gids.length === 0) {
      staff = staff.filter((s) => s.role !== "trainer");
    } else {
      const { data: fg, error: fgErr } = await supabaseAdmin
        .from("formateur_groupes")
        .select("formateur_id")
        .in("groupe_id", gids);
      if (!fgErr) {
        const trainerIds = new Set((fg || []).map((r) => r.formateur_id));
        staff = staff.filter((s) => s.role !== "trainer" || trainerIds.has(s.id));
      }
    }
  }

  let academic = 0;
  let administrative = 0;
  let active = 0;
  let suspended = 0;

  for (const s of staff) {
    if (ACADEMIC_ROLES.has(s.role)) academic += 1;
    else if (ADMIN_ROLES.has(s.role)) administrative += 1;
    if (s.center_status === "active") active += 1;
    else suspended += 1;
  }

  const loc = reportLocale(filters);
  const ROLE_LABEL: Record<string, string> = {
    trainer: rtl(loc, "Formateur", "Trainer"),
    staff: rtl(loc, "Agent administratif", "Administrative staff"),
    campus_manager: rtl(loc, "Directeur de campus", "Campus manager"),
  };

  const rows = staff.map((s) => ({
    name: `${s.prenom || ""} ${s.nom || ""}`.trim(),
    role: ROLE_LABEL[s.role] || s.role,
    category: ACADEMIC_ROLES.has(s.role)
      ? rtl(loc, "Académique", "Academic")
      : rtl(loc, "Administratif", "Administrative"),
    status: s.center_status === "active" ? rtl(loc, "Actif", "Active") : rtl(loc, "Suspendu", "Suspended"),
    jobTitle: s.job_title || "—",
    baseSalary: Number(s.base_salary) || 0,
  }));

  return {
    period: filters.period,
    kpis: {
      total: staff.length,
      academic,
      administrative,
      active,
      suspended,
    },
    byRole: groupCount(rows, (r) => r.role, (r) => r.role),
    byCategory: [
      { label: rtl(loc, "Académique", "Academic"), count: academic },
      { label: rtl(loc, "Administratif", "Administrative"), count: administrative },
    ],
    rows,
  };
}

function isMissingPayrollTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return err.code === "42P01" || msg.includes("staff_payroll") || msg.includes("does not exist");
}

export async function buildMasseSalarialeReport(centerId: string, filters: ReportFilters) {
  const { fromYm, toYm } = periodYmRange(filters.period.from, filters.period.to);

  const { data: periods, error: pErr } = await supabaseAdmin
    .from("staff_payroll_periods")
    .select("id, staff_id, period_ym, base_salary_snapshot, status")
    .eq("center_id", centerId)
    .gte("period_ym", fromYm)
    .lte("period_ym", toYm)
    .order("period_ym", { ascending: false });

  if (pErr && isMissingPayrollTable(pErr)) {
    const loc = reportLocale(filters);
    return {
      period: filters.period,
      available: false as const,
      message: rtl(
        loc,
        "Tables paie absentes — exécutez supabase-staff-payroll.sql dans Supabase.",
        "Payroll tables missing — run supabase-staff-payroll.sql in Supabase.",
      ),
      kpis: {
        netTotal: 0,
        brutTotal: 0,
        paidTotal: 0,
        primesTotal: 0,
        retenuesTotal: 0,
        nbBulletins: 0,
        nbPayes: 0,
      },
      byStatus: [] as { label: string; count: number; amount: number }[],
      rows: [] as Record<string, string | number>[],
    };
  }
  if (pErr) throw new Error(pErr.message);

  const periodListRaw = periods || [];
  const periodIds = periodListRaw.map((p) => p.id);

  let lines: { period_id: string; type: string; amount: number }[] = [];
  let payments: { period_id: string; amount: number }[] = [];

  if (periodIds.length > 0) {
    const [{ data: lineRows }, { data: payRows }] = await Promise.all([
      supabaseAdmin
        .from("staff_payroll_lines")
        .select("period_id, type, amount")
        .in("period_id", periodIds),
      supabaseAdmin
        .from("staff_payroll_payments")
        .select("period_id, amount")
        .in("period_id", periodIds),
    ]);
    lines = (lineRows || []) as typeof lines;
    payments = (payRows || []) as typeof payments;
  }

  let campusByStaff = new Map<string, string[]>();
  const allStaffIds = [...new Set(periodListRaw.map((p) => p.staff_id))];
  if (allStaffIds.length > 0) {
    const { data: accessRows } = await supabaseAdmin
      .from("staff_campus_access")
      .select("profile_id, campus_id")
      .in("profile_id", allStaffIds);
    for (const row of accessRows || []) {
      const list = campusByStaff.get(row.profile_id) || [];
      list.push(row.campus_id);
      campusByStaff.set(row.profile_id, list);
    }
  }

  let periodList = periodListRaw;
  if (filters.campusId) {
    periodList = periodList.filter((p) =>
      (campusByStaff.get(p.staff_id) || []).includes(filters.campusId!),
    );
  } else if (filters.campusIds?.length) {
    periodList = periodList.filter((p) =>
      (campusByStaff.get(p.staff_id) || []).some((id) => filters.campusIds!.includes(id)),
    );
  }

  if (filters.filiereId) {
    const { data: groupes } = await supabaseAdmin.from("groupes").select("id").eq("filiere_id", filters.filiereId);
    const gids = (groupes || []).map((g) => g.id);
    let trainerIds = new Set<string>();
    if (gids.length > 0) {
      const { data: fg, error: fgErr } = await supabaseAdmin
        .from("formateur_groupes")
        .select("formateur_id")
        .in("groupe_id", gids);
      if (!fgErr) trainerIds = new Set((fg || []).map((r) => r.formateur_id));
    }
    periodList = periodList.filter((p) => trainerIds.has(p.staff_id));
  }

  const staffIds = [...new Set(periodList.map((p) => p.staff_id))];
  const { data: staffProfiles } = staffIds.length
    ? await supabaseAdmin.from("profiles").select("id, prenom, nom").in("id", staffIds)
    : { data: [] };
  const staffMap = new Map((staffProfiles || []).map((p) => [p.id, p]));

  let brutTotal = 0;
  let netTotal = 0;
  let paidTotal = 0;
  let primesTotal = 0;
  let retenuesTotal = 0;
  let nbPayes = 0;

  const detailRows: {
    staff: string;
    period: string;
    base: number;
    primes: number;
    retenues: number;
    net: number;
    paid: number;
    status: string;
  }[] = [];

  const statusAgg = new Map<string, { count: number; amount: number }>();

  for (const p of periodList) {
    const pLines = lines.filter((l) => l.period_id === p.id);
    const pPayments = payments.filter((pay) => pay.period_id === p.id);
    const primes = pLines
      .filter((l) => l.type === "prime" || l.type === "ajustement")
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const retenues = pLines
      .filter((l) => l.type === "retenue")
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const base = Number(p.base_salary_snapshot) || 0;
    const brut = base + primes;
    const net = Math.max(0, brut - retenues);
    const paid = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);

    brutTotal += brut;
    netTotal += net;
    paidTotal += paid;
    primesTotal += primes;
    retenuesTotal += retenues;
    if (p.status === "paid") nbPayes += 1;

    const st = p.status || "draft";
    const cur = statusAgg.get(st) || { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += net;
    statusAgg.set(st, cur);

    const prof = staffMap.get(p.staff_id);
    detailRows.push({
      staff: prof ? `${prof.prenom || ""} ${prof.nom || ""}`.trim() : "—",
      period: p.period_ym,
      base,
      primes,
      retenues,
      net,
      paid,
      status: st,
    });
  }

  const loc = reportLocale(filters);
  const STATUS_LABEL: Record<string, string> = {
    draft: rtl(loc, "Brouillon", "Draft"),
    validated: rtl(loc, "Validé", "Validated"),
    paid: rtl(loc, "Payé", "Paid"),
  };

  return {
    period: filters.period,
    available: true as const,
    kpis: {
      netTotal,
      brutTotal,
      paidTotal,
      primesTotal,
      retenuesTotal,
      nbBulletins: periodList.length,
      nbPayes,
    },
    byStatus: [...statusAgg.entries()].map(([key, val]) => ({
      label: STATUS_LABEL[key] || key,
      count: val.count,
      amount: val.amount,
    })),
    rows: detailRows.map((r) => ({
      staff: r.staff,
      period: r.period,
      base: r.base,
      primes: r.primes,
      retenues: r.retenues,
      net: r.net,
      paid: r.paid,
      status: STATUS_LABEL[r.status] || r.status,
    })),
  };
}

export async function buildExamensReport(
  centerId: string,
  filters: ReportFilters,
  centerType?: string | null,
) {
  const start = periodStartIso(filters.period.from);
  const end = periodEndIso(filters.period.to);
  const isTcf = isTcfCanadaCenter(centerType);

  if (isTcf) {
    const { data: tcfSessions, error: tcfErr } = await supabaseAdmin
      .from("tcf_exam_sessions")
      .select("id, title, examen_id, scheduled_at, status, session_type")
      .eq("center_id", centerId)
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .order("scheduled_at", { ascending: false });

    if (tcfErr && !isMissingPayrollTable(tcfErr)) throw new Error(tcfErr.message);

    const sessions = (tcfSessions || []) as {
      id: string;
      title: string;
      examen_id: number;
      scheduled_at: string;
      status: string;
      session_type: string;
    }[];

    let sessionList = sessions;
    if (filters.campusId || filters.campusIds?.length || filters.filiereId) {
      const { enrollments } = await loadEnrollments(centerId);
      const scoped = filterEnrollments(enrollments, filters);
      const studentIds = new Set(scoped.map((e) => e.student_id));
      const sessionIdsAll = sessionList.map((s) => s.id);
      if (sessionIdsAll.length > 0 && studentIds.size > 0) {
        const { data: assigns } = await supabaseAdmin
          .from("tcf_exam_assignments")
          .select("session_id, user_id")
          .in("session_id", sessionIdsAll);
        const keep = new Set(
          (assigns || [])
            .filter((a) => studentIds.has(a.user_id))
            .map((a) => a.session_id),
        );
        sessionList = sessionList.filter((s) => keep.has(s.id));
      } else {
        sessionList = [];
      }
    }

    let programmes = 0;
    let realises = 0;
    let annules = 0;
    let enCours = 0;

    for (const s of sessionList) {
      if (s.status === "cancelled") annules += 1;
      else if (s.status === "closed") realises += 1;
      else if (s.status === "open") enCours += 1;
      else programmes += 1;
    }

    const sessionIds = sessionList.map((s) => s.id);
    let participations = 0;
    if (sessionIds.length > 0) {
      const { data: assigns } = await supabaseAdmin
        .from("tcf_exam_assignments")
        .select("id, status")
        .in("session_id", sessionIds);
      participations = (assigns || []).filter((a) => a.status === "completed").length;
    }

    const loc = reportLocale(filters);
    const STATUS_UI: Record<string, string> = {
      planned: rtl(loc, "Programmé", "Scheduled"),
      open: rtl(loc, "Ouvert", "Open"),
      closed: rtl(loc, "Réalisé", "Completed"),
      cancelled: rtl(loc, "Annulé", "Cancelled"),
    };

    return {
      period: filters.period,
      centerType: centerType || "tcf_canada",
      source: "tcf" as const,
      kpis: {
        programmes,
        realises,
        annules,
        enCours,
        participations,
        genericCompleted: 0,
        totalSessions: sessionList.length,
      },
      byStatus: [
        { label: rtl(loc, "Programmés", "Scheduled"), count: programmes },
        { label: rtl(loc, "En cours", "In progress"), count: enCours },
        { label: rtl(loc, "Réalisés", "Completed"), count: realises },
        { label: rtl(loc, "Annulés", "Cancelled"), count: annules },
      ],
      rows: sessionList.map((s) => ({
        title: s.title,
        examenId: s.examen_id,
        date: s.scheduled_at.slice(0, 10),
        heure: new Date(s.scheduled_at).toLocaleTimeString(loc === "en" ? "en-US" : "fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: s.session_type === "exceptional"
          ? rtl(loc, "Exceptionnel", "Exceptional")
          : rtl(loc, "Planifié", "Planned"),
        status: STATUS_UI[s.status] || s.status,
        student: "—",
      })),
    };
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom")
    .eq("center_id", centerId)
    .eq("role", "student");

  let studentIds = (profiles || []).map((p) => p.id);
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  if ((filters.campusId || filters.campusIds?.length || filters.filiereId) && studentIds.length > 0) {
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, campus_id, filiere_id")
      .in("student_id", studentIds);
    studentIds = [
      ...new Set(
        (enrollments || [])
          .filter((e) => {
            if (filters.filiereId && e.filiere_id !== filters.filiereId) return false;
            if (filters.campusId) return e.campus_id === filters.campusId;
            if (filters.campusIds?.length) return !!e.campus_id && filters.campusIds.includes(e.campus_id);
            return true;
          })
          .map((e) => e.student_id),
      ),
    ];
  }

  type GenericSession = {
    id: string;
    examen_id: number;
    status: string;
    started_at: string;
    finished_at: string | null;
    user_id: string;
  };

  let genericSessions: GenericSession[] = [];
  if (studentIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("exam_sessions")
      .select("id, examen_id, status, started_at, finished_at, user_id")
      .in("user_id", studentIds)
      .gte("started_at", start)
      .lte("started_at", end)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    genericSessions = (data || []) as GenericSession[];
  }

  let programmes = 0;
  let realises = 0;
  let annules = 0;
  let enCours = 0;

  for (const s of genericSessions) {
    if (s.status === "abandoned") annules += 1;
    else if (s.status === "completed") realises += 1;
    else enCours += 1;
  }

  const loc = reportLocale(filters);
  const STATUS_UI: Record<string, string> = {
    in_progress: rtl(loc, "En cours", "In progress"),
    completed: rtl(loc, "Réalisé", "Completed"),
    abandoned: rtl(loc, "Abandonné", "Abandoned"),
  };

  return {
    period: filters.period,
    centerType: centerType || "generic",
    source: "generic" as const,
    kpis: {
      programmes: enCours,
      realises,
      annules,
      enCours,
      participations: realises,
      genericCompleted: realises,
      totalSessions: genericSessions.length,
    },
    byStatus: [
      { label: rtl(loc, "En cours", "In progress"), count: enCours },
      { label: rtl(loc, "Réalisés", "Completed"), count: realises },
      { label: rtl(loc, "Abandonnés", "Abandoned"), count: annules },
    ],
    rows: genericSessions.map((s) => {
      const p = profileMap.get(s.user_id);
      return {
        title: rtl(loc, `Examen n° ${s.examen_id}`, `Exam #${s.examen_id}`),
        examenId: s.examen_id,
        date: s.started_at.slice(0, 10),
        heure: new Date(s.started_at).toLocaleTimeString(loc === "en" ? "en-US" : "fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: rtl(loc, "Simulateur", "Simulator"),
        status: STATUS_UI[s.status] || s.status,
        student: p ? `${p.prenom || ""} ${p.nom || ""}`.trim() : "—",
      };
    }),
  };
}

export async function buildReductionsReport(centerId: string, filters: ReportFilters) {
  const financeRows = await financeContext(centerId, filters);
  const enrollmentIds = financeRows.map((r) => r.enrollment_id);

  let discountByEnrollment: Record<
    string,
    { discount_amount: number; discount_reason: string | null; enrolled_at: string | null }
  > = {};

  if (enrollmentIds.length > 0) {
    const { data: discRows, error } = await supabaseAdmin
      .from("enrollments")
      .select("id, discount_amount, discount_reason, enrolled_at")
      .in("id", enrollmentIds);
    if (error) throw new Error(error.message);
    discountByEnrollment = Object.fromEntries(
      (discRows || []).map(
        (e: {
          id: string;
          discount_amount: number | null;
          discount_reason: string | null;
          enrolled_at: string | null;
        }) => [
          e.id,
          {
            discount_amount: Number(e.discount_amount) || 0,
            discount_reason: e.discount_reason ?? null,
            enrolled_at: e.enrolled_at,
          },
        ],
      ),
    );
  }

  const rows = financeRows
    .map((r) => {
      const disc = discountByEnrollment[r.enrollment_id];
      const amount = disc?.discount_amount ?? 0;
      return {
        student: `${r.prenom} ${r.nom}`.trim(),
        filiere: r.filiere_name,
        amount,
        reason: disc?.discount_reason || "—",
        enrolledAt: disc?.enrolled_at?.slice(0, 10) || "—",
        tuitionFee: r.tuition_fee,
      };
    })
    .filter((r) => r.amount > 0);

  const displayRows = rows.filter((r) => r.enrolledAt === "—" || inPeriod(r.enrolledAt, filters.period));
  const totalReductions = sum(displayRows.map((r) => r.amount));

  const { data: coupons, error: couponErr } = await supabaseAdmin
    .from("coupons")
    .select("id, code, type, value, uses_count, max_uses, is_active, expires_at")
    .eq("center_id", centerId)
    .order("code");

  if (couponErr && !String(couponErr.message).includes("does not exist")) {
    throw new Error(couponErr.message);
  }

  const couponList = (coupons || []) as {
    id: string;
    code: string;
    type: string;
    value: number;
    uses_count: number;
    max_uses: number | null;
    is_active: boolean;
    expires_at: string | null;
  }[];

  const byReason = groupSum(
    displayRows,
    (r) => r.reason,
    (r) => r.reason,
    (r) => r.amount,
  );

  const byFiliere = groupSum(
    displayRows,
    (r) => r.filiere,
    (r) => r.filiere,
    (r) => r.amount,
  );

  return {
    period: filters.period,
    kpis: {
      totalReductions,
      nbDossiers: displayRows.length,
      nbCouponsActifs: couponList.filter((c) => {
        if (!c.is_active) return false;
        if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return false;
        return true;
      }).length,
      utilisationsCoupons: sum(couponList.map((c) => c.uses_count)),
    },
    byReason,
    byFiliere,
    coupons: couponList.map((c) => {
      const expired = !!(c.expires_at && new Date(c.expires_at).getTime() < Date.now());
      return {
        code: c.code,
        type: c.type === "percentage" ? `${c.value} %` : `${c.value.toLocaleString("fr-FR")} FCFA`,
        uses: c.uses_count,
        maxUses: c.max_uses,
        active: !!c.is_active && !expired,
        expiresAt: c.expires_at?.slice(0, 10) || "—",
      };
    }),
    rows: displayRows
      .sort((a, b) => b.amount - a.amount)
      .map((r) => ({
        student: r.student,
        filiere: r.filiere,
        amount: r.amount,
        reason: r.reason,
        enrolledAt: r.enrolledAt,
      })),
  };
}

