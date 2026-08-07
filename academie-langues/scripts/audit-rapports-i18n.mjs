import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const RAPPORTS = path.join(ROOT, "app/centre/rapports");
const API = path.join(ROOT, "app/api/center/reports");
const CENTRE_TS = path.join(ROOT, "app/i18n/messages/centre.ts");
const SIDEBAR = path.join(ROOT, "app/components/CenterSidebar.tsx");
const REPORTS_DATA = path.join(ROOT, "app/utils/reports-data.server.ts");
const API_CLIENT = path.join(ROOT, "app/utils/center-api-client.ts");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function keys(block) {
  const s = new Set();
  for (const m of block.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) s.add(m[1]);
  return s;
}

const centre = fs.readFileSync(CENTRE_TS, "utf8");
const frStart = centre.indexOf("fr: {");
const enStart = centre.indexOf("\n  en: {");
const frBlock = centre.slice(frStart, enStart);
const enBlock = centre.slice(enStart);
const fr = keys(frBlock);
const en = keys(enBlock);

const pages = walk(RAPPORTS);
const apiRoutes = walk(API);

const usedKeys = new Set();
const pagesWithoutI18n = [];
const hardcodedUi = [];
const pageStats = [];

const HARDCODE_RE =
  /(?:title|label|description|placeholder|emptyLabel|aria-label)=\{?\s*["']([A-Za-zÀ-ÿ][^"']{2,})["']/g;
const STRING_LIT_RE =
  /["']((?:Aucune|Erreur|Chargement|Actualisation|Synthèse|Finance|Apprenant|Encaissement|Recouvrement|Retard|Personnel|Filière|Examens|Management|Summary|Learners|Collections|Payroll|No data|Display limited|Server error)[^"']*)["']/gi;

for (const file of pages) {
  const src = fs.readFileSync(file, "utf8");
  const r = rel(file);
  const hasUseI18n = /useI18n/.test(src);
  const tCalls = [...src.matchAll(/t\(\s*["']centre["']\s*,\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (const k of tCalls) usedKeys.add(k);
  for (const m of src.matchAll(/t\(\s*["']centre["']\s*,\s*`([^`$]+)`/g)) {
    if (!m[1].includes("${")) usedKeys.add(m[1]);
  }

  const hard = [];
  for (const m of src.matchAll(HARDCODE_RE)) {
    const v = m[1];
    if (/^(left|right| synthese|sm:|md:|lg:|flex|grid)/i.test(v)) continue;
    if (v.length < 3) continue;
    hard.push({ kind: "attr", value: v, snippet: m[0].slice(0, 80) });
  }
  // skip config files for JSX text somewhat
  if (!r.includes("/config/")) {
    for (const m of src.matchAll(STRING_LIT_RE)) {
      hard.push({ kind: "string", value: m[1] });
    }
  }

  if ((r.endsWith("page.tsx") || r.includes("/components/")) && !hasUseI18n && tCalls.length === 0) {
    // hooks may not need useI18n
    if (!r.includes("/hooks/") && !r.includes("/config/") && !r.endsWith("layout.tsx")) {
      pagesWithoutI18n.push(r);
    }
  }

  pageStats.push({
    file: r,
    useI18n: hasUseI18n,
    tCount: tCalls.length,
    hardCount: hard.length,
    hard: hard.slice(0, 8),
  });
  for (const h of hard.slice(0, 5)) {
    hardcodedUi.push({ file: r, ...h });
  }
}

// template keys expected
const templates = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].flatMap((id) => [
    `reportsHubCard${id}Title`,
    `reportsHubCard${id}Description`,
  ]),
  "reportsHubSection_apprenants",
  "reportsHubSection_offre",
  "reportsHubSection_rh",
  "reportsHubSection_finance",
  "reportsHubSection_activite",
  "reportsSection_pilotage",
  "reportsSection_apprenants",
  "reportsSection_offre",
  "reportsSection_rh",
  "reportsSection_finance",
  "reportsSection_activite",
  "reportsNav_synthese",
  "reportsNav_effectifs_apprenants",
  "reportsNav_filieres_programmes",
  "reportsNav_effectifs_personnel",
  "reportsNav_masse_salariale",
  "reportsNav_encaissements",
  "reportsNav_recouvrement",
  "reportsNav_retards",
  "reportsNav_reductions_coupons",
  "reportsNav_examens",
];
for (const k of templates) usedKeys.add(k);

const missingFr = [...usedKeys].filter((k) => !fr.has(k)).sort();
const missingEn = [...usedKeys].filter((k) => !en.has(k)).sort();

const reportPrefixes = [
  "reports",
  "summary",
  "enrollment",
  "recovery",
  "overdue",
  "discount",
  "staffReport",
  "programReport",
  "program",
  "collections",
  "payroll",
  "navRapports",
  "hubOpen",
];
const isReportKey = (k) => reportPrefixes.some((p) => k === p || k.startsWith(p));
const frReport = [...fr].filter(isReportKey).sort();
const enReport = [...en].filter(isReportKey).sort();
const onlyFr = frReport.filter((k) => !en.has(k));
const onlyEn = enReport.filter((k) => !fr.has(k));

// API locale
const apiLocale = [];
for (const file of apiRoutes) {
  const src = fs.readFileSync(file, "utf8");
  const r = rel(file);
  apiLocale.push({
    file: r,
    usesShared: /getReportsContext|reportsCatchError/.test(src),
    catchBilingual: /reportsCatchError|Server error|locale === "en"/.test(src),
    hardErreurServeur: /"Erreur serveur"/.test(src) && !/reportsCatchError/.test(src),
  });
}

// reports-data rtl coverage
const reportsData = fs.readFileSync(REPORTS_DATA, "utf8");
const rtlCount = (reportsData.match(/\brtl\(/g) || []).length;
const bareFrenchLabels = [
  ...reportsData.matchAll(/label:\s*"([A-Za-zÀ-ÿ][^"]{2,})"/g),
].map((m) => m[1]);
const bareFrenchInRtlFile = bareFrenchLabels.filter(
  (l) =>
    !/^(draft|validated|paid|planned|open|closed|cancelled|in_progress|completed|abandoned)$/i.test(
      l,
    ),
);

// config English fallbacks
const hub = fs.readFileSync(path.join(RAPPORTS, "config/report-hub.ts"), "utf8");
const p0 = fs.readFileSync(path.join(RAPPORTS, "config/p0-reports.ts"), "utf8");
const hubEnLabels = [...hub.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
const p0EnLabels = [...p0.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);

// sidebar
const sidebar = fs.readFileSync(SIDEBAR, "utf8");
const extractNav = (name) => {
  const re = new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = sidebar.match(re);
  if (!m) return { hasRapports: false, items: [] };
  const block = m[1];
  return {
    hasRapports: /navRapports|\/centre\/rapports/.test(block),
    items: [...block.matchAll(/label:\s*"([^"]+)"/g)].map((x) => x[1]),
  };
};
const navCoverage = {
  MANAGER_NAV: extractNav("MANAGER_NAV"),
  SHORT_MANAGER_NAV: extractNav("SHORT_MANAGER_NAV"),
  TCF_MANAGER_NAV: extractNav("TCF_MANAGER_NAV"),
  TCF_TRAINER_NAV: extractNav("TCF_TRAINER_NAV"),
  TCF_EXTRA_TRAINER_ITEMS: extractNav("TCF_EXTRA_TRAINER_ITEMS"),
  SHORT_EXTRA_TRAINER_ITEMS: extractNav("SHORT_EXTRA_TRAINER_ITEMS"),
};

// locale plumbing
const apiClient = fs.readFileSync(API_CLIENT, "utf8");
const bundleClient = fs.readFileSync(
  path.join(RAPPORTS, "hooks/reports-bundle-client.ts"),
  "utf8",
);
const useReportPage = fs.readFileSync(path.join(RAPPORTS, "hooks/useReportPage.ts"), "utf8");
const plumbing = {
  centerApiClientLocaleHeader: /[Xx]-[Nn]exa-[Ll]ocale|nexa-locale|locale/.test(apiClient),
  bundlePassesLocale: /locale|X-Nexa-Locale|x-nexa-locale/.test(bundleClient),
  useReportPageLocale: /locale/.test(useReportPage),
  sharedReqLocale: /x-nexa-locale/.test(fs.readFileSync(path.join(API, "shared.ts"), "utf8")),
};

// live pages from hub
const livePages = [
  "page.tsx (synthese)",
  "effectifs-apprenants",
  "filieres-programmes",
  "effectifs-personnel",
  "masse-salariale",
  "encaissements",
  "recouvrement",
  "retards",
  "reductions-coupons",
  "examens",
];

const components = pages
  .filter((p) => p.includes(`${path.sep}components${path.sep}`))
  .map(rel);

const findings = [];

if (missingFr.length || missingEn.length) {
  findings.push({
    sev: "high",
    area: "i18n keys",
    issue: `Clés t() manquantes: FR ${missingFr.length}, EN ${missingEn.length}`,
    fix: "Ajouter les clés dans centre.ts",
    detail: missingFr.slice(0, 20).join(", ") || missingEn.slice(0, 20).join(", "),
  });
} else {
  findings.push({
    sev: "ok",
    area: "i18n keys",
    issue: `Parité OK — ${usedKeys.size} clés utilisées, 0 manquante FR/EN`,
    fix: "—",
    detail: `${frReport.length} clés rapport-related en FR et EN`,
  });
}

if (onlyFr.length || onlyEn.length) {
  findings.push({
    sev: "medium",
    area: "catalogue",
    issue: `Déséquilibre catalogue rapports: onlyFr=${onlyFr.length} onlyEn=${onlyEn.length}`,
    fix: "Aligner centre.ts",
    detail: [...onlyFr, ...onlyEn].slice(0, 15).join(", "),
  });
}

const hardPages = pageStats.filter(
  (p) => p.hardCount > 0 && !p.file.includes("/config/") && !p.file.includes("/hooks/"),
);
if (hardPages.length) {
  findings.push({
    sev: "medium",
    area: "UI hardcodée",
    issue: `${hardPages.length} fichiers UI avec chaînes suspectes`,
    fix: "Remplacer par t() ou ignorer faux positifs (CSV/PDF/—)",
    detail: hardPages
      .slice(0, 12)
      .map((p) => `${p.file} (${p.hardCount})`)
      .join("; "),
  });
}

const apiBad = apiLocale.filter((a) => a.hardErreurServeur);
if (apiBad.length) {
  findings.push({
    sev: "high",
    area: "API",
    issue: `${apiBad.length} routes avec "Erreur serveur" non bilingue`,
    fix: "Utiliser reportsCatchError",
    detail: apiBad.map((a) => a.file).join(", "),
  });
} else {
  findings.push({
    sev: "ok",
    area: "API",
    issue: `${apiLocale.length} routes — catch bilingue via reportsCatchError / shared`,
    fix: "—",
    detail: "locale via x-nexa-locale dans getReportsContext",
  });
}

if (!plumbing.centerApiClientLocaleHeader || !plumbing.sharedReqLocale) {
  findings.push({
    sev: "high",
    area: "locale plumbing",
    issue: "Header locale manquant côté client ou API",
    fix: "Passer X-Nexa-Locale",
    detail: JSON.stringify(plumbing),
  });
} else {
  findings.push({
    sev: "ok",
    area: "locale plumbing",
    issue: "Client → API propage la locale",
    fix: "—",
    detail: JSON.stringify(plumbing),
  });
}

findings.push({
  sev: "low",
  area: "config fallback",
  issue: `report-hub.ts / p0-reports.ts: labels EN en config (${hubEnLabels.length + p0EnLabels.length} labels)`,
  fix: "OK si UI utilise toujours t(); sinon fallback EN si clé absente",
  detail: "ReportsHub + ReportsHubNav mappent vers clés i18n",
});

findings.push({
  sev: "info",
  area: "API data labels",
  issue: `reports-data.server.ts: ${rtlCount} appels rtl() pour labels bilingues`,
  fix: bareFrenchInRtlFile.length
    ? `Vérifier ${bareFrenchInRtlFile.length} labels bruts restants`
    : "—",
  detail: bareFrenchInRtlFile.slice(0, 10).join(", ") || "pas de label: \"…\" brut notable",
});

// sidebar (exclude TCF from "must have" requirement per user)
const mustHave = ["MANAGER_NAV", "SHORT_MANAGER_NAV", "SHORT_EXTRA_TRAINER_ITEMS"];
for (const name of mustHave) {
  const n = navCoverage[name];
  findings.push({
    sev: n.hasRapports ? "ok" : "high",
    area: "sidebar",
    issue: `${name}: Rapports ${n.hasRapports ? "présent" : "ABSENT"}`,
    fix: n.hasRapports ? "—" : "Ajouter navRapports",
    detail: "hors TCF (contrainte)",
  });
}
findings.push({
  sev: "info",
  area: "sidebar TCF",
  issue: `TCF_MANAGER_NAV: Rapports ${navCoverage.TCF_MANAGER_NAV.hasRapports ? "présent" : "absent (voulu)"}`,
  fix: "Ne pas modifier (contrainte user)",
  detail: `TCF_EXTRA_TRAINER: ${navCoverage.TCF_EXTRA_TRAINER_ITEMS.hasRapports ? "a Rapports" : "pas Rapports"}`,
});

// pages coverage
const pageFiles = pages.filter((p) => p.endsWith("page.tsx")).map(rel);
const pagesMissingT = pageStats.filter(
  (p) => p.file.endsWith("page.tsx") && p.tCount === 0,
);
if (pagesMissingT.length) {
  findings.push({
    sev: "high",
    area: "pages",
    issue: `${pagesMissingT.length} pages sans t()`,
    fix: "Brancher useI18n",
    detail: pagesMissingT.map((p) => p.file).join(", "),
  });
} else {
  findings.push({
    sev: "ok",
    area: "pages",
    issue: `${pageFiles.length} pages live — toutes utilisent t()`,
    fix: "—",
    detail: livePages.join(", "),
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  scope: "Menu Rapports centre — hors modifications TCF",
  counts: {
    pageFiles: pageFiles.length,
    componentFiles: components.length,
    apiRoutes: apiLocale.length,
    usedKeys: usedKeys.size,
    frReportKeys: frReport.length,
    enReportKeys: enReport.length,
    rtlCalls: rtlCount,
    missingFr: missingFr.length,
    missingEn: missingEn.length,
  },
  navCoverage,
  plumbing,
  apiLocale,
  pageStats: pageStats
    .filter((p) => p.file.endsWith("page.tsx") || p.file.includes("/components/"))
    .map(({ file, useI18n, tCount, hardCount }) => ({ file, useI18n, tCount, hardCount })),
  missingFr,
  missingEn,
  onlyFr,
  onlyEn,
  hardcodedUi: hardcodedUi.slice(0, 40),
  findings,
  hubEnLabelSample: hubEnLabels.slice(0, 8),
  bareFrenchInRtlFile: bareFrenchInRtlFile.slice(0, 15),
};

fs.writeFileSync(
  path.join(ROOT, "scripts/audit-rapports-i18n.report.json"),
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
