export function fmtFCFA(n: number) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${neg ? "-" : ""}${grouped} FCFA`;
}

/** Montant seul (sans devise) — séparateur fine insécable */
export function fmtMoneyAmount(n: number) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${neg ? "-" : ""}${grouped}`;
}

/** KPI / graphiques : compact au-delà de 100 k (ex. 2,5 M + suffixe FCFA) */
export function fmtMoneyKpi(n: number): { value: string; suffix?: string } {
  const v = Math.round(Number(n) || 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const display =
      m >= 10
        ? `${sign}${Math.round(m)} M`
        : `${sign}${m.toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: m % 1 === 0 ? 0 : 1 })} M`;
    return { value: display, suffix: "FCFA" };
  }
  if (abs >= 100_000) {
    const k = abs / 1_000;
    return {
      value: `${sign}${k.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`,
      suffix: "FCFA",
    };
  }
  return { value: `${sign}${fmtMoneyAmount(abs)}`, suffix: "FCFA" };
}

/** Une ligne pour barres / légendes */
export function fmtMoneyBar(n: number) {
  const { value, suffix } = fmtMoneyKpi(n);
  return suffix ? `${value} ${suffix}` : value;
}

export function parseFcfaString(raw: string): number | null {
  const m = raw.trim().match(/^(-?[\d\s]+)\s*FCFA$/i);
  if (!m) return null;
  const n = Number(m[1].replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function fmtNum(n: number) {
  return Math.round(Number(n) || 0).toLocaleString("fr-FR");
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
