"use client";

import { useRouter } from "next/navigation";
import {
  Users, Calendar, ClipboardList, Wallet, ArrowRight, UserPlus,
  Bell, WifiOff, Gamepad2, Video, BookOpen, AlertTriangle, TrendingUp,
  FileText, Link2, Check, MessageSquare,
} from "lucide-react";
import type { Campus, TcfDashboardStats } from "../types";
import { Label, ORANGE, QuickAction } from "../dashboard-ui";
import { fmtFCFA } from "../utils";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";

type Props = {
  stats: TcfDashboardStats;
  campuses?: Campus[];
  selectedCampus?: string | null;
  onCampusChange?: (id: string | null) => void;
  linkCopied: boolean;
  onCopyLink: () => void;
  showSignupLink: boolean;
  signupUrl?: string | null;
  canAccess?: (...keys: string[]) => boolean;
};

export default function TcfManagerDashboard({
  stats,
  campuses = [],
  selectedCampus = null,
  onCampusChange,
  linkCopied,
  onCopyLink,
  showSignupLink,
  signupUrl,
  canAccess = () => true,
}: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const data = stats;

  const showStudents = canAccess("etudiants");
  const showPlanning = canAccess("planning", "cours");
  const showExams = canAccess("examens");
  const showFinance = canAccess("finance");
  const showCommunaute = canAccess("communaute");
  const showAnyCard = showStudents || showPlanning || showExams || showFinance;

  return (
    <div className="space-y-4 sm:space-y-5">
      {campuses.length > 1 && onCampusChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full pb-0.5">
          <button
            type="button"
            onClick={() => onCampusChange(null)}
            className={`h-8 px-3.5 rounded-full text-[12px] font-medium shrink-0 transition-colors ${
              !selectedCampus
                ? "text-white"
                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
            style={!selectedCampus ? { backgroundColor: BLUE } : undefined}
          >
            {t("centre", "managerAllCampuses")}
          </button>
          {campuses.map((c) => {
            const active = selectedCampus === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCampusChange(c.id)}
                className={`h-8 px-3.5 rounded-full text-[12px] font-medium shrink-0 transition-colors ${
                  active
                    ? "text-white"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
                style={active ? { backgroundColor: BLUE } : undefined}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
      {showAnyCard && (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {showStudents && (
        <div
          className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/centre/tcf/etudiants")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
              <Users size={18} className="text-blue-600" />
            </div>
            <ArrowRight size={14} className="text-neutral-300" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Étudiants TCF</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><UserPlus size={12} /> Inscrits aujourd&apos;hui</span>
              <span className="text-sm font-black" style={{ color: BLUE }}>{data.enrolledToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><TrendingUp size={12} /> Cette semaine</span>
              <span className="text-sm font-black" style={{ color: BLUE }}>{data.enrolledThisWeek}</span>
            </div>
            {data.pendingValidation > 0 && (
              <div className="flex justify-between items-center bg-amber-50 -mx-2 px-2 py-1 rounded-lg">
                <span className="text-xs text-amber-700 font-bold flex items-center gap-1.5"><Bell size={12} /> En attente</span>
                <span className="text-sm font-black text-amber-700">{data.pendingValidation}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><WifiOff size={12} /> Inactifs (+3j)</span>
              <span className="text-sm font-black text-neutral-400">{data.inactiveStudents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><Gamepad2 size={12} /> Sur simulateur</span>
              <span className="text-sm font-black text-emerald-600">{data.onSimulator || "—"}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-[10px] text-neutral-400 font-bold">Total</span>
            <span className="text-lg font-black" style={{ color: BLUE }}>{data.totalStudents}</span>
          </div>
        </div>
        )}

        {showPlanning && (
        <div
          className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/centre/cours/planning")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <ArrowRight size={14} className="text-neutral-300" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Planning du jour</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><BookOpen size={12} /> Cours planifiés</span>
              <span className="text-sm font-black" style={{ color: BLUE }}>{data.coursesToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><Video size={12} /> Sessions live</span>
              <span className="text-sm font-black" style={{ color: BLUE }}>{data.livesScheduled}</span>
            </div>
          </div>
          {data.coursesToday === 0 && data.livesScheduled === 0 && (
            <div className="mt-4 bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-neutral-400 font-bold">Aucun cours aujourd&apos;hui</p>
            </div>
          )}
        </div>
        )}

        {showExams && (
        <div
          className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/centre/examens/examensuniversels")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100">
              <ClipboardList size={18} style={{ color: ORANGE }} />
            </div>
            <ArrowRight size={14} className="text-neutral-300" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Examens</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><ClipboardList size={12} /> Programmés</span>
              <span className="text-sm font-black" style={{ color: BLUE }}>{data.examsScheduled}</span>
            </div>
          </div>
          {data.examsScheduled === 0 && (
            <div className="mt-4 bg-neutral-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-neutral-400 font-bold">Aucun examen programmé</p>
            </div>
          )}
        </div>
        )}

        {showFinance && (
        <div
          className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/centre/finance")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <ArrowRight size={14} className="text-neutral-300" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Finance</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 flex items-center gap-1.5"><TrendingUp size={12} /> Encaissé aujourd&apos;hui</span>
              <span className="text-sm font-black text-emerald-600">{fmtFCFA(data.collectedToday)} F</span>
            </div>
            {data.latePayments > 0 && (
              <div className="flex justify-between items-center bg-red-50 -mx-2 px-2 py-1 rounded-lg">
                <span className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertTriangle size={12} /> En retard</span>
                <span className="text-sm font-black text-red-600">{data.latePayments}</span>
              </div>
            )}
          </div>
          {data.lateAmount > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-[10px] text-red-500 font-bold">Impayés</span>
              <span className="text-sm font-black text-red-600">{fmtFCFA(data.lateAmount)} F</span>
            </div>
          )}
        </div>
        )}
      </div>
      )}

      <section>
        <Label className="mb-3">Actions rapides</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {showStudents && (
          <QuickAction
            href="/centre/tcf/etudiants"
            icon={UserPlus}
            label="Inscrire un étudiant"
            subtitle="Créer ou valider"
            color="orange"
          />
          )}
          {canAccess("cours", "planning") && (
          <QuickAction
            href="/centre/cours/devoirs"
            icon={FileText}
            label="Créer un devoir"
            subtitle="Mission ou exercice"
            color="blue"
          />
          )}
          {showFinance && (
          <QuickAction
            href="/centre/finance"
            icon={Wallet}
            label="Encaisser un paiement"
            subtitle="Saisie rapide"
            color="green"
          />
          )}
          {showStudents && showSignupLink && signupUrl ? (
            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group bg-white border border-neutral-200/80 hover:border-purple-200 rounded-2xl p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-3 transition-all hover:shadow-sm text-left w-full min-h-[44px]"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Link2 size={16} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[12px] font-bold text-neutral-700 leading-tight block underline decoration-purple-300 underline-offset-2">
                  Lien d&apos;inscription
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5 block truncate">{signupUrl}</span>
              </div>
            </a>
          ) : showStudents && showSignupLink ? (
            <QuickAction
              icon={linkCopied ? Check : Link2}
              label={linkCopied ? "Lien copié !" : "Lien d'inscription"}
              subtitle="Partager aux étudiants"
              color="purple"
              onClick={onCopyLink}
            />
          ) : null}
          {showCommunaute && !(showStudents && showSignupLink) && (
            <QuickAction
              href="/centre/communaute"
              icon={MessageSquare}
              label="Communauté"
              subtitle="Messages du centre"
              color="purple"
              badge={data.msgCount > 0 ? data.msgCount : undefined}
            />
          )}
        </div>
      </section>
    </div>
  );
}
