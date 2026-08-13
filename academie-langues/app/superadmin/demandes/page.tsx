"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Inbox,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
} from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { useI18n } from "@/app/i18n/I18nProvider";

type ApplicationStatus = "new" | "contacted" | "approved" | "rejected";

type CenterApplication = {
  id: string;
  center_name: string;
  city: string | null;
  address: string | null;
  manager_name: string;
  manager_role: string | null;
  email: string;
  phone: string;
  student_volume: string | null;
  needs: string[] | null;
  message: string | null;
  status: ApplicationStatus;
  center_code: string | null;
  approved_center_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type Credentials = {
  email: string;
  password: string;
  name: string;
  centerName: string;
  centerCode: string;
};

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  new: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  contacted: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-300 border-red-500/20",
};

export default function SuperadminDemandesPage() {
  const { t, locale } = useI18n();
  const [applications, setApplications] = useState<CenterApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const statusLabel = (status: ApplicationStatus) => {
    if (locale === "en") {
      return (
        {
          new: "New",
          contacted: "Contacted",
          approved: "Approved",
          rejected: "Rejected",
        } as const
      )[status];
    }
    return (
      {
        new: "Nouveau",
        contacted: "Contacté",
        approved: "Approuvé",
        rejected: "Rejeté",
      } as const
    )[status];
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await superadminFetch<{ applications: CenterApplication[] }>(
        "/api/superadmin/applications",
      );
      setApplications(json.applications || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: Exclude<ApplicationStatus, "approved">) => {
    setActionId(id);
    setError("");
    try {
      await superadminFetch(`/api/superadmin/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setActionId(null);
    }
  };

  const approve = async (id: string) => {
    setActionId(id);
    setError("");
    try {
      const json = await superadminFetch<{ credentials: Credentials }>(
        `/api/superadmin/applications/${id}`,
        {
          method: "POST",
          body: JSON.stringify({ action: "approve" }),
        },
      );
      setCredentials(json.credentials);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setActionId(null);
    }
  };

  const newCount = applications.filter((a) => a.status === "new").length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {credentials && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-emerald-500/30 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
              <Building2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white">
              {locale === "en" ? "Center approved" : "Centre approuvé"}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              {locale === "en"
                ? `Share these credentials with ${credentials.name} for ${credentials.centerName}.`
                : `Transmettez ces accès à ${credentials.name} pour ${credentials.centerName}.`}
            </p>
            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</p>
              <p className="font-mono text-sm font-bold text-white">{credentials.email}</p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {locale === "en" ? "Password" : "Mot de passe"}
              </p>
              <p className="font-mono text-lg font-black tracking-widest text-orange-400">
                {credentials.password}
              </p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {locale === "en" ? "Center code" : "Code centre"}
              </p>
              <p className="font-mono text-lg font-black tracking-widest text-emerald-400">
                {credentials.centerCode || "—"}
              </p>
            </div>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `Centre : ${credentials.centerName}\nCode centre : ${credentials.centerCode || "-"}\nEmail : ${credentials.email}\nMot de passe : ${credentials.password}\nLien connexion : ${window.location.origin}/login`,
                  )
                }
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-emerald-500"
              >
                {locale === "en" ? "Copy credentials" : "Copier les accès"}
              </button>
              <button
                type="button"
                onClick={() => setCredentials(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700"
              >
                {locale === "en" ? "Close" : "Fermer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-orange-400" />
            <h1 className="text-xl font-black text-white">
              {locale === "en" ? "Center applications" : "Demandes centres"}
            </h1>
            {newCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                {newCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {locale === "en"
              ? "Inbox for new center signup requests — approve, contact or reject."
              : "Boîte de réception des demandes d’ouverture de centre — approuver, contacter ou rejeter."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            <Link href="/superadmin/commercial" className="text-orange-400 hover:text-orange-300">
              {locale === "en" ? "Commercial pipeline" : "Pipeline commercial"}
            </Link>
            {" · "}
            <Link href="/superadmin/centres" className="text-orange-400 hover:text-orange-300">
              {locale === "en" ? "Centers & subscriptions" : "Centres & abonnements"}
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {locale === "en" ? "Refresh" : "Actualiser"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-12 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-700" />
          <p className="font-bold text-slate-400">
            {locale === "en" ? "No center applications yet" : "Aucune demande de centre pour l’instant"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {locale === "en"
              ? "Requests from “Create a center” will appear here."
              : "Les demandes envoyées depuis « Créer un centre » apparaîtront ici."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">{application.center_name}</h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${STATUS_STYLE[application.status]}`}
                    >
                      {statusLabel(application.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {locale === "en" ? "Requested on" : "Demande du"}{" "}
                    {new Date(application.created_at).toLocaleDateString(
                      locale === "en" ? "en-US" : "fr-FR",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                  </p>
                </div>
                {application.status !== "approved" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void setStatus(application.id, "contacted")}
                      disabled={actionId === application.id}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-300 hover:bg-amber-500 hover:text-white disabled:opacity-50"
                    >
                      {locale === "en" ? "Contacted" : "Contacté"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void approve(application.id)}
                      disabled={actionId === application.id}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                    >
                      {locale === "en" ? "Approve" : "Approuver"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void setStatus(application.id, "rejected")}
                      disabled={actionId === application.id}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50"
                    >
                      {locale === "en" ? "Reject" : "Rejeter"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {locale === "en" ? "Manager" : "Responsable"}
                  </p>
                  <p className="mt-2 font-bold text-white">{application.manager_name}</p>
                  {application.manager_role && (
                    <p className="text-xs font-semibold text-slate-500">{application.manager_role}</p>
                  )}
                  <div className="mt-3 space-y-1 text-xs font-semibold text-slate-400">
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-orange-400" /> {application.email}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-orange-400" /> {application.phone}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {locale === "en" ? "Center" : "Centre"}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">{application.city}</p>
                  {application.address && (
                    <p className="text-xs font-semibold text-slate-500">{application.address}</p>
                  )}
                  {application.student_volume && (
                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      {locale === "en" ? "Volume" : "Volume"}: {application.student_volume}
                    </p>
                  )}
                  {application.center_code && (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
                        {locale === "en" ? "Center code" : "Code centre"}
                      </p>
                      <p className="font-mono text-lg font-black tracking-widest text-white">
                        {application.center_code}
                      </p>
                    </div>
                  )}
                  {application.approved_center_id && (
                    <Link
                      href={`/superadmin/centres?focus=${application.approved_center_id}`}
                      className="mt-3 inline-block text-xs font-bold text-orange-400 hover:text-orange-300"
                    >
                      {locale === "en" ? "Open center →" : "Ouvrir le centre →"}
                    </Link>
                  )}
                </div>
              </div>

              {application.message && (
                <div className="mt-3 rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Message
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-300">
                    {application.message}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
