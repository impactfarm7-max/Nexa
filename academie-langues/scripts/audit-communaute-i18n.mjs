/**
 * Robust i18n audit for Communauté (centre + student).
 * Excludes TCF surfaces by design.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve("app");
const CENTRE_MSG = path.resolve("app/i18n/messages/centre.ts");
const DASH_MSG = path.resolve("app/i18n/messages/dashboard.ts");

const EXCLUDE_PATH_PARTS = [
  `${path.sep}tcf${path.sep}`,
  `${path.sep}Tcf`,
  "TcfManagerDashboard",
  "etudiants-tcf",
  "tcf_canada",
];

function isExcluded(rel) {
  const n = rel.replace(/\//g, path.sep);
  return EXCLUDE_PATH_PARTS.some((p) => n.includes(p) || rel.includes("TcfManager") || rel.includes("/tcf/"));
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function extractLocaleBlock(src, locale) {
  const re = new RegExp(`${locale}:\\s*\\{`);
  const m = src.match(re);
  if (!m) return null;
  let i = m.index + m[0].length - 1;
  let depth = 0;
  let start = -1;
  for (; i < src.length; i++) {
    if (src[i] === "{") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return null;
}

function extractKeys(block) {
  const keys = new Set();
  if (!block) return keys;
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  let m;
  while ((m = re.exec(block))) keys.add(m[1]);
  return keys;
}

function isCommunityRelatedKey(k) {
  return (
    k.startsWith("community") ||
    k.startsWith("members") ||
    k === "navCommunaute" ||
    k.startsWith("bottomCommunity") ||
    k === "managerCommunity" ||
    k === "managerMessagesGroups" ||
    k === "communityCenterMessages" ||
    k === "navCommunity"
  );
}

const centreSrc = fs.readFileSync(CENTRE_MSG, "utf8");
const dashSrc = fs.readFileSync(DASH_MSG, "utf8");
const frCentre = extractKeys(extractLocaleBlock(centreSrc, "fr"));
const enCentre = extractKeys(extractLocaleBlock(centreSrc, "en"));
const frDash = extractKeys(extractLocaleBlock(dashSrc, "fr"));
const enDash = extractKeys(extractLocaleBlock(dashSrc, "en"));

const frRel = [...frCentre].filter(isCommunityRelatedKey).sort();
const enRel = [...enCentre].filter(isCommunityRelatedKey).sort();
const catalogOnlyFr = frRel.filter((k) => !enCentre.has(k));
const catalogOnlyEn = enRel.filter((k) => !frCentre.has(k));

const SCOPE_DIRS = [
  path.join(ROOT, "centre", "communaute"),
  path.join(ROOT, "communaute"),
];
const SCOPE_FILES = [
  path.join(ROOT, "components", "CenterSidebar.tsx"),
  path.join(ROOT, "components", "CenterBottomNav.tsx"),
  path.join(ROOT, "components", "BottomNav.tsx"),
  path.join(ROOT, "components", "Sidebar.tsx"),
  path.join(ROOT, "utils", "centerNavItems.ts"),
  path.join(ROOT, "utils", "studentNavItems.ts"),
  path.join(ROOT, "centre", "dashboard", "components", "GenericManagerDashboard.tsx"),
  path.join(ROOT, "centre", "staff", "page.tsx"),
];

const files = [];
for (const d of SCOPE_DIRS) walk(d, files);
for (const f of SCOPE_FILES) if (fs.existsSync(f)) files.push(f);

const usedCentre = new Map();
const usedDash = new Map();
const dynCalls = [];
const hardcoded = [];
const inlineBilingual = []; // en ? "..." : "..." pattern
const activityFrOnly = [];

const FR_HINT =
  /(Communauté|Annonces|Aucun message|Nouveau groupe|Épingler|Désépingler|Soyez le|Membres|Forum général|Salle de classe|Groupes libres|Messages du centre|Ex\. Staff|Groupe éphémère|Messages privés|Bientôt disponible|Rechercher une salle|Messages épinglés)/;

for (const file of files) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  if (isExcluded(rel)) continue;
  const text = fs.readFileSync(file, "utf8");

  let m;
  const tCentre = /t\(\s*["']centre["']\s*,\s*["']([^"']+)["']/g;
  while ((m = tCentre.exec(text))) {
    const k = m[1];
    if (!usedCentre.has(k)) usedCentre.set(k, new Set());
    usedCentre.get(k).add(rel);
  }
  const tDash = /t\(\s*["']dashboard["']\s*,\s*["']([^"']+)["']/g;
  while ((m = tDash.exec(text))) {
    const k = m[1];
    if (!usedDash.has(k)) usedDash.set(k, new Set());
    usedDash.get(k).add(rel);
  }
  const tDyn = /t\(\s*["']centre["']\s*,\s*`([^`]+)`/g;
  while ((m = tDyn.exec(text))) dynCalls.push({ expr: m[1], file: rel });

  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    if (/t\(\s*["']centre["']/.test(line) || /t\(\s*["']dashboard["']/.test(line)) return;

    if (/en\s*\?\s*["'`]/.test(line) && /:\s*["'`]/.test(line)) {
      inlineBilingual.push({ file: rel, line: idx + 1, text: trimmed.slice(0, 180) });
    }

    if (/current_activity:\s*["'].*Communauté/.test(line)) {
      activityFrOnly.push({ file: rel, line: idx + 1, text: trimmed.slice(0, 160) });
    }

    if (FR_HINT.test(line) && /["'`]/.test(line)) {
      // skip if it's inside a bilingual ternary that already has EN
      if (/en\s*\?/.test(line)) return;
      hardcoded.push({ file: rel, line: idx + 1, text: trimmed.slice(0, 180) });
    }
  });
}

// Dynamic communityFilter_* resolution
const filterIds = ["all", "announcements", "forums", "classes", "groups"];
for (const d of dynCalls) {
  if (d.expr.startsWith("communityFilter_")) {
    for (const id of filterIds) {
      const k = `communityFilter_${id}`;
      if (!usedCentre.has(k)) usedCentre.set(k, new Set());
      usedCentre.get(k).add(d.file + " (dyn)");
    }
  }
}

const missingFr = [];
const missingEn = [];
for (const [k, locs] of usedCentre) {
  if (!frCentre.has(k)) missingFr.push({ k, locs: [...locs].slice(0, 4) });
  if (!enCentre.has(k)) missingEn.push({ k, locs: [...locs].slice(0, 4) });
}
const missingDashFr = [];
const missingDashEn = [];
for (const [k, locs] of usedDash) {
  if (!isCommunityRelatedKey(k) && k !== "navCommunity") continue;
  if (!frDash.has(k)) missingDashFr.push({ k, locs: [...locs] });
  if (!enDash.has(k)) missingDashEn.push({ k, locs: [...locs] });
}

// Count t() usage density in centre vs student
function countTCalls(dirRel) {
  const abs = path.resolve(dirRel);
  let n = 0;
  const list = [];
  walk(abs, list);
  for (const f of list) {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, "/");
    if (isExcluded(rel)) continue;
    const text = fs.readFileSync(f, "utf8");
    n += (text.match(/t\(\s*["']centre["']/g) || []).length;
  }
  return n;
}

const centreT = countTCalls("app/centre/communaute");
const studentInline = inlineBilingual.filter((x) => x.file.startsWith("app/communaute")).length;
const centreHard = hardcoded.filter((x) => x.file.startsWith("app/centre/communaute") || x.file.includes("centerNav") || x.file.includes("CenterSidebar") || x.file.includes("CenterBottom") || x.file.includes("GenericManager") || x.file.includes("staff/page"));
const studentHard = hardcoded.filter((x) => x.file.startsWith("app/communaute"));

const report = {
  excluded: "TCF (TcfManagerDashboard, /centre/tcf/*, etudiants-tcf)",
  catalog: {
    communityRelatedFr: frRel.length,
    communityRelatedEn: enRel.length,
    onlyFr: catalogOnlyFr,
    onlyEn: catalogOnlyEn,
    keys: frRel,
  },
  usage: {
    centreTCallsInFolder: centreT,
    uniqueCentreKeysUsed: usedCentre.size,
    missingInFr: missingFr,
    missingInEn: missingEn,
    missingDashFr,
    missingDashEn,
    dynCalls,
  },
  gaps: {
    hardcodedFrNoTernary: hardcoded,
    centreHardcoded: centreHard,
    studentHardcoded: studentHard,
    inlineBilingualCount: inlineBilingual.length,
    inlineBilingualSample: inlineBilingual.slice(0, 40),
    activityFrOnly,
  },
  scores: {
    centreSurface: centreHard.length === 0 && missingFr.length === 0 && missingEn.length === 0 ? 98 : Math.max(70, 98 - centreHard.length * 3 - missingEn.length * 5),
    studentSurface: Math.max(10, 100 - Math.min(80, Math.round(studentInline * 1.2))),
    overallMenuCentre: null,
  },
};

report.scores.overallMenuCentre = report.scores.centreSurface;

fs.writeFileSync(
  path.resolve("scripts/audit-communaute-i18n.report.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(JSON.stringify({
  excluded: report.excluded,
  catalog: {
    fr: report.catalog.communityRelatedFr,
    en: report.catalog.communityRelatedEn,
    onlyFr: report.catalog.onlyFr,
    onlyEn: report.catalog.onlyEn,
  },
  missingKeys: { fr: missingFr, en: missingEn, dashFr: missingDashFr, dashEn: missingDashEn },
  dyn: dynCalls,
  scores: report.scores,
  counts: {
    hardcodedTotal: hardcoded.length,
    centreHard: centreHard.length,
    studentHard: studentHard.length,
    inlineBilingual: inlineBilingual.length,
    activityFrOnly: activityFrOnly.length,
    centreTCalls: centreT,
  },
  centreHardcoded: centreHard,
  studentHardSample: studentHard.slice(0, 15),
  inlineSample: inlineBilingual.slice(0, 12),
  activityFrOnly,
}, null, 2));
