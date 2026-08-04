"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "nexa_analytics_visitor_id";
const TRACKED_KEY = "nexa_analytics_last_track";

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export default function SiteAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/superadmin")) return;

    const now = Date.now();
    const last = sessionStorage.getItem(TRACKED_KEY);
    if (last) {
      const [lastPath, lastTime] = last.split("|");
      if (lastPath === pathname && now - Number(lastTime) < 10_000) return;
    }
    sessionStorage.setItem(TRACKED_KEY, `${pathname}|${now}`);

    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: getVisitorId(), path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
