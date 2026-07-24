"use client";

import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, ClipboardList, Clock, MessageSquare,
  TrendingUp, Users, UserPlus, Wallet,
} from "lucide-react";
import type { Campus, GenericDashboardStats } from "../types";
import { BLUE, ORANGE, QuietKpi } from "../dashboard-ui";
import { fmtXAF } from "../utils";

type Props = {
  stats: GenericDashboardStats;
  campuses: Campus[];
  selectedCampus: string | null;
  onCampusChange: (id: string | null) => void;
  canAccess?: (...keys: string[]) => boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium text-neutral-900 tracking-tight">
      {children}
    </h2>
  );
}

function QuietAction({
  href,
  icon: Icon,
  label,
  subtitle,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  subtitle: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-neutral-200 bg-white p-4 flex items-center gap-3 hover:border-neutral-300 hover:bg-neutral-50/80 transition-colors"
    >
      <span className="w-10 h-10 rounded-xl border border-neutral-100 bg-neutral-50 flex items-center justify-center shrink-0">
        <Icon size={18} style={{ color: ORANGE }} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: BLUE }}>{label}</p>
        <p className="text-[12px] text-neutral-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          style={{ backgroundColor: ORANGE }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export default function GenericManagerDashboard({
  stats,
  campuses,
  selectedCampus,
  onCampusChange,
  canAccess = () => true,
}: Props) {
  const { fin, activeStudents, coursesCount, cancelledCount, absent, exams, msgCount } = stats;

  const showFinance = canAccess("finance");
  const showCourses = canAccess("cours", "planning");
  const showExams = canAccess("examens");
  const showStudents = canAccess("etudiants");
  const showStaff = canAccess("staff");
  const showCommunaute = canAccess("communaute");
  const showPanels = showCourses || showExams || showStudents;

  return (
    <>
      {showFinance && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <SectionTitle>Finances</SectionTitle>
              <Link
                href="/centre/finance"
                className="sm:hidden inline-flex items-center gap-1 text-[12px] font-medium text-neutral-600"
              >
                Détails <ArrowUpRight size={13} style={{ color: ORANGE }} />
              </Link>
            </div>

            {campuses.length > 1 && (
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
                  Tous
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

            <Link
              href="/centre/finance"
              className="hidden sm:inline-flex items-center gap-1 text-[12px] font-medium text-neutral-600 hover:text-neutral-900"
            >
              Détails <ArrowUpRight size={13} style={{ color: ORANGE }} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuietKpi label="C.A. attendu" value={fmtXAF(fin.ca)} sub="XAF" icon={TrendingUp} />
            <QuietKpi label="Encaissé" value={fmtXAF(fin.paid)} sub="XAF" icon={Wallet} />
            <QuietKpi label="Reste à percevoir" value={fmtXAF(fin.pending)} sub="XAF" icon={Clock} />
            <QuietKpi
              label="Retards"
              value={String(fin.late)}
              sub="paiements"
              icon={AlertTriangle}
              alert={fin.late > 0}
            />
          </div>
        </section>
      )}

      {showPanels && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {showCourses && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Cours · cette semaine</SectionTitle>
                <Link href="/centre/cours/planning" className="text-[12px] font-medium text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-0.5">
                  Voir <ArrowUpRight size={12} style={{ color: ORANGE }} />
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Programmés</span>
                  <span className="text-lg font-medium tabular-nums" style={{ color: BLUE }}>{coursesCount}</span>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <span className="text-sm text-neutral-600">Annulés</span>
                  <span className={`text-lg font-medium tabular-nums ${cancelledCount > 0 ? "text-red-600" : "text-neutral-300"}`}>
                    {cancelledCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showExams && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Prochains événements</SectionTitle>
                <Link href="/centre/examens/examensuniversels" className="text-[12px] font-medium text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-0.5">
                  Voir <ArrowUpRight size={12} style={{ color: ORANGE }} />
                </Link>
              </div>
              {exams.length === 0 ? (
                <p className="text-sm text-neutral-400 py-6 text-center">Aucun événement à venir.</p>
              ) : (
                <ul className="space-y-3">
                  {exams.map((e) => (
                    <li key={e.id} className="flex items-start gap-3">
                      <ClipboardList size={16} className="shrink-0 mt-0.5" style={{ color: ORANGE }} strokeWidth={1.75} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: BLUE }}>{e.title}</p>
                        <p className="text-[12px] text-neutral-500 mt-0.5">
                          {new Date(e.actual_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          {e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showStudents && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle>Apprenants</SectionTitle>
                <Link href="/centre/etudiants" className="text-[12px] font-medium text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-0.5">
                  Voir <ArrowUpRight size={12} style={{ color: ORANGE }} />
                </Link>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-normal tracking-tight tabular-nums" style={{ color: BLUE }}>
                  {activeStudents}
                </span>
                <span className="text-[13px] text-neutral-500">inscrits actifs</span>
              </div>
              {absent.length > 0 ? (
                <div className="border-t border-neutral-100 pt-3">
                  <p className="text-[12px] font-medium text-neutral-700 mb-2">
                    Absents +5 jours · {absent.length}
                  </p>
                  <ul className="space-y-1">
                    {absent.slice(0, 4).map((s) => (
                      <li key={s.id} className="text-[13px] text-neutral-600 truncate">
                        {s.prenom} {s.nom}
                      </li>
                    ))}
                    {absent.length > 4 && (
                      <li className="text-[12px] text-neutral-400">+ {absent.length - 4} autres</li>
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-[13px] text-neutral-500 border-t border-neutral-100 pt-3">
                  Tous les apprenants sont actifs.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <section className="space-y-3">
        <SectionTitle>Actions rapides</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {showStudents && (
            <QuietAction
              href="/centre/etudiants"
              icon={UserPlus}
              label="Créer un étudiant"
              subtitle="Nouvelle inscription"
            />
          )}
          {showStaff && (
            <QuietAction
              href="/centre/staff"
              icon={Users}
              label="Ajouter du personnel"
              subtitle="Équipe du centre"
            />
          )}
          {showCommunaute && (
            <QuietAction
              href="/centre/communaute"
              icon={MessageSquare}
              label="Communauté"
              subtitle="Messages & groupes"
              badge={msgCount > 0 ? msgCount : undefined}
            />
          )}
          {showFinance && (
            <QuietAction
              href="/centre/finance"
              icon={TrendingUp}
              label="Voir les finances"
              subtitle="Encaissements & soldes"
            />
          )}
        </div>
      </section>
    </>
  );
}
