import { NextRequest, NextResponse } from "next/server";
import {
  applyPurchase,
  emptyWallet,
  isAiCreditType,
} from "@/app/data/aiCredits";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

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

function nextUpdatedAt(previous: string | null): string {
  const previousTime = previous ? Date.parse(previous) : Number.NaN;
  return new Date(Math.max(Date.now(), Number.isNaN(previousTime) ? 0 : previousTime + 1)).toISOString();
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

  // The migration defines no transactional RPC. Use updated_at as an optimistic
  // row lock and retry once if another stock update wins the compare-and-swap.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: currentRow, error: readError } = await supabaseAdmin
      .from("center_ai_credit_wallets")
      .select(WALLET_COLUMNS)
      .eq("center_id", id)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const currentWallet = walletFromRow(currentRow as WalletRow | null);
    const nextWallet =
      input.mode === "generic"
        ? applyPurchase(currentWallet, { mode: "generic", type: undefined, quantity: input.quantity })
        : applyPurchase(currentWallet, {
            mode: "typed",
            type: input.creditType,
            quantity: input.quantity,
          });
    const updatedAt = nextUpdatedAt((currentRow as WalletRow | null)?.updated_at ?? null);

    let storedRow: WalletRow | null = null;
    if (currentRow) {
      const { data, error: updateError } = await supabaseAdmin
        .from("center_ai_credit_wallets")
        .update({ ...nextWallet, updated_at: updatedAt })
        .eq("center_id", id)
        .eq("updated_at", (currentRow as WalletRow).updated_at)
        .select(WALLET_COLUMNS)
        .maybeSingle();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      storedRow = data as WalletRow | null;
    } else {
      const { data, error: insertError } = await supabaseAdmin
        .from("center_ai_credit_wallets")
        .insert({ center_id: id, ...nextWallet, updated_at: updatedAt })
        .select(WALLET_COLUMNS)
        .single();

      if (insertError?.code !== "23505") {
        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        storedRow = data as WalletRow;
      }
    }

    if (!storedRow) continue;

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("center_ai_credit_purchases")
      .insert({
        center_id: id,
        mode: input.mode,
        credit_type: input.creditType,
        quantity: input.quantity,
        amount_fcfa: input.amountFcfa,
        note: input.note,
        created_by: ctx.user.id,
      })
      .select(PURCHASE_COLUMNS)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: purchaseError?.message || "Impossible d'enregistrer l'achat de crédits IA." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      wallet: walletFromRow(storedRow),
      purchase,
    });
  }

  return NextResponse.json(
    { error: "Le stock de crédits IA a été modifié simultanément. Réessayez." },
    { status: 409 },
  );
}
