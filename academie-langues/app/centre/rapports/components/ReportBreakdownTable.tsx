"use client";

import { TableProperties } from "lucide-react";
import { BLUE } from "@/app/centre/dashboard/dashboard-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

type Col = { key: string; label: string; align?: "left" | "right" };

type Props = {
  title?: string;
  columns: Col[];
  rows: Record<string, string | number | null | undefined>[];
  emptyLabel?: string;
};

export default function ReportBreakdownTable({
  title,
  columns,
  rows,
  emptyLabel,
}: Props) {
  const { t } = useI18n();
  const empty = emptyLabel || t("centre", "reportsNoDataForPeriod");

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2 bg-gradient-to-r from-neutral-50/80 to-white">
          <div className="w-7 h-7 rounded-lg bg-[#11224E]/5 flex items-center justify-center">
            <TableProperties size={14} style={{ color: BLUE }} />
          </div>
          <h2 className="text-sm font-black" style={{ color: BLUE }}>{title}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 z-[1]">
            <tr className="bg-neutral-50/95 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <p className="text-neutral-400 text-sm">{empty}</p>
                </td>
              </tr>
            ) : (
              rows.slice(0, 100).map((row, i) => (
                <tr
                  key={i}
                  className={`border-t border-neutral-100 transition-colors hover:bg-[#11224E]/[0.03] ${
                    i % 2 === 1 ? "bg-neutral-50/40" : ""
                  }`}
                >
                  {columns.map((c, ci) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2.5 text-neutral-700 ${
                        c.align === "right" ? "text-right tabular-nums font-semibold" : ""
                      } ${ci === 0 ? "font-semibold text-neutral-800" : "font-medium"}`}
                    >
                      {row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 100 && (
        <p className="px-4 py-2.5 text-[10px] text-neutral-400 border-t border-neutral-100 bg-neutral-50/50">
          {t("centre", "reportsTableLimited")}
        </p>
      )}
    </div>
  );
}
