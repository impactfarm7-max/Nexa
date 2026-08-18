"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { LogoutConfirmDialog } from "@/app/components/LogoutConfirmDialog";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  ORANGE,
  SURFACE,
  CenterBrandMark,
  CenterPageHeader,
  CenterPageLayout,
  OutlineHeaderButton,
  BackButton,
} from "@/app/centre/center-page-ui";

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
  if (!value) return locale === "en" ? "Not set" : "Non renseigné";
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

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
    setLogoutBusy(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } finally {
      setLogoutBusy(false);
      setLogoutConfirmOpen(false);
    }
  };

  if (loading) {
    return <CenterPageLoading embedded mode="account" />;
  }

  if (loadError) {
    return (
      <CenterPageLayout
        header={
          <CenterPageHeader
            title={t("centre", "accountUnavailable")}
            backButton={<BackButton onClick={() => router.push(dashboardHref)} />}
          />
        }
      >
        <div className="nexa-center-shell py-10 flex items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 text-center">
            <p className="text-lg font-extrabold" style={{ color: BLUE }}>{t("centre", "accountUnavailable")}</p>
            <p className="mt-2 text-sm font-medium text-neutral-500">{loadError}</p>
            <button
              type="button"
              onClick={() => router.push(dashboardHref)}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              {t("centre", "accountBackDashboard")}
            </button>
          </div>
        </div>
      </CenterPageLayout>
    );
  }

  if (!account) return null;

  const emptyValue = t("centre", "accountNotProvided");

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "accountMyAccount")}
          backButton={<BackButton onClick={() => router.push(backHref)} />}
          actions={
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="flex h-9 sm:h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{t("centre", "accountSignOut")}</span>
            </button>
          }
        />
      }
    >
      <section className="nexa-account-profile nexa-center-shell grid gap-5 py-6 lg:grid-cols-[0.9fr_1.4fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-black/[0.08] bg-white p-5">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-lg text-xl font-extrabold text-white"
                style={{ backgroundColor: BLUE }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold" style={{ color: BLUE }}>{displayName}</p>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: ORANGE }}>
                  {roleLabel(account.profile?.role, account.membership?.role)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm font-medium text-neutral-600">
              <InfoLine icon={Mail} label={t("centre", "accountEmail")} value={account.profile?.email || account.user.email || emptyValue} />
              <InfoLine icon={Phone} label={t("centre", "accountPhone")} value={account.profile?.phone || emptyValue} />
              <InfoLine icon={MapPin} label={t("centre", "settingsCity")} value={account.profile?.ville || emptyValue} />
              <InfoLine icon={Calendar} label={t("centre", "accountRegistration")} value={formatDate(account.profile?.created_at || account.user.created_at, locale)} />
            </div>
          </section>

          <section className="rounded-xl border border-black/[0.08] bg-white p-5">
            <div className="flex items-center gap-3">
              <CenterBrandMark icon={Building2} size={40} />
              <div>
                <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "accountLinkedCenter")}</p>
                <p className="text-[13px] font-medium text-neutral-400">{account.center.status === "active" ? t("centre", "accountActiveCenter") : t("centre", "accountSuspendedCenter")}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-orange-100 p-4" style={{ backgroundColor: SURFACE }}>
              <p className="text-base font-extrabold" style={{ color: BLUE }}>{account.center.name}</p>
              <p className="mt-1 text-[13px] font-medium text-neutral-500">{account.center.city || t("centre", "accountCityMissing")}</p>
              {account.center.code && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(account.center.code || "");
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  className="mt-4 flex w-full items-center justify-between rounded-lg bg-white border border-black/[0.06] px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[12px] font-medium text-neutral-500">{t("centre", "accountCenterCode")}</span>
                    <span className="font-mono text-lg font-extrabold tracking-wide" style={{ color: BLUE }}>{account.center.code}</span>
                  </span>
                  {copied ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5 text-neutral-400" />}
                </button>
              )}
            </div>
          </section>
        </aside>

        <div className="space-y-4">
          <section className="rounded-xl border border-black/[0.08] bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <CenterBrandMark icon={User} size={40} />
              <div>
                <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "accountPersonalInfo")}</p>
                <p className="text-[13px] font-medium text-neutral-400">{t("centre", "accountPersonalInfoHelp")}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("centre", "enrollmentFirstName")} value={form.prenom} onChange={(value) => setForm((current) => ({ ...current, prenom: value }))} />
              <Field label={t("centre", "accountPhoneWhatsapp")} value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Field label={t("centre", "settingsCity")} value={form.ville} onChange={(value) => setForm((current) => ({ ...current, ville: value }))} />
              <label className="md:col-span-2">
                <span className="mb-1.5 block text-[12px] font-medium text-neutral-500">{t("centre", "accountGender")}</span>
                <select
                  value={form.genre}
                  onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-black/[0.08] bg-white px-3.5 text-sm font-semibold text-neutral-900 outline-none focus:border-[#11224E]"
                >
                  <option value="">{t("centre", "accountNotProvided")}</option>
                  <option value="Homme">{t("centre", "accountMale")}</option>
                  <option value="Femme">{t("centre", "accountFemale")}</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 md:w-auto md:px-5"
              style={{ backgroundColor: BLUE }}
            >
              <Save size={14} />
              {saving ? t("centre", "accountSaving") : t("centre", "accountSave")}
            </button>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <MiniCard icon={ShieldCheck} label={t("centre", "accountRole")} value={roleLabel(account.profile?.role, account.membership?.role)} />
            <MiniCard icon={BadgeCheck} label={t("centre", "settingsStatus")} value={account.profile?.tag_status || account.center.status || t("centre", "campusActiveLower")} />
            <MiniCard icon={GraduationCap} label={t("centre", "accountSimulations")} value={String(account.profile?.simulations_completed || 0)} />
          </section>

          {permissions.length > 0 && (
            <section className="rounded-xl border border-black/[0.08] bg-white p-5">
              <div className="flex items-center gap-3">
                <CenterBrandMark icon={Users} size={40} />
                <div>
                  <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "accountAuthorizedAccess")}</p>
                  <p className="text-[13px] font-medium text-neutral-400">{t("centre", "accountVisibleModules")}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <span key={permission} className="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-[12px] font-semibold text-neutral-700" style={{ backgroundColor: SURFACE }}>
                    {permissionKeys[permission] ? t("centre", permissionKeys[permission]) : permission}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <OutlineHeaderButton onClick={() => router.push(dashboardHref)}>
              {t("centre", "accountBackDashboardShort")}
            </OutlineHeaderButton>
          </div>
        </div>
      </section>

      {logoutConfirmOpen && (
        <LogoutConfirmDialog
          title={t("centre", "profileLogoutConfirmTitle")}
          message={t("centre", "profileLogoutConfirmMessage")}
          confirmLabel={t("centre", "accountSignOut")}
          cancelLabel={t("centre", "periodCancel")}
          busy={logoutBusy}
          onConfirm={() => void signOut()}
          onCancel={() => {
            if (!logoutBusy) setLogoutConfirmOpen(false);
          }}
        />
      )}
    </CenterPageLayout>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] px-3.5 py-3" style={{ backgroundColor: SURFACE }}>
      <Icon className="h-4 w-4 shrink-0" style={{ color: BLUE }} strokeWidth={1.75} />
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-neutral-500">{label}</span>
        <span className="block truncate text-sm font-semibold text-neutral-900">{value}</span>
      </span>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-black/[0.08] bg-white px-3.5 text-sm font-semibold text-neutral-900 outline-none focus:border-[#11224E]"
      />
    </label>
  );
}

function MiniCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-4">
      <CenterBrandMark icon={Icon} size={36} />
      <p className="mt-3 text-base font-extrabold" style={{ color: BLUE }}>{value}</p>
      <p className="mt-1 text-[12px] font-medium text-neutral-500">{label}</p>
    </div>
  );
}
