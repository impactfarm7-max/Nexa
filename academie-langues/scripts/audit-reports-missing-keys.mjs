import fs from "fs";
import path from "path";

const root = path.resolve("app/centre/rapports");
const centre = fs.readFileSync("app/i18n/messages/centre.ts", "utf8");
const frStart = centre.indexOf("fr: {");
const enStart = centre.indexOf("\n  en: {");
const frBlock = centre.slice(frStart, enStart);
const enBlock = centre.slice(enStart);

function keys(block) {
  const s = new Set();
  for (const m of block.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) s.add(m[1]);
  return s;
}
const fr = keys(frBlock);
const en = keys(enBlock);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const used = new Set();
for (const file of walk(root)) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/t\(\s*["']centre["']\s*,\s*["']([^"']+)["']/g)) {
    used.add(m[1]);
  }
  for (const m of src.matchAll(/t\(\s*["']centre["']\s*,\s*`([^`$]+)`/g)) {
    // skip templates with ${}
    if (!m[1].includes("${")) used.add(m[1]);
  }
}

// template patterns used by shell/hub
const templates = [
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].flatMap((id) => [
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
for (const k of templates) used.add(k);

const missingFr = [...used].filter((k) => !fr.has(k)).sort();
const missingEn = [...used].filter((k) => !en.has(k)).sort();
console.log(JSON.stringify({ used: used.size, missingFr, missingEn }, null, 2));
