import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";

type LineType = "prime" | "retenue" | "ajustement";
type PeriodStatus = "draft" | "validated" | "paid";

function isMissingTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "42P01" ||
    msg.includes("staff_payroll") ||
    msg.includes("does not exist") ||
    msg.includes("n'existe pas")
  );
}

function missingTableResponse() {
  return NextResponse.json(
    {
      error: "Tables paie absentes — exécutez supabase-staff-payroll.sql dans Supabase.",
      code: "MISSING_TABLE",
    },
    { status: 503 },
  );
}

async function assertStaffInCenter(staffId: string, centerId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, base_salary, prime, prenom, nom")
    .eq("id", staffId)
    .maybeSingle();

  if (!data) return { ok: false as const, error: "Membre introuvable." };
  if (data.center_id && data.center_id !== centerId) {
    return { ok: false as const, error: "Membre hors de votre centre." };
  }
  return { ok: true as const, staff: data };
}

async function loadPeriodBundle(periodId: string) {
  const [{ data: period, error: pErr }, { data: lines }, { data: payments }] = await Promise.all([
    supabaseAdmin.from("staff_payroll_periods").select("*").eq("id", periodId).maybeSingle(),
    supabaseAdmin
      .from("staff_payroll_lines")
      .select("id, type, amount, reason, created_by, created_at")
      .eq("period_id", periodId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("staff_payroll_payments")
      .select("id, amount, payment_method, payment_date, notes, recorded_by, created_at")
      .eq("period_id", periodId)
      .order("payment_date", { ascending: false }),
  ]);

  if (pErr && isMissingTable(pErr)) return { missing: true as const };
  if (!period) return { missing: false as const, period: null, lines: [], payments: [], totals: null };

  const primes = (lines || [])
    .filter((l) => l.type === "prime" || l.type === "ajustement")
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const retenues = (lines || [])
    .filter((l) => l.type === "retenue")
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const base = Number(period.base_salary_snapshot) || 0;
  const paid = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  // Comptabilité bulletin : Brut = Base + Primes ; Net = Brut − Retenues ; Reste = Net − Versé
  // Les montants viennent de staff_payroll_lines (persistés) — pas de profiles.prime / base_salary (contrat RH).
  const brut = base + primes;
  const net = Math.max(0, brut - retenues);

  return {
    missing: false as const,
    period,
    lines: lines || [],
    payments: payments || [],
    totals: {
      base,
      primes,
      retenues,
      brut,
      net,
      paid,
      reste: Math.max(0, net - paid),
    },
  };
}

export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const url = new URL(req.url);
  const staffId = url.searchParams.get("staff_id");
  const periodYm = url.searchParams.get("period") || currentPeriodYm();

  if (!staffId) {
    return NextResponse.json({ error: "staff_id requis." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(periodYm)) {
    return NextResponse.json({ error: "Période invalide (YYYY-MM)." }, { status: 400 });
  }

  const check = await assertStaffInCenter(staffId, ctx!.centerId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

  const { data: existing, error: findErr } = await supabaseAdmin
    .from("staff_payroll_periods")
    .select("id")
    .eq("staff_id", staffId)
    .eq("period_ym", periodYm)
    .maybeSingle();

  if (findErr && isMissingTable(findErr)) return missingTableResponse();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });

  let periodId = existing?.id as string | undefined;

  // Auto-create draft period from contrat (base_salary snapshot) — n'écrit pas sur profiles
  if (!periodId) {
    const baseSnap = Number(check.staff.base_salary) || 0;
    const { data: created, error: createErr } = await supabaseAdmin
      .from("staff_payroll_periods")
      .insert({
        center_id: ctx!.centerId,
        staff_id: staffId,
        period_ym: periodYm,
        base_salary_snapshot: baseSnap,
        status: "draft",
        created_by: ctx!.user.id,
      })
      .select("id")
      .single();

    if (createErr && isMissingTable(createErr)) return missingTableResponse();
    if (createErr) {
      // Race: période créée entre temps
      const { data: again } = await supabaseAdmin
        .from("staff_payroll_periods")
        .select("id")
        .eq("staff_id", staffId)
        .eq("period_ym", periodYm)
        .maybeSingle();
      if (!again?.id) return NextResponse.json({ error: createErr.message }, { status: 500 });
      periodId = again.id;
    } else {
      periodId = created.id;
    }
  }

  const bundle = await loadPeriodBundle(periodId!);
  if (bundle.missing) return missingTableResponse();

  // Liste des périodes existantes (historique)
  const { data: history } = await supabaseAdmin
    .from("staff_payroll_periods")
    .select("id, period_ym, status, base_salary_snapshot")
    .eq("staff_id", staffId)
    .order("period_ym", { ascending: false })
    .limit(24);

  return NextResponse.json({
    contract: {
      base_salary: Number(check.staff.base_salary) || 0,
      prime: Number(check.staff.prime) || 0,
      name: `${check.staff.prenom || ""} ${check.staff.nom || ""}`.trim(),
    },
    periodYm,
    ...bundle,
    history: history || [],
  });
}

function currentPeriodYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Body =
  | { action: "add_line"; period_id: string; type: LineType; amount: number; reason: string }
  | { action: "update_line"; line_id: string; amount: number; reason: string; type?: LineType }
  | { action: "delete_line"; line_id: string }
  | { action: "record_payment"; period_id: string; amount: number; payment_method: string; payment_date?: string; notes?: string }
  | { action: "update_payment"; payment_id: string; amount: number; payment_method: string; payment_date: string; notes?: string }
  | { action: "delete_payment"; payment_id: string }
  | { action: "set_status"; period_id: string; status: PeriodStatus }
  | { action: "reopen"; period_id: string }
  | { action: "update_base_snapshot"; period_id: string; base_salary_snapshot: number };

async function refreshPeriodStatus(periodId: string) {
  const bundle = await loadPeriodBundle(periodId);
  if (bundle.missing || !bundle.totals || !bundle.period) return bundle;
  let next: PeriodStatus = "draft";
  if (bundle.totals.paid > 0 && bundle.totals.reste <= 0) next = "paid";
  else if (bundle.totals.paid > 0 || bundle.period.status === "validated") next = bundle.totals.reste <= 0 ? "paid" : "validated";
  // Keep validated if explicitly set and no payment yet
  if (bundle.period.status === "validated" && bundle.totals.paid === 0) next = "validated";
  if (bundle.period.status === "draft" && bundle.totals.paid === 0) next = "draft";
  if (next !== bundle.period.status) {
    await supabaseAdmin
      .from("staff_payroll_periods")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", periodId);
    return loadPeriodBundle(periodId);
  }
  return bundle;
}

export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body?.action) {
    return NextResponse.json({ error: "Action manquante." }, { status: 400 });
  }

  const actor = ctx!.user.id;

  async function assertPeriod(periodId: string) {
    const { data, error: e } = await supabaseAdmin
      .from("staff_payroll_periods")
      .select("id, center_id, status, staff_id")
      .eq("id", periodId)
      .maybeSingle();
    if (e && isMissingTable(e)) return { missing: true as const };
    if (!data || data.center_id !== ctx!.centerId) {
      return { missing: false as const, ok: false as const, error: "Période introuvable." };
    }
    return { missing: false as const, ok: true as const, period: data };
  }

  // Primes / retenues : saisissables tout le mois (corrections autorisées)
  if (body.action === "add_line") {
    const check = await assertPeriod(body.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });
    const amount = Math.round(Number(body.amount) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    if (!["prime", "retenue", "ajustement"].includes(body.type)) {
      return NextResponse.json({ error: "Type de ligne invalide." }, { status: 400 });
    }
    if (!String(body.reason || "").trim()) {
      return NextResponse.json({ error: "Motif obligatoire." }, { status: 400 });
    }

    const { error: insErr } = await supabaseAdmin.from("staff_payroll_lines").insert({
      period_id: body.period_id,
      type: body.type,
      amount,
      reason: body.reason.trim(),
      created_by: actor,
    });
    if (insErr && isMissingTable(insErr)) return missingTableResponse();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    await supabaseAdmin
      .from("staff_payroll_periods")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", body.period_id);

    return NextResponse.json(await refreshPeriodStatus(body.period_id));
  }

  if (body.action === "update_line") {
    const { data: line, error: lErr } = await supabaseAdmin
      .from("staff_payroll_lines")
      .select("id, period_id")
      .eq("id", body.line_id)
      .maybeSingle();
    if (lErr && isMissingTable(lErr)) return missingTableResponse();
    if (!line) return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
    const check = await assertPeriod(line.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });

    const amount = Math.round(Number(body.amount) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
    if (!String(body.reason || "").trim()) {
      return NextResponse.json({ error: "Motif obligatoire." }, { status: 400 });
    }
    const patch: Record<string, unknown> = {
      amount,
      reason: body.reason.trim(),
    };
    if (body.type && ["prime", "retenue", "ajustement"].includes(body.type)) {
      patch.type = body.type;
    }
    const { error: uErr } = await supabaseAdmin.from("staff_payroll_lines").update(patch).eq("id", body.line_id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json(await refreshPeriodStatus(line.period_id));
  }

  if (body.action === "delete_line") {
    const { data: line, error: lErr } = await supabaseAdmin
      .from("staff_payroll_lines")
      .select("id, period_id")
      .eq("id", body.line_id)
      .maybeSingle();
    if (lErr && isMissingTable(lErr)) return missingTableResponse();
    if (!line) return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });

    const check = await assertPeriod(line.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });

    const { error: delErr } = await supabaseAdmin.from("staff_payroll_lines").delete().eq("id", body.line_id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json(await refreshPeriodStatus(line.period_id));
  }

  if (body.action === "record_payment") {
    const check = await assertPeriod(body.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });

    const amount = Math.round(Number(body.amount) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

    const { error: payErr } = await supabaseAdmin.from("staff_payroll_payments").insert({
      period_id: body.period_id,
      amount,
      payment_method: body.payment_method || "especes",
      payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
      notes: body.notes?.trim() || null,
      recorded_by: actor,
    });
    if (payErr && isMissingTable(payErr)) return missingTableResponse();
    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

    return NextResponse.json(await refreshPeriodStatus(body.period_id));
  }

  if (body.action === "update_payment") {
    const { data: pay, error: pErr } = await supabaseAdmin
      .from("staff_payroll_payments")
      .select("id, period_id")
      .eq("id", body.payment_id)
      .maybeSingle();
    if (pErr && isMissingTable(pErr)) return missingTableResponse();
    if (!pay) return NextResponse.json({ error: "Versement introuvable." }, { status: 404 });
    const check = await assertPeriod(pay.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });

    const amount = Math.round(Number(body.amount) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });

    const { error: uErr } = await supabaseAdmin
      .from("staff_payroll_payments")
      .update({
        amount,
        payment_method: body.payment_method || "especes",
        payment_date: body.payment_date,
        notes: body.notes?.trim() || null,
      })
      .eq("id", body.payment_id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json(await refreshPeriodStatus(pay.period_id));
  }

  if (body.action === "delete_payment") {
    const { data: pay, error: pErr } = await supabaseAdmin
      .from("staff_payroll_payments")
      .select("id, period_id")
      .eq("id", body.payment_id)
      .maybeSingle();
    if (pErr && isMissingTable(pErr)) return missingTableResponse();
    if (!pay) return NextResponse.json({ error: "Versement introuvable." }, { status: 404 });
    const check = await assertPeriod(pay.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });

    const { error: delErr } = await supabaseAdmin.from("staff_payroll_payments").delete().eq("id", body.payment_id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json(await refreshPeriodStatus(pay.period_id));
  }

  if (body.action === "reopen") {
    const check = await assertPeriod(body.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });
    const { error: stErr } = await supabaseAdmin
      .from("staff_payroll_periods")
      .update({ status: "draft", updated_at: new Date().toISOString() })
      .eq("id", body.period_id);
    if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });
    return NextResponse.json(await loadPeriodBundle(body.period_id));
  }

  if (body.action === "set_status") {
    const check = await assertPeriod(body.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });
    if (!["draft", "validated", "paid"].includes(body.status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const { error: stErr } = await supabaseAdmin
      .from("staff_payroll_periods")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", body.period_id);
    if (stErr) return NextResponse.json({ error: stErr.message }, { status: 500 });

    return NextResponse.json(await loadPeriodBundle(body.period_id));
  }

  if (body.action === "update_base_snapshot") {
    const check = await assertPeriod(body.period_id);
    if (check.missing) return missingTableResponse();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 404 });
    const snap = Math.max(0, Math.round(Number(body.base_salary_snapshot) || 0));
    const { error: uErr } = await supabaseAdmin
      .from("staff_payroll_periods")
      .update({ base_salary_snapshot: snap, updated_at: new Date().toISOString() })
      .eq("id", body.period_id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json(await refreshPeriodStatus(body.period_id));
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

