import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  applyGrantDebit,
  emptyWallet,
  PROFILE_TOTAL_COLUMN,
} from "@/app/data/aiCredits";
import { getAuthUser } from "@/app/utils/auth-server";
import { parseGrantInput } from "./route.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MANAGER_ROLES = ["center_manager", "campus_manager"];
const WALLET_COLUMNS = "center_id, generic, tutor_ia, exam_sim, ai_corrections, course_builder, updated_at";
const GRANT_COLUMNS = `
  id,
  center_id,
  beneficiary_id,
  credit_type,
  quantity,
  source,
  payment_amount,
  payment_reason,
  granted_by,
  created_at,
  beneficiary:profiles!center_ai_credit_grants_beneficiary_id_fkey(prenom, nom, email)
`;

type AiCreditType = "tutor_ia" | "exam_sim" | "ai_corrections" | "course_builder";

type AiCreditWallet = {
  generic: number;
  tutor_ia: number;
  exam_sim: number;
  ai_corrections: number;
  course_builder: number;
};

type GrantInput = {
  beneficiaryId: string;
  creditType: AiCreditType;
  quantity: number;
  source: "generic" | "typed";
  paymentAmount: number | null;
  paymentReason: string | null;
};

type WalletRow = AiCreditWallet & {
  center_id: string;
  updated_at: string;
};

type GrantRpcRow = {
  wallet_generic: number;
  wallet_tutor_ia: number;
  wallet_exam_sim: number;
  wallet_ai_corrections: number;
  wallet_course_builder: number;
  grant_id: string;
  grant_created_at: string;
  beneficiary_tutor_ia_total: number;
  beneficiary_exam_total: number;
  beneficiary_ai_corrections_total: number;
  beneficiary_course_builder_total: number;
};

function walletFromRow(row: WalletRow | null): AiCreditWallet {
  if (!row) return emptyWallet();
  return {
    generic: row.generic,
    tutor_ia: row.tutor_ia,
    exam_sim: row.exam_sim,
    ai_corrections: row.ai_corrections,
    course_builder: row.course_builder,
  };
}

async function assertCenterManager(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }
  if (!profile?.center_id || !MANAGER_ROLES.includes(profile.role || "")) {
    return { ok: false as const, status: 403, error: "Accès réservé aux responsables de centre." };
  }

  return { ok: true as const, centerId: profile.center_id as string };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const access = await assertCenterManager(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [{ data: walletRow, error: walletError }, { data: grants, error: grantsError }] = await Promise.all([
    supabaseAdmin
      .from("center_ai_credit_wallets")
      .select(WALLET_COLUMNS)
      .eq("center_id", access.centerId)
      .maybeSingle(),
    supabaseAdmin
      .from("center_ai_credit_grants")
      .select(GRANT_COLUMNS)
      .eq("center_id", access.centerId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (walletError || grantsError) {
    return NextResponse.json(
      { error: walletError?.message || grantsError?.message || "Impossible de charger les crédits IA." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    wallet: walletFromRow(walletRow as WalletRow | null),
    grants: grants ?? [],
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const access = await assertCenterManager(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const input = parseGrantInput(await req.json().catch(() => null)) as GrantInput | null;
  if (!input) {
    return NextResponse.json({ error: "Attribution de crédits IA invalide." }, { status: 400 });
  }

  const [{ data: beneficiary, error: beneficiaryError }, { data: walletRow, error: walletError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", input.beneficiaryId)
        .eq("center_id", access.centerId)
        .maybeSingle(),
      supabaseAdmin
        .from("center_ai_credit_wallets")
        .select(WALLET_COLUMNS)
        .eq("center_id", access.centerId)
        .maybeSingle(),
    ]);

  if (beneficiaryError || walletError) {
    return NextResponse.json(
      { error: beneficiaryError?.message || walletError?.message || "Impossible de vérifier l'attribution." },
      { status: 500 },
    );
  }
  if (!beneficiary) {
    return NextResponse.json({ error: "Bénéficiaire introuvable dans ce centre." }, { status: 404 });
  }

  try {
    applyGrantDebit(walletFromRow(walletRow as WalletRow | null), {
      source: input.source,
      type: input.creditType,
      quantity: input.quantity,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "INSUFFICIENT_STOCK" }, { status: 409 });
    }
    return NextResponse.json({ error: "Attribution de crédits IA invalide." }, { status: 400 });
  }

  const { data, error: grantError } = await supabaseAdmin.rpc("grant_center_ai_credits", {
    p_center_id: access.centerId,
    p_beneficiary_id: input.beneficiaryId,
    p_credit_type: input.creditType,
    p_profile_total_column: PROFILE_TOTAL_COLUMN[input.creditType],
    p_quantity: input.quantity,
    p_source: input.source,
    p_payment_amount: input.paymentAmount,
    p_payment_reason: input.paymentReason,
    p_granted_by: user.id,
  });
  const result = (Array.isArray(data) ? data[0] : data) as GrantRpcRow | null;

  if (grantError || !result) {
    if (grantError?.message.includes("INSUFFICIENT_STOCK")) {
      return NextResponse.json({ error: "INSUFFICIENT_STOCK" }, { status: 409 });
    }
    if (grantError?.message.includes("BENEFICIARY_NOT_FOUND")) {
      return NextResponse.json({ error: "Bénéficiaire introuvable dans ce centre." }, { status: 404 });
    }
    return NextResponse.json(
      { error: grantError?.message || "Impossible d'attribuer les crédits IA." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      wallet: {
        generic: result.wallet_generic,
        tutor_ia: result.wallet_tutor_ia,
        exam_sim: result.wallet_exam_sim,
        ai_corrections: result.wallet_ai_corrections,
        course_builder: result.wallet_course_builder,
      },
      grant: {
        id: result.grant_id,
        center_id: access.centerId,
        beneficiary_id: input.beneficiaryId,
        credit_type: input.creditType,
        quantity: input.quantity,
        source: input.source,
        payment_amount: input.paymentAmount,
        payment_reason: input.paymentReason,
        granted_by: user.id,
        created_at: result.grant_created_at,
      },
      beneficiary_totals: {
        tutor_ia_total: result.beneficiary_tutor_ia_total,
        exam_total: result.beneficiary_exam_total,
        ai_corrections_total: result.beneficiary_ai_corrections_total,
        course_builder_total: result.beneficiary_course_builder_total,
      },
    },
    { status: 201 },
  );
}
