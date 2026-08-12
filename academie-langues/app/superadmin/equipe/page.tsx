"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Shield, UserCog, X } from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import {
  SUPERADMIN_ASSIGNABLE_MENUS,
  type SuperadminMenuKey,
} from "@/app/data/superadminMenus";

type Member = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  created_at: string | null;
  is_owner: boolean;
  menus: SuperadminMenuKey[];
  disabled: boolean;
  is_self: boolean;
};

const MENU_LABEL_KEYS: Record<SuperadminMenuKey, string> = {
  dashboard: "navDashboardLabel",
  analytics: "navAnalyticsLabel",
  alertes: "navAlertsLabel",
  centres: "navCentersLabel",
  effectifs: "navHeadcountLabel",
  etudiants: "navStudentsLabel",
  offres: "navOffersLabel",
  support: "navSupportLabel",
  bibliotheque: "navLibraryLabel",
  audit: "navAuditLabel",
  equipe: "navTeamLabel",
};

export default function SuperadminEquipePage() {
  const { t } = useI18n();
  const feedback = useActionFeedback();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ members: Member[] }>("/api/superadmin/equipe");
      setMembers(json.members || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("superadmin", "equipeLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "equipeTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "equipeSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreatedCreds(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("superadmin", "equipeCreate")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("superadmin", "equipeLoading")}
        </p>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl border p-4 ${
                m.disabled ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-[#0a0f1c]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-white">
                      {[m.prenom, m.nom].filter(Boolean).join(" ") || m.email || "—"}
                    </p>
                    {m.is_owner && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-300">
                        <Shield className="h-3 w-3" />
                        {t("superadmin", "equipeOwner")}
                      </span>
                    )}
                    {m.is_self && (
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {t("superadmin", "equipeYou")}
                      </span>
                    )}
                    {m.disabled && (
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-300">
                        {t("superadmin", "equipeDisabled")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{m.email}</p>
                  {!m.is_owner && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.menus.length === 0 ? (
                        <span className="text-[11px] text-slate-600">{t("superadmin", "equipeNoMenus")}</span>
                      ) : (
                        m.menus.map((key) => (
                          <span
                            key={key}
                            className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400"
                          >
                            {t("superadmin", MENU_LABEL_KEYS[key])}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                  {m.is_owner && (
                    <p className="mt-2 text-[11px] text-slate-500">{t("superadmin", "equipeOwnerHint")}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditTarget(m)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5"
                >
                  {t("superadmin", "equipeEdit")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <EquipeFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreated={(creds) => {
            setCreateOpen(false);
            setCreatedCreds(creds);
            void load();
          }}
        />
      )}

      {editTarget && (
        <EquipeFormModal
          mode="edit"
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            void load();
          }}
        />
      )}

      {createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setCreatedCreds(null)}>
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                  {t("superadmin", "equipeCreatedTitle")}
                </p>
                <p className="mt-2 text-sm text-slate-400">{t("superadmin", "equipeCreatedHint")}</p>
              </div>
              <button type="button" onClick={() => setCreatedCreds(null)} className="text-slate-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t("superadmin", "studentsEmailLabel")}</p>
                <p className="mt-1 font-mono text-sm text-white">{createdCreds.email}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t("superadmin", "studentsPasswordLabel")}</p>
                <p className="mt-1 font-mono text-sm text-white">{createdCreds.password}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `${createdCreds.email}\n${createdCreds.password}`,
                );
              }}
              className="mt-4 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-black text-white hover:opacity-90"
            >
              {t("superadmin", "studentsCopy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EquipeFormModal({
  mode,
  member,
  onClose,
  onCreated,
  onSaved,
}: {
  mode: "create" | "edit";
  member?: Member;
  onClose: () => void;
  onCreated?: (creds: { email: string; password: string }) => void;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const feedback = useActionFeedback();
  const [prenom, setPrenom] = useState(member?.prenom || "");
  const [nom, setNom] = useState(member?.nom || "");
  const [email, setEmail] = useState(member?.email || "");
  const [isOwner, setIsOwner] = useState(Boolean(member?.is_owner));
  const [menus, setMenus] = useState<SuperadminMenuKey[]>(
    member?.menus?.length ? member.menus : ["dashboard"],
  );
  const [disabled, setDisabled] = useState(Boolean(member?.disabled));
  const [busy, setBusy] = useState(false);

  const toggleMenu = (key: SuperadminMenuKey) => {
    setMenus((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "create") {
        const result = await feedback.run(
          async () => {
            const json = await superadminFetch<{ email: string; password: string }>(
              "/api/superadmin/equipe",
              {
                method: "POST",
                body: JSON.stringify({
                  email,
                  prenom,
                  nom,
                  is_owner: isOwner,
                  menus: isOwner ? [] : menus,
                }),
              },
            );
            onCreated?.({ email: json.email, password: json.password });
          },
          {
            successTitle: t("superadmin", "equipeCreateOk"),
            successMessage: t("superadmin", "equipeCreateOkMsg"),
            errorTitle: t("superadmin", "equipeImpossible"),
          },
        );
        if (!result.ok) setBusy(false);
      } else if (member) {
        const result = await feedback.run(
          async () => {
            await superadminFetch("/api/superadmin/equipe", {
              method: "PATCH",
              body: JSON.stringify({
                userId: member.id,
                is_owner: isOwner,
                menus: isOwner ? [] : menus,
                disabled,
              }),
            });
            onSaved?.();
          },
          {
            successTitle: t("superadmin", "equipeUpdateOk"),
            successMessage: t("superadmin", "equipeUpdateOkMsg"),
            errorTitle: t("superadmin", "equipeImpossible"),
          },
        );
        if (!result.ok) setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <div
        className="custom-scrollbar w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">
              {mode === "create" ? t("superadmin", "equipeCreate") : t("superadmin", "equipeEdit")}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-white">
              <UserCog className="h-5 w-5 text-orange-400" />
              {mode === "create" ? t("superadmin", "equipeCreateTitle") : member?.email}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "create" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "requestsFirstNameShort")}</label>
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "requestsLastNameShort")}</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "requestsEmail")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-300">
          <input
            type="checkbox"
            checked={isOwner}
            onChange={(e) => setIsOwner(e.target.checked)}
            className="rounded border-white/20 bg-black/30 text-orange-500 focus:ring-orange-500"
          />
          {t("superadmin", "equipeMakeOwner")}
        </label>
        <p className="mt-1 text-[11px] text-slate-500">{t("superadmin", "equipeMakeOwnerHint")}</p>

        {!isOwner && (
          <div className="mt-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "equipeMenus")}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {SUPERADMIN_ASSIGNABLE_MENUS.map((key) => {
                const on = menus.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMenu(key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                      on
                        ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
                        : "border-white/10 bg-black/20 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded ${
                        on ? "bg-orange-500 text-white" : "bg-white/5"
                      }`}
                    >
                      {on ? <Check className="h-3 w-3" /> : null}
                    </span>
                    {t("superadmin", MENU_LABEL_KEYS[key])}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "edit" && !member?.is_self && (
          <label className="mt-4 flex items-center gap-2 text-sm font-bold text-red-300/90">
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
              className="rounded border-white/20 bg-black/30 text-red-500 focus:ring-red-500"
            />
            {t("superadmin", "equipeDisable")}
          </label>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            {t("superadmin", "centresConfirmCancel")}
          </button>
          <button
            type="button"
            disabled={busy || (mode === "create" && (!email.trim() || !prenom.trim()))}
            onClick={() => void submit()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? t("superadmin", "equipeCreate") : t("superadmin", "equipeSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
