"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle,
  Copy,
  GraduationCap,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { useI18n } from "@/app/i18n/I18nProvider";

type CenterAccount = {
  user: { id: string; email: string | null; created_at: string | null };
  profile: {
    id: string;
    prenom: string | null;
    email: string | null;
    phone: string | null;
    ville: string | null;
    genre: string | null;
    role: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    tag_status: string | null;
    simulations_completed: number | null;
    coaching_total: number | null;
    coaching_used: number | null;
  } | null;
  membership: {
    role: string | null;
    permissions: string[] | null;
    created_at: string | null;
  } | null;
  center: {
    id: string;
    name: string;
    code: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    status: string;
    created_at: string | null;
  };
};

const permissionKeys: Record<string, string> = {
  students: "accountPermissionStudents", trainers: "accountPermissionTrainers", overview: "accountPermissionOverview",
  radar: "accountPermissionRadar", missions: "accountPermissionMissions", submissions: "accountPermissionSubmissions",
  coaching: "accountPermissionCoaching", messages: "accountPermissionMessages", forum: "accountPermissionForum",
  support: "accountPermissionSupport", returns: "accountPermissionSupport", reviews: "accountPermissionReviews", push: "accountPermissionPush",
};

function formatDate(value?: string | null, locale = "fr") {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CenterAccountPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const roleLabel = (profileRole?: string | null, membershipRole?: string | null) => {
    if (profileRole === "student") return t("centre", "accountRoleStudent");
    if (profileRole === "trainer" || membershipRole === "staff") return t("centre", "accountRoleTrainer");
    if (membershipRole === "owner") return t("centre", "accountRoleOwner");
    if (membershipRole === "manager" || profileRole === "center_manager") return t("centre", "accountRoleAdmin");
    return t("centre", "accountRoleMember");
  };
  const [account, setAccount] = useState<CenterAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ prenom: "", phone: "", ville: "", genre: "" });

  const isStudent = account?.profile?.role === "student" || (!account?.membership && Boolean(account?.profile));
  const backHref = isStudent ? "/dashboard" : "/centre/dashboard";
  const dashboardHref = isStudent ? "/dashboard" : "/centre/dashboard";
  const displayName = account?.profile?.prenom || account?.profile?.email || account?.user.email || t("centre", "accountMyAccount");
  const initials = (displayName || "C").charAt(0).toUpperCase();
  const permissions = useMemo(() => {
    const raw = account?.membership?.permissions || [];
    return [...new Set(raw.map((permission) => permission === "returns" ? "support" : permission))];
  }, [account?.membership?.permissions]);

  const readJson = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(t("centre", "accountNonJsonResponse", { status: res.status, text: text.slice(0, 160) }));
    }
  };

  const loadAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    const res = await fetch("/api/center/account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await readJson(res);
    if (!res.ok) {
      setLoadError(json.error || t("centre", "accountOpenError"));
      setLoading(false);
      return;
    }

    setAccount(json);
    setForm({
      prenom: json.profile?.prenom || "",
      phone: json.profile?.phone || "",
      ville: json.profile?.ville || "",
      genre: json.profile?.genre || "",
    });
    setLoading(false);
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const saveProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSaving(true);
    try {
      const res = await fetch("/api/center/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || t("centre", "accountUpdateError"));
      setAccount((current) => current ? { ...current, profile: json.profile } : current);
    } catch (error: any) {
      alert(error?.message || t("centre", "accountUpdateError"));
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return <CenterPageLoading embedded mode="account" />;
  }

  if (loadError) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#FAFAFA] px-4 text-slate-950">
        <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-xl font-black">{t("centre", "accountUnavailable")}</p>
          <p className="mt-2 text-sm font-bold text-slate-500">{loadError}</p>
          <Link href="/dashboard" className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-500">
            {t("centre", "accountBackDashboard")}
          </Link>
        </div>
      </main>
    );
  }

  if (!account) return null;

  return (
    <main className="platform-profile-page min-h-[100dvh] bg-[#FAFAFA] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href={backHref} className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 shadow-sm hover:bg-neutral-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
              {t("centre", "accountCenterAccount")}
            </span>
            <h1 className="mt-2 truncate text-2xl font-black tracking-tight md:text-4xl">{displayName}</h1>
          </div>
          <button onClick={signOut} className="flex h-11 items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-100">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("centre", "accountSignOut")}</span>
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:px-8 lg:grid-cols-[0.9fr_1.4fr]">
        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-600 text-2xl font-black text-white shadow-xl shadow-orange-500/25">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black">{displayName}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-orange-600">
                  {roleLabel(account.profile?.role, account.membership?.role)}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-500">
              <InfoLine icon={Mail} label={t("centre", "accountEmail")} value={account.profile?.email || account.user.email || "-"} />
              <InfoLine icon={Phone} label={t("centre", "accountPhone")} value={account.profile?.phone || "-"} />
              <InfoLine icon={MapPin} label={t("centre", "settingsCity")} value={account.profile?.ville || "-"} />
              <InfoLine icon={Calendar} label={t("centre", "accountRegistration")} value={formatDate(account.profile?.created_at || account.user.created_at, locale)} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black">{t("centre", "accountLinkedCenter")}</p>
                <p className="text-xs font-bold text-slate-400">{account.center.status === "active" ? t("centre", "accountActiveCenter") : t("centre", "accountSuspendedCenter")}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-lg font-black text-slate-950">{account.center.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{account.center.city || t("centre", "accountCityMissing")}</p>
              {account.center.code && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(account.center.code || "");
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  className="mt-4 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-orange-600">{t("centre", "accountCenterCode")}</span>
                    <span className="font-mono text-xl font-black tracking-widest">{account.center.code}</span>
                  </span>
                  {copied ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-slate-400" />}
                </button>
              )}
            </div>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{t("centre", "accountPersonalInfo")}</p>
                <p className="text-xs font-bold text-slate-400">{t("centre", "accountPersonalInfoHelp")}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("centre", "enrollmentFirstName")} value={form.prenom} onChange={(value) => setForm((current) => ({ ...current, prenom: value }))} />
              <Field label={t("centre", "accountPhoneWhatsapp")} value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Field label={t("centre", "settingsCity")} value={form.ville} onChange={(value) => setForm((current) => ({ ...current, ville: value }))} />
              <label className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{t("centre", "accountGender")}</span>
                <select
                  value={form.genre}
                  onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-500"
                >
                  <option value="">{t("centre", "accountNotProvided")}</option>
                  <option value="Homme">{t("centre", "accountMale")}</option>
                  <option value="Femme">{t("centre", "accountFemale")}</option>
                </select>
              </label>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white transition hover:bg-orange-600 disabled:opacity-50 md:w-auto md:px-6"
            >
              <Save className="h-4 w-4" />
              {saving ? t("centre", "accountSaving") : t("centre", "accountSave")}
            </button>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <MiniCard icon={ShieldCheck} label={t("centre", "accountRole")} value={roleLabel(account.profile?.role, account.membership?.role)} />
            <MiniCard icon={BadgeCheck} label={t("centre", "settingsStatus")} value={account.profile?.tag_status || account.center.status || t("centre", "campusActiveLower")} />
            <MiniCard icon={GraduationCap} label={t("centre", "accountSimulations")} value={String(account.profile?.simulations_completed || 0)} />
          </section>

          {permissions.length > 0 && (
            <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-black">{t("centre", "accountAuthorizedAccess")}</p>
                  <p className="text-xs font-bold text-slate-400">{t("centre", "accountVisibleModules")}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span key={permission} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {permissionKeys[permission] ? t("centre", permissionKeys[permission]) : permission}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href={dashboardHref} className="flex h-12 items-center justify-center rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-500">
              {t("centre", "accountBackDashboardShort")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <Icon className="h-4 w-4 text-orange-600" />
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className="block truncate text-sm font-black text-slate-900">{value}</span>
      </span>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-500"
      />
    </label>
  );
}

function MiniCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <Icon className="h-5 w-5 text-orange-600" />
      <p className="mt-4 text-lg font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}
