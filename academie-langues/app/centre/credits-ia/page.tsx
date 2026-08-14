"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Loader2,
  MessagesSquare,
  Search,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { supabase } from "@/app/utils/supabase";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { ACTION_TONE } from "@/app/utils/action-tones";
import {
  BLUE,
  ORANGE,
  CenterDataTable,
  CenterPageBody,
  CenterPageHeader,
  CenterPageLayout,
  CenterTableRow,
  EmptyState,
  LoadErrorState,
} from "../center-page-ui";
import { chooseGrantSource, findRequestedBeneficiary } from "./page.core.mjs";

type CreditType = "tutor_ia" | "exam_sim" | "ai_corrections" | "course_builder";
type CreditSource = "generic" | "typed";

type Wallet = Record<"generic" | CreditType, number>;

type Beneficiary = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  role: string | null;
};

type Grant = {
  id: string;
  beneficiary_id: string;
  credit_type: CreditType;
  quantity: number;
  source: CreditSource;
  payment_amount: number | null;
  payment_reason: string | null;
  created_at: string;
  beneficiary:
    | { prenom: string | null; nom: string | null; email: string | null }
    | { prenom: string | null; nom: string | null; email: string | null }[]
    | null;
};

type CreditsResponse = {
  wallet: Wallet;
  grants: Grant[];
};

const CREDIT_TYPES: CreditType[] = [
  "tutor_ia",
  "exam_sim",
  "ai_corrections",
  "course_builder",
];

const CREDIT_TYPE_ICON: Record<CreditType, React.ElementType> = {
  tutor_ia: MessagesSquare,
  exam_sim: ClipboardCheck,
  ai_corrections: Wand2,
  course_builder: BookOpenCheck,
};

const BENEFICIARY_ROLES = [
  "student",
  "trainer",
  "staff",
  "center_manager",
  "campus_manager",
  "manager",
];

function beneficiaryName(person: Pick<Beneficiary, "prenom" | "nom" | "email">): string {
  const fullName = [person.prenom, person.nom].filter(Boolean).join(" ").trim();
  return fullName || person.email || "—";
}

function grantBeneficiary(grant: Grant) {
  return Array.isArray(grant.beneficiary) ? grant.beneficiary[0] : grant.beneficiary;
}

export default function CreditsIaPage() {
  const { t, locale } = useI18n();
  const feedback = useActionFeedback();
  const requestIdRef = useRef(0);
  const queryAppliedRef = useRef(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [grants, setGrants] = useState<Grant[] | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadError, setLoadError] = useState("");
  const [beneficiariesError, setBeneficiariesError] = useState("");

  const [search, setSearch] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [creditType, setCreditType] = useState<CreditType>("tutor_ia");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReason, setPaymentReason] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const typeLabel = useCallback(
    (type: CreditType) => {
      const key = {
        tutor_ia: "creditsIaTypeTutor",
        exam_sim: "creditsIaTypeExam",
        ai_corrections: "creditsIaTypeCorrections",
        course_builder: "creditsIaTypeCourseBuilder",
      }[type];
      return t("centre", key);
    },
    [t],
  );

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setBeneficiariesError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (requestId !== requestIdRef.current) return;
      if (!session) {
        setWallet(null);
        setGrants(null);
        setBeneficiaries([]);
        setLoadError(t("centre", "creditsIaLoadError"));
        return;
      }

      const creditsPromise = fetch("/api/centre/credits", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
      const profilePromise = supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .maybeSingle();

      const [creditsResponse, profileResult] = await Promise.all([creditsPromise, profilePromise]);
      if (requestId !== requestIdRef.current) return;

      if (!creditsResponse.ok) {
        setWallet(null);
        setGrants(null);
        setLoadError(t("centre", "creditsIaLoadError"));
      } else {
        const creditsJson = (await creditsResponse.json()) as CreditsResponse;
        if (requestId !== requestIdRef.current) return;
        setWallet(creditsJson.wallet);
        setGrants(creditsJson.grants);
      }

      const centerId = profileResult.data?.center_id;
      if (profileResult.error || !centerId) {
        setBeneficiaries([]);
        setBeneficiariesError(t("centre", "creditsIaBeneficiariesError"));
        return;
      }

      const { data: people, error: peopleError } = await supabase
        .from("profiles")
        .select("id, prenom, nom, email, role")
        .eq("center_id", centerId)
        .in("role", BENEFICIARY_ROLES)
        .order("prenom", { ascending: true });
      if (requestId !== requestIdRef.current) return;

      if (peopleError) {
        setBeneficiaries([]);
        setBeneficiariesError(t("centre", "creditsIaBeneficiariesError"));
      } else {
        setBeneficiaries((people || []) as Beneficiary[]);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }
      setWallet(null);
      setGrants(null);
      setLoadError(t("centre", "creditsIaLoadError"));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }

    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    void loadData();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadData]);

  useEffect(() => {
    if (queryAppliedRef.current || beneficiaries.length === 0) return;
    queryAppliedRef.current = true;
    const requested = new URLSearchParams(window.location.search).get("beneficiary");
    const match = findRequestedBeneficiary(beneficiaries, requested);
    if (match) {
      setBeneficiaryId(match.id);
      setSearch(beneficiaryName(match));
    }
  }, [beneficiaries]);

  useEffect(() => {
    if (!typeMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(event.target as Node)) {
        setTypeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [typeMenuOpen]);

  const selectedBeneficiary = beneficiaries.find((person) => person.id === beneficiaryId) || null;
  const source = chooseGrantSource(wallet, creditType) as CreditSource;

  const filteredBeneficiaries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? beneficiaries.filter((person) =>
          [person.prenom, person.nom, person.email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : beneficiaries;
    return rows.slice(0, 8);
  }, [beneficiaries, search]);

  const submitGrant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const parsedQuantity = Number(quantity);
    const parsedPaymentAmount = Number(paymentAmount);
    if (!beneficiaryId || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setSubmitError(t("centre", "creditsIaInvalidForm"));
      return;
    }
    if (
      recordPayment &&
      (!Number.isInteger(parsedPaymentAmount) || parsedPaymentAmount < 1 || !paymentReason.trim())
    ) {
      setSubmitError(t("centre", "creditsIaPaymentRequired"));
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setSubmitError(t("centre", "creditsIaSubmitError"));
        return;
      }

      const response = await fetch("/api/centre/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          beneficiary_id: beneficiaryId,
          credit_type: creditType,
          quantity: parsedQuantity,
          source,
          record_payment: recordPayment,
          payment_amount: recordPayment ? parsedPaymentAmount : null,
          payment_reason: recordPayment ? paymentReason.trim() : null,
        }),
      });

      if (!response.ok) {
        setSubmitError(
          response.status === 409
            ? t("centre", "creditsIaInsufficientStock")
            : t("centre", "creditsIaSubmitError"),
        );
        return;
      }

      setQuantity("1");
      setRecordPayment(false);
      setPaymentAmount("");
      setPaymentReason("");
      feedback.show(
        {
          status: "success",
          title: t("centre", "creditsIaGrantSuccess"),
          message: t("centre", "creditsIaGrantSuccessMessage"),
        },
        2200,
      );
      await loadData();
    } catch {
      setSubmitError(t("centre", "creditsIaSubmitError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !wallet && !grants && !loadError) return <CenterPageLoading />;

  const walletCards = wallet
    ? [
        { key: "generic", label: t("centre", "creditsIaWalletGeneric"), value: wallet.generic },
        ...CREDIT_TYPES.map((type) => ({ key: type, label: typeLabel(type), value: wallet[type] })),
      ]
    : [];

  return (
    <CenterPageLayout header={<CenterPageHeader title={t("centre", "navCreditsIa")} />}>
      <CenterPageBody className="pb-8">
        <p className="max-w-3xl text-[13px] font-medium text-neutral-500">
          {t("centre", "creditsIaSubtitle")}
        </p>

        {loadError ? <LoadErrorState message={loadError} onRetry={() => void loadData()} /> : null}

        {wallet ? (
          <section aria-labelledby="credits-wallet-title">
            <div className="mb-3 flex items-center gap-2">
              <Coins size={17} style={{ color: ORANGE }} />
              <h2 id="credits-wallet-title" className="text-[15px] font-extrabold" style={{ color: BLUE }}>
                {t("centre", "creditsIaWalletTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {walletCards.map((card) => (
                <div key={card.key} className="rounded-xl border border-black/[0.08] bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums" style={{ color: BLUE }}>
                    {card.value.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form
            onSubmit={submitGrant}
            className="rounded-xl border border-black/[0.08] bg-white p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#11224E]/[0.06]">
                <Sparkles size={17} style={{ color: BLUE }} />
              </div>
              <div>
                <h2 className="text-[15px] font-extrabold" style={{ color: BLUE }}>
                  {t("centre", "creditsIaGrantTitle")}
                </h2>
                <p className="mt-1 text-[12px] font-medium text-neutral-400">
                  {t("centre", "creditsIaGrantHelp")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="credits-beneficiary-search" className="text-[12px] font-bold text-neutral-600">
                  {t("centre", "creditsIaBeneficiary")}
                </label>
                <div className="relative mt-1.5">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-3 text-neutral-400"
                  />
                  <input
                    id="credits-beneficiary-search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setBeneficiaryId("");
                    }}
                    placeholder={t("centre", "creditsIaBeneficiarySearch")}
                    className="h-10 w-full rounded-lg border border-black/[0.08] bg-[#F7F7F6] pl-9 pr-3 text-[13px] font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                  />
                </div>
                {beneficiariesError ? (
                  <p className={`mt-2 ${ACTION_TONE.errorText}`}>{beneficiariesError}</p>
                ) : (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-black/[0.08]">
                    {filteredBeneficiaries.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[12px] font-medium text-neutral-400">
                        {t("centre", "creditsIaNoBeneficiary")}
                      </p>
                    ) : (
                      filteredBeneficiaries.map((person) => {
                        const selected = beneficiaryId === person.id;
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              setBeneficiaryId(person.id);
                              setSearch(beneficiaryName(person));
                            }}
                            className={`flex w-full items-center gap-3 border-b border-black/[0.05] px-3 py-2.5 text-left last:border-0 hover:bg-black/[0.025] ${
                              selected ? "bg-blue-50/60" : "bg-white"
                            }`}
                          >
                            <UserRound size={15} className="shrink-0 text-neutral-400" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-bold text-neutral-700">
                                {beneficiaryName(person)}
                              </span>
                              <span className="block truncate text-[10px] font-medium text-neutral-400">
                                {person.role === "student"
                                  ? t("centre", "creditsIaStudent")
                                  : t("centre", "creditsIaStaff")}
                                {person.email ? ` · ${person.email}` : ""}
                              </span>
                            </span>
                            {selected ? <Check size={14} style={{ color: BLUE }} /> : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                {selectedBeneficiary ? (
                  <p className="mt-2 text-[11px] font-bold" style={{ color: BLUE }}>
                    {t("centre", "creditsIaBeneficiary")} · {beneficiaryName(selectedBeneficiary)}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div ref={typeMenuRef} className="relative">
                  <span className="text-[12px] font-bold text-neutral-600">{t("centre", "creditsIaType")}</span>
                  <button
                    type="button"
                    onClick={() => setTypeMenuOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={typeMenuOpen}
                    className="mt-1.5 flex h-10 w-full items-center gap-2 rounded-lg border border-black/[0.08] bg-[#F7F7F6] px-2.5 text-left outline-none transition focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${ORANGE}1A` }}
                    >
                      {(() => {
                        const SelectedIcon = CREDIT_TYPE_ICON[creditType];
                        return <SelectedIcon size={13} style={{ color: ORANGE }} />;
                      })()}
                    </span>
                    <span className="flex-1 truncate text-[13px] font-semibold text-neutral-800">
                      {typeLabel(creditType)}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform ${typeMenuOpen ? "rotate-180" : ""}`}
                      style={{ color: "rgba(17,34,78,0.35)" }}
                    />
                  </button>

                  {typeMenuOpen ? (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-lg border border-black/[0.08] bg-white shadow-lg"
                    >
                      {CREDIT_TYPES.map((type) => {
                        const Icon = CREDIT_TYPE_ICON[type];
                        const isSelected = type === creditType;
                        const stock = wallet ? wallet[type] : null;
                        return (
                          <button
                            key={type}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setCreditType(type);
                              setTypeMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2.5 border-b border-black/[0.05] px-3 py-2.5 text-left last:border-0 transition-colors hover:bg-black/[0.025] ${
                              isSelected ? "bg-blue-50/60" : "bg-white"
                            }`}
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                              style={{ backgroundColor: isSelected ? `${BLUE}1A` : "rgba(17,34,78,0.05)" }}
                            >
                              <Icon size={14} style={{ color: isSelected ? BLUE : "rgba(17,34,78,0.45)" }} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-bold text-neutral-700">
                                {typeLabel(type)}
                              </span>
                              {stock != null ? (
                                <span className="block truncate text-[10px] font-medium text-neutral-400">
                                  {t("centre", "creditsIaTypeStock", {
                                    count: stock.toLocaleString(locale === "en" ? "en-US" : "fr-FR"),
                                  })}
                                </span>
                              ) : null}
                            </span>
                            {isSelected ? <Check size={14} className="shrink-0" style={{ color: BLUE }} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <label className="text-[12px] font-bold text-neutral-600">
                  {t("centre", "creditsIaQuantity")}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.08] bg-[#F7F7F6] px-3 text-[13px] font-semibold tabular-nums outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-black/[0.07] bg-[#F7F7F6] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                  {t("centre", "creditsIaSource")}
                </p>
                <p className="mt-1 text-[12px] font-bold" style={{ color: BLUE }}>
                  {t("centre", source === "typed" ? "creditsIaSourceTyped" : "creditsIaSourceGeneric")}
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[12px] font-bold text-neutral-700">
                <input
                  type="checkbox"
                  checked={recordPayment}
                  onChange={(event) => setRecordPayment(event.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 accent-[#11224E]"
                />
                {t("centre", "creditsIaRecordPayment")}
              </label>

              {recordPayment ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[12px] font-bold text-neutral-600">
                    {t("centre", "creditsIaPaymentAmount")}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.08] bg-[#F7F7F6] px-3 text-[13px] font-semibold tabular-nums outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                    />
                  </label>
                  <label className="text-[12px] font-bold text-neutral-600">
                    {t("centre", "creditsIaPaymentReason")}
                    <input
                      value={paymentReason}
                      onChange={(event) => setPaymentReason(event.target.value)}
                      placeholder={t("centre", "creditsIaPaymentReasonPlaceholder")}
                      className="mt-1.5 h-10 w-full rounded-lg border border-black/[0.08] bg-[#F7F7F6] px-3 text-[13px] font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                    />
                  </label>
                </div>
              ) : null}

              {submitError ? (
                <div className={ACTION_TONE.errorBox} role="alert">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={ACTION_TONE.dangerIcon} />
                    <span>{submitError}</span>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || !wallet}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-[12px] font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                style={{ backgroundColor: ORANGE }}
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {t("centre", submitting ? "creditsIaGrantSubmitting" : "creditsIaGrantAction")}
              </button>
            </div>
          </form>

          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-extrabold" style={{ color: BLUE }}>
                {t("centre", "creditsIaHistoryTitle")}
              </h2>
            </div>
            {grants && grants.length > 0 ? (
              <CenterDataTable
                columns={[
                  t("centre", "creditsIaHistoryDate"),
                  t("centre", "creditsIaHistoryBeneficiary"),
                  t("centre", "creditsIaHistoryType"),
                  t("centre", "creditsIaHistoryQuantity"),
                  t("centre", "creditsIaHistorySource"),
                  t("centre", "creditsIaHistoryPayment"),
                ]}
                minWidth="760px"
                columnWidths={["8rem", undefined, "9rem", "6rem", "8rem", "8rem"]}
              >
                {grants.map((grant, index) => {
                  const person = grantBeneficiary(grant);
                  return (
                    <CenterTableRow key={grant.id} index={index}>
                      <td className="px-4 py-3 text-[11px] font-medium text-neutral-500">
                        {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
                          dateStyle: "medium",
                        }).format(new Date(grant.created_at))}
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-[12px] font-bold text-neutral-700">
                          {person ? beneficiaryName(person) : t("centre", "creditsIaUnknownBeneficiary")}
                        </p>
                        {person?.email ? (
                          <p className="truncate text-[10px] font-medium text-neutral-400">{person.email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-neutral-600">
                        {typeLabel(grant.credit_type)}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-extrabold tabular-nums" style={{ color: BLUE }}>
                        +{grant.quantity}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-neutral-500">
                        {t("centre", grant.source === "typed" ? "creditsIaSourceTyped" : "creditsIaSourceGeneric")}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-neutral-500">
                        {grant.payment_amount
                          ? `${grant.payment_amount.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} FCFA`
                          : t("centre", "creditsIaNoPayment")}
                      </td>
                    </CenterTableRow>
                  );
                })}
              </CenterDataTable>
            ) : grants ? (
              <EmptyState title={t("centre", "creditsIaHistoryEmpty")} />
            ) : null}
          </div>
        </section>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
