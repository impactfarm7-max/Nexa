"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { QuietKpi } from "@/app/centre/dashboard/dashboard-ui";
import { fmtMoneyKpi, fmtMoneyBar, parseFcfaString } from "@/app/utils/reports-export";

export type KpiItem = {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  alert?: boolean;
  /** Montant brut — format KPI compact automatique */
  money?: number;
};

function resolveDisplay(item: KpiItem): { value: string; suffix?: string; sub: string } {
  if (item.money != null) {
    const { value, suffix } = fmtMoneyKpi(item.money);
    return { value, suffix, sub: item.sub ?? "" };
  }
  const parsed = parseFcfaString(item.value);
  if (parsed != null) {
    const { value, suffix } = fmtMoneyKpi(parsed);
    const sub =
      item.sub && parseFcfaString(item.sub) != null
        ? fmtMoneyBar(parseFcfaString(item.sub)!)
        : (item.sub ?? "");
    return { value, suffix, sub };
  }
  return { value: item.value, sub: item.sub ?? "" };
}

export default function ReportKpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon ?? BarChart3;
        const { value, suffix, sub } = resolveDisplay(item);
        return (
          <QuietKpi
            key={item.label}
            label={item.label}
            value={value}
            suffix={suffix}
            sub={sub}
            icon={Icon}
            alert={item.alert}
          />
        );
      })}
    </div>
  );
}
