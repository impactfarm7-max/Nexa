"use client";

import { useEffect, useState } from "react";
import { ClipboardList, BookOpen, ArrowRight, Lock, Calendar, Trophy } from "lucide-react";
import Link from "next/link";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { supabase } from "@/app/utils/supabase";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  SURFACE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
} from "../../center-page-ui";

function HubCard({
  title,
  description,
  href,
  icon,
  disabled,
  disabledHint,
}: {
  title: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const { t } = useI18n();
  const inner = (
    <div
      className={`rounded-xl border h-full flex flex-col justify-between p-5 sm:p-6 transition-colors ${
        disabled
          ? "bg-neutral-50 border-black/[0.05] opacity-70 cursor-not-allowed"
          : "bg-white border-black/[0.06] hover:border-black/[0.12]"
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-5 gap-3">
          <div
            className={`p-3 rounded-xl border flex items-center justify-center ${
              disabled ? "border-black/[0.04] bg-neutral-50" : "border-black/[0.06]"
            }`}
            style={disabled ? undefined : { backgroundColor: SURFACE }}
          >
            {icon}
          </div>
          {disabled ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-400 inline-flex items-center gap-1 shrink-0">
              <Lock size={10} /> {t("centre", "examensUnavailableShort")}
            </span>
          ) : null}
        </div>
        <h3
          className={`text-lg font-extrabold tracking-tight ${disabled ? "text-neutral-400" : ""}`}
          style={disabled ? undefined : { color: BLUE }}
        >
          {title}
        </h3>
        <p className={`text-sm mt-2 leading-relaxed font-medium ${disabled ? "text-neutral-400" : "text-neutral-500"}`}>
          {description}
        </p>
      </div>

      {disabled ? (
        <p className="mt-6 text-xs font-semibold text-neutral-400 inline-flex items-center gap-1.5">
          <Lock size={12} className="shrink-0" />
          {disabledHint || t("centre", "examensNotYetAvailable")}
        </p>
      ) : (
        <div className="mt-6 flex items-center text-xs font-semibold" style={{ color: BLUE }}>
          <span>{t("centre", "examensOpen")}</span>
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (disabled || !href) return inner;
  return (
    <Link href={href} className="group block h-full">
      {inner}
    </Link>
  );
}

export default function ExamensHubPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.center_id) {
        const { data: center } = await supabase
          .from("centers")
          .select("center_type")
          .eq("id", profile.center_id)
          .maybeSingle();
        setCenterType(center?.center_type ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const isTcf = isTcfCanadaCenter(centerType);

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  return (
    <CenterPageLayout header={<CenterPageHeader title={t("centre", "examensAndGrades")} />}>
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium -mt-1 mb-1">
          {isTcf
            ? "Planifiez les examens complets et suivez les résultats de vos apprenants."
            : t("centre", "examensNonTcfIntro")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isTcf ? (
            <>
              <HubCard
                title="Planning des examens"
                description="Créez une séance, ciblez des classes ou des élèves, déployez un examen ou débloquez un accès ponctuel."
                href="/centre/examens/planning"
                icon={<Calendar className="h-6 w-6" style={{ color: BLUE }} />}
              />
              <HubCard
                title="Résultats & certificats"
                description="Consultez les scores, marquez les absents et envoyez les certificats."
                href="/centre/examens/resultats"
                icon={<Trophy className="h-6 w-6" style={{ color: BLUE }} />}
              />
            </>
          ) : (
            <>
              <HubCard
                title={t("centre", "examensGradebook")}
                description={t("centre", "examensGradebookDesc")}
                href="/centre/examens/notes"
                icon={<BookOpen className="h-6 w-6" style={{ color: BLUE }} />}
              />
              <HubCard
                title={t("centre", "examensOrganization")}
                description={t("centre", "examensOrganizationDesc")}
                icon={<ClipboardList className="h-6 w-6 text-neutral-400" />}
                disabled
                disabledHint={t("centre", "examensTcfOnly")}
              />
            </>
          )}
        </div>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
