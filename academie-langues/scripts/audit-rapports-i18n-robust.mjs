import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const RAPPORTS = path.join(ROOT, "app/centre/rapports");
const API = path.join(ROOT, "app/api/center/reports");
const CENTRE_TS = path.join(ROOT, "app/i18n/messages/centre.ts");
const REPORTS_DATA = path.join(ROOT, "app/utils/reports-data.server.ts");
const PDF = path.join(ROOT, "app/utils/centerPdfExport.ts");
const SIDEBAR = path.join(ROOT, "app/components/CenterSidebar.tsx");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

/** Parse centre.ts key -> {fr, en} values (flat object keys only). */
function parseCentreMessages(src) {
  const frStart = src.indexOf("fr: {");
  const enStart = src.indexOf("\n  en: {");
  const frBlock = src.slice(frStart, enStart);
  const enBlock = src.slice(enStart);
  const extract = (block) => {
    const map = new Map();
    for (const m of block.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"((?:\\.|[^"\\])*)"/g)) {
      map.set(m[1], m[2].replace(/\\"/g, '"'));
    }
    return map;
  };
  return { fr: extract(frBlock), en: extract(enBlock) };
}

const centreSrc = fs.readFileSync(CENTRE_TS, "utf8");
const { fr, en } = parseCentreMessages(centreSrc);

const PREFIXES = [
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
  "settingsStatus",
  "campusActive",
  "periodInactive",
];
const isReportish = (k) => PREFIXES.some((p) => k === p || k.startsWith(p));

// ── 1. Collect every t("centre", …) usage + dynamic templates ───────────────
const usedStatic = new Map(); // key -> [files]
const dynamicTemplates = [];
const files = walk(RAPPORTS);

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const r = rel(file);
  for (const m of src.matchAll(/t\(\s*["']centre["']\s*,\s*["']([^"']+)["']/g)) {
    if (!usedStatic.has(m[1])) usedStatic.set(m[1], []);
    usedStatic.get(m[1]).push(r);
  }
  // template literals without interpolation
  for (const m of src.matchAll(/t\(\s*["']centre["']\s*,\s*`([^`$]+)`/g)) {
    if (!usedStatic.has(m[1])) usedStatic.set(m[1], []);
    usedStatic.get(m[1]).push(r);
  }
  // dynamic templates
  for (const m of src.matchAll(/t\(\s*["']centre["']\s*,\s*`([^`]+)`/g)) {
    if (m[1].includes("${")) {
      dynamicTemplates.push({ file: r, expr: m[1] });
    }
  }
}

// Expand known dynamic patterns
const expanded = new Set(usedStatic.keys());
for (let id = 1; id <= 20; id++) {
  expanded.add(`reportsHubCard${id}Title`);
  expanded.add(`reportsHubCard${id}Description`);
}
for (const s of ["apprenants", "offre", "rh", "finance", "activite"]) {
  expanded.add(`reportsHubSection_${s}`);
  expanded.add(`reportsSection_${s}`);
}
expanded.add("reportsSection_pilotage");
for (const slug of [
  "synthese",
  "effectifs_apprenants",
  "filieres_programmes",
  "effectifs_personnel",
  "masse_salariale",
  "encaissements",
  "recouvrement",
  "retards",
  "reductions_coupons",
  "examens",
]) {
  expanded.add(`reportsNav_${slug}`);
}

// HubNav item keys
for (const k of [
  "reportsNavEnrollments",
  "reportsDescEnrollments",
  "reportsNavPrograms",
  "reportsDescPrograms",
  "reportsNavStaff",
  "reportsDescStaff",
  "reportsNavPayroll",
  "reportsDescPayroll",
  "reportsNavCollections",
  "reportsDescCollections",
  "reportsNavRecovery",
  "reportsDescRecovery",
  "reportsNavOverdue",
  "reportsDescOverdue",
  "reportsNavDiscounts",
  "reportsDescDiscounts",
  "reportsNavExams",
  "reportsDescExams",
  "reportsNavSummary",
  "reportsNavAria",
  "reportsSectionLearners",
  "reportsSectionOffering",
  "reportsSectionHr",
  "reportsSectionFinance",
  "reportsSectionActivity",
]) {
  expanded.add(k);
}

const missingFr = [...expanded].filter((k) => !fr.has(k)).sort();
const missingEn = [...expanded].filter((k) => !en.has(k)).sort();
const emptyFr = [...expanded].filter((k) => fr.has(k) && !String(fr.get(k)).trim()).sort();
const emptyEn = [...expanded].filter((k) => en.has(k) && !String(en.get(k)).trim()).sort();
const identical = [...expanded]
  .filter((k) => fr.has(k) && en.has(k) && fr.get(k) === en.get(k))
  .filter((k) => !/^(CSV|PDF|Phase 2|Finance|OK|—)$/i.test(fr.get(k)))
  .sort();

// Catalogue drift for reportish keys
const frReport = [...fr.keys()].filter(isReportish).sort();
const enReport = [...en.keys()].filter(isReportish).sort();
const onlyFr = frReport.filter((k) => !en.has(k));
const onlyEn = enReport.filter((k) => !fr.has(k));

// ── 2. Real hardcoded UI (strict, exclude key names & paths) ────────────────
const HARDCODE_ATTR =
  /(?:title|label|description|placeholder|emptyLabel|aria-label|children)\s*=\s*\{?\s*["']([A-ZÀ-ÿ][^"']{2,80})["']/g;
const JSX_TEXT =
  />\s*\n?\s*([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ][A-Za-zÀ-ÿ0-9'’ &\-\/,.%]{2,60})\s*\n?\s*</g;

const IGNORE_HARD = new Set([
  "CSV",
  "PDF",
  "P0",
  "P1",
  "OK",
  "FR",
  "EN",
  "Suspense",
]);

const hardcodedReal = [];
for (const file of files) {
  const r = rel(file);
  if (r.includes("/config/") || r.includes("/hooks/")) continue;
  const src = fs.readFileSync(file, "utf8");
  // strip t("centre","...") and template t() to reduce noise
  const cleaned = src
    .replace(/t\(\s*["']centre["']\s*,\s*["'][^"']+["']\s*\)/g, "t()")
    .replace(/t\(\s*["']centre["']\s*,\s*`[^`]+`\s*\)/g, "t()")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  for (const m of cleaned.matchAll(HARDCODE_ATTR)) {
    const v = m[1].trim();
    if (IGNORE_HARD.has(v)) continue;
    if (/^(left|right| synthese|flex|grid|sm:|md:)/i.test(v)) continue;
    if (/^[a-z][a-z0-9_-]*$/.test(v)) continue; // identifiers
    hardcodedReal.push({ file: r, kind: "attr", value: v });
  }
  for (const m of cleaned.matchAll(JSX_TEXT)) {
    const v = m[1].trim();
    if (IGNORE_HARD.has(v)) continue;
    if (v.length < 3) continue;
    if (/^[{}<>]/.test(v)) continue;
    hardcodedReal.push({ file: r, kind: "jsx", value: v });
  }
}

// Deduplicate
const hardUniq = [];
const hardSeen = new Set();
for (const h of hardcodedReal) {
  const k = `${h.file}|${h.kind}|${h.value}`;
  if (hardSeen.has(k)) continue;
  hardSeen.add(k);
  hardUniq.push(h);
}

// ── 3. Config EN labels — are they still rendered? ─────────────────────────
const hubNav = fs.readFileSync(path.join(RAPPORTS, "components/ReportsHubNav.tsx"), "utf8");
const hub = fs.readFileSync(path.join(RAPPORTS, "components/ReportsHub.tsx"), "utf8");
const shell = fs.readFileSync(path.join(RAPPORTS, "components/ReportsShell.tsx"), "utf8");
const hubNavFallback = /item\.label|item\.description/.test(hubNav);
const hubUsesCardLabel = /card\.label|card\.description/.test(hub);
const shellUsesItemLabel = /item\.label|item\.shortLabel/.test(shell);

// ── 4. API / data layer ─────────────────────────────────────────────────────
const reportsData = fs.readFileSync(REPORTS_DATA, "utf8");
const rtlCount = (reportsData.match(/\brtl\(/g) || []).length;

// Hardcoded French/English in return labels outside rtl()
function findBareLabels(src) {
  const out = [];
  const lines = src.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /rtl\(/.test(line)) continue;
    // skip TCF-only blocks lightly tagged — still report but mark
    const mLabel = line.match(/\b(label|title|message|indicateur|domaine|status)\s*:\s*"([^"]{2,80})"/);
    if (mLabel) {
      out.push({ line: i + 1, field: mLabel[1], value: mLabel[2], tcfNearby: /tcf|isTcf/i.test(lines.slice(Math.max(0, i - 5), i + 1).join("\n")) });
    }
  }
  return out;
}
const bareLabels = findBareLabels(reportsData);

// API routes
const apiFindings = [];
for (const file of walk(API)) {
  const src = fs.readFileSync(file, "utf8");
  const r = rel(file);
  const hasCatch = /reportsCatchError/.test(src) || r.endsWith("shared.ts");
  const hardFr = /"Erreur serveur"/.test(src) && !/reportsCatchError/.test(src);
  const usesCtx = /getReportsContext/.test(src);
  if (r.endsWith("route.ts")) {
    apiFindings.push({
      file: r,
      getReportsContext: usesCtx,
      bilingualCatch: /reportsCatchError/.test(src),
      hardErreurServeur: hardFr,
    });
  }
}

// ── 5. Locale plumbing ──────────────────────────────────────────────────────
const bundle = fs.readFileSync(path.join(RAPPORTS, "hooks/reports-bundle-client.ts"), "utf8");
const useReport = fs.readFileSync(path.join(RAPPORTS, "hooks/useReportPage.ts"), "utf8");
const apiClient = fs.readFileSync(path.join(ROOT, "app/utils/center-api-client.ts"), "utf8");
const shared = fs.readFileSync(path.join(API, "shared.ts"), "utf8");

const plumbing = {
  bundleSendsHeader: /X-Nexa-Locale/.test(bundle),
  bundleCachesByLocale: /locale/.test(bundle) && /cacheKey/.test(bundle),
  useReportPassesLocale: /locale/.test(useReport) && /fetchReportsBundle/.test(useReport),
  sharedReadsHeader: /x-nexa-locale/.test(shared),
  filtersGetLocale: /locale/.test(shared) && /parseReportFilters/.test(shared),
  apiClientAcceptsHeaders: /options\?\.headers/.test(apiClient) || /headers\?:/.test(apiClient),
  apiClientFrErrorFallback: /Erreur \$\{res\.status\}|Erreur \$\{/.test(apiClient) || /`Erreur \$\{res\.status\}`/.test(apiClient),
  useReportAsymmetricError: /locale === "en" \? t\(/.test(useReport),
};

// ── 6. PDF export strings for reports ───────────────────────────────────────
const pdfSrc = fs.existsSync(PDF) ? fs.readFileSync(PDF, "utf8") : "";
const pdfHardFr = [];
if (pdfSrc) {
  for (const m of pdfSrc.matchAll(/["']([A-Za-zÀ-ÿ][^"']{4,60})["']/g)) {
    const v = m[1];
    if (/^(application\/|Helvetica|bold|italic|left|right|center)/i.test(v)) continue;
    if (/[éèêàùçôîÉÈ]/.test(v) || /^(Document|Établissement|Période|Total|Page)/.test(v)) {
      pdfHardFr.push(v);
    }
  }
}

// report PDF hook
const pdfHookPath = path.join(RAPPORTS, "hooks/useReportPdfExport.ts");
const pdfHook = fs.existsSync(pdfHookPath) ? fs.readFileSync(pdfHookPath, "utf8") : "";
const pdfHookI18n = /useI18n|locale|t\(/.test(pdfHook);

// ── 7. Sidebar ──────────────────────────────────────────────────────────────
const sidebar = fs.readFileSync(SIDEBAR, "utf8");
function navHas(name) {
  const re = new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\];`);
  const m = sidebar.match(re);
  if (!m) return null;
  return /navRapports|\/centre\/rapports/.test(m[1]);
}
const nav = {
  MANAGER_NAV: navHas("MANAGER_NAV"),
  SHORT_MANAGER_NAV: navHas("SHORT_MANAGER_NAV"),
  SHORT_EXTRA_TRAINER_ITEMS: navHas("SHORT_EXTRA_TRAINER_ITEMS"),
  TCF_MANAGER_NAV: navHas("TCF_MANAGER_NAV"),
  TCF_TRAINER_NAV: navHas("TCF_TRAINER_NAV"),
  TCF_EXTRA_TRAINER_ITEMS: navHas("TCF_EXTRA_TRAINER_ITEMS"),
};

// ── 8. Page coverage matrix ─────────────────────────────────────────────────
const pageMatrix = [];
for (const file of files.filter((f) => f.endsWith(`${path.sep}page.tsx`))) {
  const src = fs.readFileSync(file, "utf8");
  const r = rel(file);
  pageMatrix.push({
    file: r,
    useI18n: /useI18n/.test(src),
    tCount: (src.match(/t\(\s*["']centre["']/g) || []).length,
    exportBar: /ReportExportBar/.test(src),
    pdfExport: /useReportPdfExport|onPdf/.test(src),
    shell: /ReportsShell/.test(src),
    isTcfBranch: /isTcfCanadaCenter|isTcf/.test(src),
  });
}

// ── 9. Matcher tokens (FR DB values) — intentional? ─────────────────────────
const matcherNotes = [];
for (const file of files.filter((f) => f.endsWith("page.tsx"))) {
  const src = fs.readFileSync(file, "utf8");
  const r = rel(file);
  if (/espèces|virement|soldé|impayé|partiel/.test(src)) {
    matcherNotes.push({
      file: r,
      note: "Matchers FR/EN pour valeurs DB — OK si mapping vers t()",
    });
  }
}

// ── Findings synthesis ──────────────────────────────────────────────────────
const findings = [];
const add = (sev, area, issue, evidence, fix) =>
  findings.push({ sev, area, issue, evidence, fix });

if (missingFr.length || missingEn.length) {
  add(
    "high",
    "keys",
    `Clés manquantes FR=${missingFr.length} EN=${missingEn.length}`,
    [...missingFr, ...missingEn].slice(0, 25).join(", "),
    "Ajouter dans centre.ts",
  );
} else {
  add("ok", "keys", `Toutes les clés résolues (${expanded.size})`, "FR+EN présents", "—");
}

if (emptyFr.length || emptyEn.length) {
  add("high", "keys", "Clés vides", `FR:${emptyFr.join(",")} EN:${emptyEn.join(",")}`, "Remplir valeurs");
}

if (onlyFr.length || onlyEn.length) {
  add(
    "medium",
    "catalogue",
    `Drift catalogue onlyFr=${onlyFr.length} onlyEn=${onlyEn.length}`,
    [...onlyFr, ...onlyEn].slice(0, 20).join(", "),
    "Aligner",
  );
} else {
  add("ok", "catalogue", `Catalogue rapports aligné (${frReport.length} clés)`, "FR=EN", "—");
}

const identicalMeaningful = identical.filter(
  (k) => fr.get(k) && fr.get(k).length > 3 && !/^\d+$/.test(fr.get(k)),
);
if (identicalMeaningful.length > 15) {
  add(
    "low",
    "identical",
    `${identicalMeaningful.length} clés FR===EN (souvent OK: Finance, PDF…)`,
    identicalMeaningful.slice(0, 20).join(", "),
    "Vérifier si traduction manquante",
  );
} else {
  add("ok", "identical", `${identicalMeaningful.length} clés FR===EN (acceptable)`, identicalMeaningful.join(", ") || "—", "—");
}

if (hardUniq.length) {
  add(
    "medium",
    "hardcoded-ui",
    `${hardUniq.length} chaînes UI hardcodées détectées`,
    hardUniq
      .slice(0, 20)
      .map((h) => `${h.file}: "${h.value}"`)
      .join(" · "),
    "Passer en t()",
  );
} else {
  add("ok", "hardcoded-ui", "Aucune chaîne UI hardcodée (scan strict)", "attrs + JSX text", "—");
}

if (hubNavFallback) {
  add(
    "low",
    "fallback",
    "ReportsHubNav peut retomber sur item.label/description (EN config)",
    "itemKeys manquant → label EN de report-hub.ts",
    "Couvrir tous les slugs live dans itemKeys",
  );
}
if (!hubUsesCardLabel) {
  add("ok", "hub", "ReportsHub utilise t(reportsHubCard*) — pas card.label", "—", "—");
}
if (!shellUsesItemLabel) {
  add("ok", "shell", "ReportsShell utilise t(reportsNav_*) — pas item.label", "—", "—");
}

const badApi = apiFindings.filter((a) => !a.bilingualCatch || a.hardErreurServeur);
if (badApi.length) {
  add("high", "api", `${badApi.length} routes catch non bilingue`, badApi.map((a) => a.file).join(", "), "reportsCatchError");
} else {
  add("ok", "api", `${apiFindings.length} routes catch bilingues`, "reportsCatchError", "—");
}

if (bareLabels.length) {
  add(
    "medium",
    "server-labels",
    `${bareLabels.length} labels bruts hors rtl() dans reports-data.server.ts`,
    bareLabels
      .slice(0, 15)
      .map((b) => `L${b.line} ${b.field}="${b.value}"${b.tcfNearby ? " ~tcf" : ""}`)
      .join(" · "),
    "Wrapper rtl() ou laisser si branche TCF exclue",
  );
} else {
  add("ok", "server-labels", `Labels serveur via rtl() (${rtlCount} appels)`, "—", "—");
}

if (!plumbing.bundleSendsHeader || !plumbing.sharedReadsHeader || !plumbing.useReportPassesLocale) {
  add("high", "locale", "Plumbing locale cassé", JSON.stringify(plumbing), "Réparer header/cache");
} else {
  add("ok", "locale", "X-Nexa-Locale bout-en-bout (bundle)", JSON.stringify(plumbing), "—");
}

if (plumbing.apiClientFrErrorFallback) {
  add("medium", "locale", 'fetchCenterApi fallback "Erreur {status}" en FR only', "center-api-client.ts", "Localiser ou injecter locale");
}
if (plumbing.useReportAsymmetricError) {
  add("medium", "locale", "useReportPage: EN masque e.message, FR l’affiche", "useReportPage.ts L~156", "Uniformiser");
}

if (!pdfHookI18n) {
  add("medium", "pdf", "useReportPdfExport sans i18n détecté", "hooks/useReportPdfExport.ts", "Passer locale/t aux titres PDF");
} else {
  add("ok", "pdf", "Hook PDF rapports a des hooks i18n/locale", "useReportPdfExport", "—");
}

if (pdfHardFr.length) {
  add(
    "low",
    "pdf-util",
    `${[...new Set(pdfHardFr)].length} chaînes FR possibles dans centerPdfExport`,
    [...new Set(pdfHardFr)].slice(0, 12).join(", "),
    "Vérifier si chemins rapports les utilisent",
  );
}

// Sidebar
for (const [name, has] of Object.entries(nav)) {
  const isTcf = name.startsWith("TCF_");
  if (isTcf) {
    add(
      "info",
      "sidebar-tcf",
      `${name}: Rapports=${has ? "oui" : "non"}`,
      "Hors scope modification TCF",
      "Ne pas toucher",
    );
  } else if (!has) {
    add("high", "sidebar", `${name} sans Rapports`, "—", "Ajouter navRapports");
  } else {
    add("ok", "sidebar", `${name} a Rapports`, "—", "—");
  }
}

const weakPages = pageMatrix.filter((p) => !p.useI18n || p.tCount < 5);
if (weakPages.length) {
  add("high", "pages", `${weakPages.length} pages sous-i18n`, weakPages.map((p) => p.file).join(", "), "Compléter");
} else {
  add(
    "ok",
    "pages",
    `${pageMatrix.length} pages robustes (tCount≥5 + useI18n)`,
    pageMatrix.map((p) => `${p.file.split("/").slice(-2).join("/")}×${p.tCount}`).join(", "),
    "—",
  );
}

const pagesNoPdf = pageMatrix.filter((p) => p.exportBar && !p.pdfExport);
if (pagesNoPdf.length) {
  add("info", "pdf-coverage", `${pagesNoPdf.length} pages CSV sans PDF`, pagesNoPdf.map((p) => p.file).join(", "), "Optionnel");
}

for (const m of matcherNotes) {
  add("info", "matchers", m.note, m.file, "Conserver mapping bilingue");
}

// Score
const weights = { high: 0, medium: 0, low: 0, info: 0, ok: 0 };
for (const f of findings) weights[f.sev]++;
const score = Math.max(
  0,
  100 - weights.high * 25 - weights.medium * 8 - weights.low * 2,
);

const out = {
  generatedAt: new Date().toISOString(),
  score,
  weights,
  counts: {
    expandedKeys: expanded.size,
    staticKeys: usedStatic.size,
    frReport: frReport.length,
    enReport: enReport.length,
    rtlCalls: rtlCount,
    hardUi: hardUniq.length,
    bareServerLabels: bareLabels.length,
    pages: pageMatrix.length,
    apiRoutes: apiFindings.length,
  },
  missingFr,
  missingEn,
  emptyFr,
  emptyEn,
  onlyFr,
  onlyEn,
  identicalMeaningful: identicalMeaningful.slice(0, 40),
  hardUniq,
  bareLabels: bareLabels.slice(0, 40),
  apiFindings,
  plumbing,
  nav,
  pageMatrix,
  dynamicTemplates,
  hubNavFallback,
  findings,
};

fs.writeFileSync(path.join(ROOT, "scripts/audit-rapports-i18n-robust.report.json"), JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      score: out.score,
      weights: out.weights,
      counts: out.counts,
      findings: out.findings,
      hardUniq: out.hardUniq,
      bareLabels: out.bareLabels,
      missingFr: out.missingFr,
      missingEn: out.missingEn,
      identicalSample: out.identicalMeaningful.slice(0, 25),
      pageMatrix: out.pageMatrix,
      plumbing: out.plumbing,
      nav: out.nav,
    },
    null,
    2,
  ),
);
