import { NextRequest, NextResponse } from "next/server";
import {
  applyPurchase,
  emptyWallet,
  isAiCreditType,
} from "@/app/data/aiCredits";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

const WALLET_COLUMNS = "center_id, generic, tutor_ia, exam_sim, ai_corrections, course_builder, updated_at";
const PURCHASE_COLUMNS = "id, center_id, mode, credit_type, quantity, amount_fcfa, note, created_by, created_at";

type AiCreditType = "tutor_ia" | "exam_sim" | "ai_corrections" | "course_builder";

type AiCreditWallet = {
  generic: number;
  tutor_ia: number;
  exam_sim: number;
  ai_corrections: number;
  course_builder: number;
};

type WalletRow = AiCreditWallet & {
  center_id: string;
  updated_at: string;
};

type PurchaseRpcRow = {
  wallet_generic: number;
  wallet_tutor_ia: number;
  wallet_exam_sim: number;
  wallet_ai_corrections: number;
  wallet_course_builder: number;
  purchase_id: string;
  purchase_created_at: string;
};

type PurchaseInput =
  | {
      mode: "generic";
      creditType: null;
      quantity: number;
      amountFcfa: number | null;
      note: string | null;
    }
  | {
      mode: "typed";
      creditType: AiCreditType;
      quantity: number;
      amountFcfa: number | null;
      note: string | null;
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

function parsePurchaseInput(body: unknown): PurchaseInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const input = body as Record<string, unknown>;
  const quantity = input.quantity;
  const amountFcfa = input.amount_fcfa;
  const note = input.note;

  if (amountFcfa !== undefined && amountFcfa !== null) {
    if (!Number.isInteger(amountFcfa) || (amountFcfa as number) < 0) return null;
  }
  if (note !== undefined && note !== null && typeof note !== "string") return null;

  if (input.mode === "generic") {
    if (input.credit_type !== undefined && input.credit_type !== null) return null;
    try {
      applyPurchase(emptyWallet(), { mode: "generic", type: undefined, quantity: quantity as number });
    } catch {
      return null;
    }
    return {
      mode: "generic",
      creditType: null,
      quantity: quantity as number,
      amountFcfa: (amountFcfa as number | null | undefined) ?? null,
      note: (note as string | null | undefined) ?? null,
    };
  }

  if (input.mode === "typed" && isAiCreditType(input.credit_type)) {
    try {
      applyPurchase(emptyWallet(), {
        mode: "typed",
        type: input.credit_type,
        quantity: quantity as number,
      });
    } catch {
      return null;
    }
    return {
      mode: "typed",
      creditType: input.credit_type as AiCreditType,
      quantity: quantity as number,
      amountFcfa: (amountFcfa as number | null | undefined) ?? null,
      note: (note as string | null | undefined) ?? null,
    };
  }

  return null;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;
  const [
    { data: center, error: centerError },
    { data: walletRow, error: walletError },
    { data: purchases, error: purchasesError },
  ] = await Promise.all([
    supabaseAdmin.from("centers").select("id").eq("id", id).maybeSingle(),
    supabaseAdmin.from("center_ai_credit_wallets").select(WALLET_COLUMNS).eq("center_id", id).maybeSingle(),
    supabaseAdmin
      .from("center_ai_credit_purchases")
      .select(PURCHASE_COLUMNS)
      .eq("center_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (centerError || !center) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }
  if (walletError || purchasesError) {
    return NextResponse.json(
      { error: walletError?.message || purchasesError?.message || "Impossible de charger les crédits IA." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    wallet: walletFromRow(walletRow as WalletRow | null),
    purchases: purchases ?? [],
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const input = parsePurchaseInput(await req.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Achat de crédits IA invalide." }, { status: 400 });
  }

  const { id } = await context.params;
  const { data: center, error: centerError } = await supabaseAdmin
    .from("centers")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (centerError || !center) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  const { data, error: purchaseError } = await supabaseAdmin.rpc("purchase_center_ai_credits", {
    p_center_id: id,
    p_mode: input.mode,
    p_credit_type: input.creditType,
    p_quantity: input.quantity,
    p_amount_fcfa: input.amountFcfa,
    p_note: input.note,
    p_created_by: ctx.user.id,
  });
  const result = (Array.isArray(data) ? data[0] : data) as PurchaseRpcRow | null;

  if (purchaseError || !result) {
    return NextResponse.json(
      { error: purchaseError?.message || "Impossible d'enregistrer l'achat de crédits IA." },
      { status: 500 },
    );
  }

  await logSuperadminAction(ctx.user.id, "center_ai_credits_purchased", {
    targetType: "center",
    targetId: id,
    req,
    metadata: {
      mode: input.mode,
      creditType: input.creditType,
      quantity: input.quantity,
      amountFcfa: input.amountFcfa,
    },
  });

  return NextResponse.json({
    wallet: {
      generic: result.wallet_generic,
      tutor_ia: result.wallet_tutor_ia,
      exam_sim: result.wallet_exam_sim,
      ai_corrections: result.wallet_ai_corrections,
      course_builder: result.wallet_course_builder,
    },
    purchase: {
      id: result.purchase_id,
      center_id: id,
      mode: input.mode,
      credit_type: input.creditType,
      quantity: input.quantity,
      amount_fcfa: input.amountFcfa,
      note: input.note,
      created_by: ctx.user.id,
      created_at: result.purchase_created_at,
    },
  });
}
