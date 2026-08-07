/**
 * Robust Communauté i18n audit v2 (excludes TCF surfaces).
 * Outputs JSON report + severity-scored findings.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve("app");
const OUT = path.resolve("scripts/audit-communaute-i18n-v2.report.json");

const EXCLUDE = [
  `${path.sep}tcf${path.sep}`,
  `${path.sep}Tcf`,
  "TcfManagerDashboard",
  "etudiants-tcf",
];

function isExcluded(rel) {
  const n = rel.replace(/\//g, path.sep);
  return EXCLUDE.some((p) => n.includes(p) || rel.includes("TcfManager") || rel.includes("/tcf/"));
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

/** Extract key -> value pairs from a locale block (double-quoted values). */
function extractPairs(block) {
  const map = new Map();
  if (!block) return map;
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(block))) map.set(m[1], m[2].replace(/\\"/g, '"'));
  return map;
}

function isCommunityKey(k) {
  return (
    k.startsWith("community") ||
    k.startsWith("members") ||
    k.startsWith("communaute") ||
    k === "navCommunaute" ||
    k === "navCommunity" ||
    k.startsWith("bottomCommunity") ||
    k === "managerCommunity" ||
    k === "managerMessagesGroups"
  );
}

const FR_UI =
  /\b(Communauté|Annonces|Aucun message|Nouveau groupe|Épingler|Désépingler|Soyez le|Membres|Forum général|Salle de classe|Groupes libres|Messages du centre|Messages privés|Bientôt disponible|Rechercher une salle|Messages épinglés|Aujourd'hui|Hier|Rejoindre|Créer la salle|Supprimer ce message|Modifier votre|Aucun créneau)\b/;

const FR_IN_EN =
  /\b(Aucun|Rechercher|Supprimer|Modifier|Rejoindre|Créer|Salle|Membres|Épingl|Désépingl|Soyez|Aujourd|Hier|veuillez|Erreur lors|Impossible de|pour le moment|du centre|Aucun message|Nouveau groupe)\b|[àâäéèêëïîôùûüçŒœ]/;

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

const centreSrc = fs.readFileSync(path.resolve("app/i18n/messages/centre.ts"), "utf8");
const dashSrc = fs.readFileSync(path.resolve("app/i18n/messages/dashboard.ts"), "utf8");
const frCentre = extractPairs(extractLocaleBlock(centreSrc, "fr"));
const enCentre = extractPairs(extractLocaleBlock(centreSrc, "en"));
const frDash = extractPairs(extractLocaleBlock(dashSrc, "fr"));
const enDash = extractPairs(extractLocaleBlock(dashSrc, "en"));

const findings = [];
function add(severity, category, location, issue, fix) {
  findings.push({ severity, category, location, issue, fix });
}

// Catalog parity
for (const [ns, fr, en] of [
  ["centre", frCentre, enCentre],
  ["dashboard", frDash, enDash],
]) {
  const frKeys = [...fr.keys()].filter(isCommunityKey).sort();
  const enKeys = [...en.keys()].filter(isCommunityKey).sort();
  for (const k of frKeys) {
    if (!en.has(k)) add("critical", "catalog", `${ns}.ts:${k}`, "Key missing in EN", `Add ${ns}.en.${k}`);
  }
  for (const k of enKeys) {
    if (!fr.has(k)) add("critical", "catalog", `${ns}.ts:${k}`, "Key missing in FR", `Add ${ns}.fr.${k}`);
  }
  for (const k of enKeys) {
    const v = en.get(k);
    const fv = fr.get(k);
    if (!v) continue;
    if (FR_IN_EN.test(v) && v === fv) {
      add("critical", "catalog-en-fr", `${ns}.en.${k}`, `EN value identical to FR and looks French: "${v}"`, "Translate EN value");
    } else if (FR_IN_EN.test(v) && /[àâäéèêëïîôùûüç]/.test(v)) {
      add("medium", "catalog-en-fr", `${ns}.en.${k}`, `EN value may contain French: "${v}"`, "Review translation");
    } else if (v === fv && v.length > 12 && /[A-Za-zÀ-ÿ]/.test(v)) {
      // identical long strings — often intentional (Conversation, live) or missed
      if (!/^(Conversation|live|Message|Type|Room|Forum|Group|Staff|Admin)/i.test(v)) {
        add("nit", "identical", `${ns}.${k}`, `FR===EN: "${v}"`, "Confirm intentional cognate");
      }
    }
  }
}

const files = [];
for (const d of SCOPE_DIRS) walk(d, files);
for (const f of SCOPE_FILES) if (fs.existsSync(f)) files.push(f);

const used = { centre: new Map(), dashboard: new Map() };
const hardcoded = [];
const fragileNav = [];
const frenchDefaults = [];

for (const file of files) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
  if (isExcluded(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  const isTest = /\.test\.|\.spec\./.test(rel);

  let m;
  for (const [ns, map] of [
    ["centre", used.centre],
    ["dashboard", used.dashboard],
  ]) {
    const re = new RegExp(`t\\(\\s*["']${ns}["']\\s*,\\s*["']([^"']+)["']`, "g");
    while ((m = re.exec(text))) {
      if (!map.has(m[1])) map.set(m[1], new Set());
      map.get(m[1]).add(rel);
    }
  }

  // Dynamic filters
  if (/communityFilter_\$\{/.test(text)) {
    for (const id of ["all", "announcements", "forums", "classes", "groups"]) {
      const k = `communityFilter_${id}`;
      if (!used.centre.has(k)) used.centre.set(k, new Set());
      used.centre.get(k).add(rel + " (dyn)");
    }
  }

  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (/t\(\s*["'](centre|dashboard)["']/.test(line)) return;
    if (/logClientActivity\(/.test(line)) return;

    // French default params
    if (/=\s*["']Aujourd'hui["']|=\s*["']Hier["']/.test(line)) {
      frenchDefaults.push({ file: rel, line: idx + 1, text: trimmed.slice(0, 160) });
    }

    // Fragile nav: FR string used as identity WITHOUT a stable labelKey on the same line
    if (/"Communauté"/.test(line) && !/labelKey/.test(line)) {
      fragileNav.push({ file: rel, line: idx + 1, text: trimmed.slice(0, 160) });
    }

    if (isTest) return;
    if (FR_UI.test(line) && /["'`]/.test(line) && !/en\s*\?/.test(line)) {
      // permission fallback label is OK if routed through catalogue
      hardcoded.push({ file: rel, line: idx + 1, text: trimmed.slice(0, 180) });
    }
  });
}

// Missing keys used by t()
for (const [k, locs] of used.centre) {
  if (!isCommunityKey(k) && !["dashboardCenter", "enrollmentProgram", "enrollmentLevel", "financeToday", "roleAdministratif"].includes(k)) {
    // still check existence for keys used from community files
  }
  if (!frCentre.has(k)) add("critical", "missing-key", [...locs][0], `t("centre","${k}") missing FR`, `Add centre.fr.${k}`);
  if (!enCentre.has(k)) add("critical", "missing-key", [...locs][0], `t("centre","${k}") missing EN`, `Add centre.en.${k}`);
}
for (const [k, locs] of used.dashboard) {
  if (!frDash.has(k)) add("critical", "missing-key", [...locs][0], `t("dashboard","${k}") missing FR`, `Add dashboard.fr.${k}`);
  if (!enDash.has(k)) add("critical", "missing-key", [...locs][0], `t("dashboard","${k}") missing EN`, `Add dashboard.en.${k}`);
}

for (const h of hardcoded) {
  // staff fallback constant
  if (h.file.includes("staff/page") && h.text.includes('label: "Communauté"')) {
    add("nit", "hardcoded-fallback", `${h.file}:${h.line}`, "FR fallback label on permission option (display uses catalogue)", "Optional: labelKey only");
    continue;
  }
  add("critical", "hardcoded-fr", `${h.file}:${h.line}`, h.text, "Replace with t()");
}

for (const f of frenchDefaults) {
  add("medium", "fr-default-param", `${f.file}:${f.line}`, f.text, "Remove FR defaults; require caller to pass t()");
}

for (const f of fragileNav) {
  if (f.file.includes("staff/page")) continue; // handled above
  add("medium", "fragile-nav", `${f.file}:${f.line}`, f.text, "Use stable i18nKey on nav item instead of FR string match");
}

// Dead code check
const inboxPath = path.join(ROOT, "communaute", "ConversationsInbox.tsx");
if (fs.existsSync(inboxPath)) {
  const allApp = walk(ROOT);
  let refs = 0;
  for (const f of allApp) {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, "/");
    if (rel.includes("ConversationsInbox")) continue;
    const t = fs.readFileSync(f, "utf8");
    if (/ConversationsInbox/.test(t)) refs++;
  }
  if (refs === 0) {
    add("nit", "dead-code", "app/communaute/ConversationsInbox.tsx", "Translated but unused (private messages UI)", "Wire up or delete");
  }
}

// Coverage scores
const crit = findings.filter((f) => f.severity === "critical").length;
const med = findings.filter((f) => f.severity === "medium").length;
const nit = findings.filter((f) => f.severity === "nit").length;

const communityFrCentre = [...frCentre.keys()].filter(isCommunityKey).length;
const communityEnCentre = [...enCentre.keys()].filter(isCommunityKey).length;
const communityFrDash = [...frDash.keys()].filter(isCommunityKey).length;
const communityEnDash = [...enDash.keys()].filter(isCommunityKey).length;

// Score: start 100, -4 critical, -1.5 medium, -0.3 nit; floor 70
const score = Math.max(70, Math.round(100 - crit * 4 - med * 1.5 - nit * 0.3));

const report = {
  generatedAt: new Date().toISOString(),
  excluded: "TCF surfaces",
  score,
  counts: {
    critical: crit,
    medium: med,
    nit,
    findings: findings.length,
    catalogue: {
      centreCommunityFr: communityFrCentre,
      centreCommunityEn: communityEnCentre,
      dashCommunauteFr: communityFrDash,
      dashCommunauteEn: communityEnDash,
    },
    tUsage: {
      centreKeys: used.centre.size,
      dashboardKeys: used.dashboard.size,
    },
  },
  findings: findings.sort((a, b) => {
    const o = { critical: 0, medium: 1, nit: 2 };
    return o[a.severity] - o[b.severity] || a.location.localeCompare(b.location);
  }),
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ score: report.score, counts: report.counts, findings: report.findings }, null, 2));
