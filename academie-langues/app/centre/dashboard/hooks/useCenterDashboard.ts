"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { buildCenterSignupUrl } from "@/app/utils/center-signup-link";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { fetchCenterApi } from "@/app/utils/center-api-client";
import { resolveDashboardModules } from "../utils";
import { VIEW_AS_EVENT, isViewAsStaffPreview } from "@/app/utils/view-as";
import type {
  Campus,
  CenterInfo,
  GenericDashboardStats,
  TcfDashboardStats,
} from "../types";
import { useI18n } from "@/app/i18n/I18nProvider";

const EMPTY_GENERIC: GenericDashboardStats = {
  fin: { ca: 0, paid: 0, pending: 0, late: 0 },
  activeStudents: 0,
  coursesCount: 0,
  cancelledCount: 0,
  absent: [],
  exams: [],
  msgCount: 0,
};

const EMPTY_TCF: TcfDashboardStats = {
  totalStudents: 0,
  enrolledToday: 0,
  enrolledThisWeek: 0,
  pendingValidation: 0,
  inactiveStudents: 0,
  onSimulator: 0,
  coursesToday: 0,
  livesScheduled: 0,
  examsScheduled: 0,
  collectedToday: 0,
  latePayments: 0,
  lateAmount: 0,
  msgCount: 0,
};

type DashboardStatsResponse = {
  isTCF: boolean;
  campuses: Campus[];
  generic: GenericDashboardStats | null;
  tcf: TcfDashboardStats | null;
};

function applyBootstrap(
  bootstrap: NonNullable<ReturnType<typeof peekCenterBootstrap>>,
  setters: {
    setStaffPrenom: (v: string) => void;
    setCenterId: (v: string) => void;
    setCenter: (v: CenterInfo | null) => void;
    setIsTCF: (v: boolean) => void;
    setRole: (v: string | null) => void;
    setPermissions: (v: string[]) => void;
  },
) {
  const centerInfo = bootstrap.me.center as CenterInfo;
  setters.setStaffPrenom(bootstrap.staffPrenom);
  setters.setCenterId(bootstrap.centerId);
  setters.setCenter(centerInfo);
  setters.setIsTCF(centerInfo?.center_type === "tcf_canada");
  setters.setRole((bootstrap.me.role as string | null) ?? null);
  setters.setPermissions(((bootstrap.me.permissions as string[] | undefined) || []));
}

export function useCenterDashboard() {
  const router = useRouter();
  const { locale } = useI18n();
  const [statsLoading, setStatsLoading] = useState(true);
  const [staffPrenom, setStaffPrenom] = useState("Directeur");
  const [center, setCenter] = useState<CenterInfo | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [centerId, setCenterId] = useState("");
  const [isTCF, setIsTCF] = useState(false);
  const [genericStats, setGenericStats] = useState<GenericDashboardStats>(EMPTY_GENERIC);
  const [tcfStats, setTcfStats] = useState<TcfDashboardStats>(EMPTY_TCF);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const statsRequestId = useRef(0);
  const statsReady = useRef(false);

  const setters = { setStaffPrenom, setCenterId, setCenter, setIsTCF, setRole, setPermissions };

  const loadStats = useCallback(async (campusId: string | null, force = false) => {
    const requestId = ++statsRequestId.current;
    if (!statsReady.current) setStatsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params: Record<string, string> = {};
      if (campusId) params.campusId = campusId;

      const data = await fetchCenterApi<DashboardStatsResponse>(
        "/api/center/dashboard-stats",
        session.access_token,
        { force, params: Object.keys(params).length ? params : undefined },
      );

      if (requestId !== statsRequestId.current) return;

      setIsTCF(data.isTCF);
      setCampuses(data.campuses || []);
      if (data.isTCF && data.tcf) setTcfStats(data.tcf);
      else if (data.generic) setGenericStats(data.generic);
      statsReady.current = true;
    } catch (err) {
      console.error("loadStats:", err);
      if (requestId === statsRequestId.current) {
        setGenericStats(EMPTY_GENERIC);
        setTcfStats(EMPTY_TCF);
      }
    } finally {
      if (requestId === statsRequestId.current) setStatsLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    const cached = peekCenterBootstrap();
    if (!cached) return;
    applyBootstrap(cached, setters);
    void loadStats(null);
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const hadCache = Boolean(peekCenterBootstrap());
      const bootstrap = await loadCenterBootstrap();
      if (!bootstrap) {
        if (!cancelled) router.replace("/login");
        return;
      }

      if (cancelled) return;
      applyBootstrap(bootstrap, setters);
      if (!hadCache) await loadStats(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, loadStats]);

  const handleCampus = async (id: string | null) => {
    setSelectedCampus(id);
    await loadStats(id, true);
  };

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    const url = buildCenterSignupUrl(window.location.origin, center, isTCF ? undefined : locale);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [viewAsStaff, setViewAsStaff] = useState(false);
  useEffect(() => {
    const sync = () => setViewAsStaff(isViewAsStaffPreview());
    sync();
    window.addEventListener(VIEW_AS_EVENT, sync);
    return () => window.removeEventListener(VIEW_AS_EVENT, sync);
  }, []);

  const resolved = resolveDashboardModules(role, permissions, center?.center_type);
  const canAccess = viewAsStaff ? () => true : resolved.canAccess;

  return {
    statsLoading,
    staffPrenom,
    center,
    campuses,
    selectedCampus,
    isTCF,
    genericStats,
    tcfStats,
    copied,
    copyLink,
    handleCampus,
    canAccess,
    role,
  };
}
