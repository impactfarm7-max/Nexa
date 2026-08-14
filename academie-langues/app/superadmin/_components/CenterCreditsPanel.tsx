"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Coins, Loader2, Plus, RotateCcw } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { superadminFetch } from "@/app/utils/superadmin-api-client";

type CreditType = "tutor_ia" | "exam_sim" | "ai_corrections" | "course_builder";
type PurchaseMode = "generic" | "typed";

type Wallet = Record<"generic" | CreditType, number>;

type Purchase = {
  id: string;
  mode: PurchaseMode;
  credit_type: CreditType | null;
  quantity: number;
  amount_fcfa: number | null;
  note: string | null;
  created_at: string;
};

type CreditsResponse = {
  wallet: Wallet;
  purchases: Purchase[];
};

type PurchaseResponse = {
  wallet: Wallet;
  purchase: Purchase;
};

const CREDIT_TYPES: CreditType[] = [
  "tutor_ia",
  "exam_sim",
  "ai_corrections",
  "course_builder",
];

const EMPTY_WALLET: Wallet = {
  generic: 0,
  tutor_ia: 0,
  exam_sim: 0,
  ai_corrections: 0,
  course_builder: 0,
};

export function CenterCreditsPanel({ centerId }: { centerId: string }) {
  const { t, locale } = useI18n();
  const [wallet, setWallet] = useState<Wallet>(EMPTY_WALLET);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [mode, setMode] = useState<PurchaseMode>("generic");
  const [creditType, setCreditType] = useState<CreditType>("tutor_ia");
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadedCenterId, setLoadedCenterId] = useState<string | null>(null);
  const activeCenterIdRef = useRef(centerId);
  const loadRequestIdRef = useRef(0);

  activeCenterIdRef.current = centerId;
  const ready = loadedCenterId === centerId;

  const loadCredits = useCallback(async () => {
    const requestedCenterId = centerId;
    const requestId = ++loadRequestIdRef.current;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await superadminFetch<CreditsResponse>(
        `/api/superadmin/centers/${requestedCenterId}/credits`,
      );
      if (
        activeCenterIdRef.current !== requestedCenterId ||
        loadRequestIdRef.current !== requestId
      ) {
        return;
      }
      setWallet(response.wallet);
      setPurchases(response.purchases);
      setLoadedCenterId(requestedCenterId);
    } catch (loadError: unknown) {
      if (
        activeCenterIdRef.current !== requestedCenterId ||
        loadRequestIdRef.current !== requestId
      ) {
        return;
      }
      console.error("Unable to load center AI credits", loadError);
      setLoadedCenterId(null);
      setError(t("superadmin", "creditsLoadError"));
    } finally {
      if (
        activeCenterIdRef.current === requestedCenterId &&
        loadRequestIdRef.current === requestId
      ) {
        setLoading(false);
      }
    }
  }, [centerId, t]);

  useEffect(() => {
    void loadCredits();
    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [loadCredits]);

  const typeLabel = (type: CreditType) =>
    t("superadmin", `creditsType_${type}` as "creditsType_tutor_ia");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready) return;
    const requestedCenterId = centerId;

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await superadminFetch<PurchaseResponse>(
        `/api/superadmin/centers/${requestedCenterId}/credits`,
        {
          method: "POST",
          body: JSON.stringify({
            mode,
            credit_type: mode === "typed" ? creditType : null,
            quantity: Number(quantity),
            amount_fcfa: amount === "" ? null : Number(amount),
            note: note.trim() || null,
          }),
        },
      );

      if (activeCenterIdRef.current !== requestedCenterId) return;
      setWallet(response.wallet);
      setPurchases((current) => [response.purchase, ...current]);
      setQuantity("1");
      setAmount("");
      setNote("");
      setSuccess(true);
    } catch (submitError: unknown) {
      if (activeCenterIdRef.current !== requestedCenterId) return;
      console.error("Unable to add center AI credits", submitError);
      setError(t("superadmin", "creditsActionError"));
    } finally {
      if (activeCenterIdRef.current === requestedCenterId) {
        setSubmitting(false);
      }
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const walletItems: Array<{ key: keyof Wallet; label: string }> = [
    { key: "generic", label: t("superadmin", "creditsWalletGeneric") },
    ...CREDIT_TYPES.map((type) => ({ key: type, label: typeLabel(type) })),
  ];

  return (
    <section className="rounded-2xl border border-orange-500/20 bg-[#0a0f1c] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2 text-orange-300">
          <Coins className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-400/90">
            {t("superadmin", "creditsTitle")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{t("superadmin", "creditsSubtitle")}</p>
        </div>
      </div>

      {loading && !ready ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
        </div>
      ) : !ready ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-4">
          <p className="text-xs font-bold text-red-300">
            {error ?? t("superadmin", "creditsLoadError")}
          </p>
          <button
            type="button"
            onClick={() => void loadCredits()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/25 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-200 transition-colors hover:bg-red-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("superadmin", "creditsRetry")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {walletItems.map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border px-3 py-2.5 ${
                  item.key === "generic"
                    ? "border-orange-500/25 bg-orange-500/[0.08]"
                    : "border-white/5 bg-white/[0.03]"
                }`}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-black tabular-nums text-white">
                  {wallet[item.key].toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 rounded-xl border border-white/5 bg-white/[0.025] p-3 sm:p-4">
            <div className="grid gap-3 lg:grid-cols-[auto_1fr_1fr]">
              <div>
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {t("superadmin", "creditsMode")}
                </p>
                <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
                  {(["generic", "typed"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      onClick={() => setMode(value)}
                      className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                        mode === value
                          ? "bg-orange-500 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {t(
                        "superadmin",
                        value === "generic" ? "creditsAddGeneric" : "creditsAddTyped",
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "typed" && (
                <label className="block">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    {t("superadmin", "creditsTypeLabel")}
                  </span>
                  <select
                    value={creditType}
                    onChange={(event) => setCreditType(event.target.value as CreditType)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-orange-500/60"
                  >
                    {CREDIT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {typeLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {t("superadmin", "creditsQuantity")}
                </span>
                <input
                  required
                  min={1}
                  step={1}
                  type="number"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-orange-500/60"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {t("superadmin", "creditsAmountOptional")}
                </span>
                <input
                  min={0}
                  step={1}
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-orange-500/60"
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {t("superadmin", "creditsNoteOptional")}
                </span>
                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-orange-500/60"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div aria-live="polite">
                {error && <p className="text-xs font-bold text-red-300">{error}</p>}
                {success && (
                  <p className="text-xs font-bold text-emerald-300">
                    {t("superadmin", "creditsSuccess")}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {t("superadmin", submitting ? "creditsSubmitting" : "creditsSubmit")}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              {t("superadmin", "creditsHistory")}
            </p>
            {purchases.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">
                {t("superadmin", "creditsHistoryEmpty")}
              </p>
            ) : (
              <div className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white">
                        +{purchase.quantity.toLocaleString(locale === "en" ? "en-GB" : "fr-FR")} ·{" "}
                        {purchase.credit_type
                          ? typeLabel(purchase.credit_type)
                          : t("superadmin", "creditsWalletGeneric")}
                      </p>
                      {purchase.note && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{purchase.note}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      {purchase.amount_fcfa != null && (
                        <p className="text-xs font-bold text-orange-300">
                          {purchase.amount_fcfa.toLocaleString(
                            locale === "en" ? "en-GB" : "fr-FR",
                          )}{" "}
                          FCFA
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">{formatDate(purchase.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
