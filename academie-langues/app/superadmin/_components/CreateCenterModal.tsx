"use client";

import { useState } from "react";
import { X, RefreshCcw, Copy, Check } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { checkPasswordStrength } from "@/app/utils/password-policy";

type CenterTypeChoice = "generic" | "tcf_canada";

function secureRandomChars(alphabet: string, length: number): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  // Une garantie de chaque classe requise par la politique, puis complète avec
  // un alphabet mixte tiré via un CSPRNG (pas Math.random — c'est un vrai identifiant).
  const guaranteed = secureRandomChars(upper, 2) + secureRandomChars(lower, 2) + secureRandomChars(digits, 2);
  const rest = secureRandomChars(upper + lower + digits + symbols, 8);
  const combined = (guaranteed + rest).split("");
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

export function CreateCenterModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (centerId: string) => void;
}) {
  const { t } = useI18n();
  const [centerType, setCenterType] = useState<CenterTypeChoice>("generic");
  const [centerName, setCenterName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ownerPrenom, setOwnerPrenom] = useState("");
  const [ownerNom, setOwnerNom] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [ownerPassword, setOwnerPassword] = useState(() => generatePassword());
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(ownerPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!centerName.trim() || !city.trim() || !ownerPrenom.trim() || !ownerNom.trim() || !ownerEmail.trim()) {
      setError(t("superadmin", "createCenterMissingFields"));
      return;
    }
    const pwdCheck = checkPasswordStrength(ownerPassword);
    if (!pwdCheck.ok) {
      setError(pwdCheck.message || t("superadmin", "createCenterWeakPassword"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/centre/creer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerName: centerName.trim(),
          city: city.trim(),
          country: country.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          ownerPrenom: ownerPrenom.trim(),
          ownerNom: ownerNom.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
          ownerRole: ownerRole.trim() || null,
          centerType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || t("superadmin", "createCenterError"));
        return;
      }
      onCreated(json.centerId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("superadmin", "createCenterError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <form
        onSubmit={submit}
        className="custom-scrollbar max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">
              {t("superadmin", "createCenterTitle")}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("superadmin", "createCenterSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {(
            [
              ["generic", "centresTypeNative"],
              ["tcf_canada", "centresTypeTcf"],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCenterType(value)}
              className={`rounded-xl border p-3 text-left text-xs font-black uppercase tracking-wide transition-colors ${
                centerType === value
                  ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                  : "border-white/10 bg-black/20 text-white hover:border-white/20"
              }`}
            >
              {t("superadmin", labelKey)}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "createCenterName")}
            </label>
            <input
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "requestsCityShort")}
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "requestsCountryShort")}
            </label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "requestsPhone")}
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "requestsAddress")}
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
        </div>

        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/90">
            {t("superadmin", "requestsManagerForm")}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "createCenterOwnerFirstName")}
              </label>
              <input
                value={ownerPrenom}
                onChange={(e) => setOwnerPrenom(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "createCenterOwnerLastName")}
              </label>
              <input
                value={ownerNom}
                onChange={(e) => setOwnerNom(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "requestsEmail")}
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "requestsRoleShort")}
              </label>
              <input
                value={ownerRole}
                onChange={(e) => setOwnerRole(e.target.value)}
                placeholder={t("superadmin", "createCenterRolePlaceholder")}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "createCenterPassword")}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={() => setOwnerPassword(generatePassword())}
                  title={t("superadmin", "createCenterRegenerate")}
                  className="shrink-0 rounded-xl border border-white/10 bg-black/30 p-2.5 text-slate-300 hover:border-orange-400/40 hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void copyPassword()}
                  title={t("superadmin", "studentsCopy")}
                  className="shrink-0 rounded-xl border border-white/10 bg-black/30 p-2.5 text-slate-300 hover:border-orange-400/40 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{t("superadmin", "createCenterPasswordHint")}</p>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-xs font-bold text-red-400">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            {t("superadmin", "centresConfirmCancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t("superadmin", "createCenterSubmitting") : t("superadmin", "createCenterSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}
