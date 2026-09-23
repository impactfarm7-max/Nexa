import * as XLSX from "xlsx";

export type GradeImportRow = {
  rowIndex: number;
  matricule: string;
  nom: string;
  prenom: string;
  note: number | null;
  extras: Record<string, number | null>;
  error?: string;
};

const MATRICULE_ALIASES = ["matricule", "mat", "numero", "n°", "no", "student_id", "registration_number"];
const NOM_ALIASES = ["nom", "lastname", "family", "family_name", "last_name"];
const PRENOM_ALIASES = ["prenom", "prénom", "firstname", "given", "first_name", "given_name"];
const NOTE_ALIASES = ["note", "score", "note principale", "principal", "moyenne"];

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function matchAlias(header: string, aliases: string[]): boolean {
  const h = normHeader(header);
  // Exact match only — évite que « mat » / « no » matchent des colonnes hors sujet
  return aliases.some((a) => h === normHeader(a));
}

/** Génère et télécharge le modèle Excel pour la grille courante. */
export function downloadGradesImportTemplate(opts: {
  students: { matricule: string | null; nom: string; prenom: string; existing_score?: number | null }[];
  bareme: number;
  suplTitles?: string[];
  fileName?: string;
}) {
  const supl = (opts.suplTitles || []).map((t) => t.trim()).filter(Boolean);
  const headers = ["matricule", "nom", "prenom", "note", ...supl];
  const rows = opts.students.map((s) => {
    const base: (string | number)[] = [
      s.matricule || "",
      s.nom || "",
      s.prenom || "",
      s.existing_score != null ? s.existing_score : "",
    ];
    for (const _ of supl) base.push("");
    return base;
  });
  if (rows.length === 0) {
    rows.push(["", "", "", "", ...supl.map(() => "")]);
  }
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Notes");
  const help = XLSX.utils.aoa_to_sheet([
    ["Aide"],
    [`Bareme max: ${opts.bareme}`],
    ["Notes importees en provisoire — valider la session ensuite."],
  ]);
  XLSX.utils.book_append_sheet(wb, help, "Aide");
  XLSX.writeFile(wb, opts.fileName || "modele-import-notes.xlsx");
}

/** Parse un fichier Excel/CSV de notes. */
export async function parseGradesImportFile(
  file: File,
  opts: { bareme: number; suplTitles?: string[] },
): Promise<{ rows: GradeImportRow[]; error?: string }> {
  const buf = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buf, { type: "array" });
  } catch {
    return { rows: [], error: "Fichier illisible. Utilisez le modèle Excel." };
  }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], error: "Feuille vide." };
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (!raw.length) return { rows: [], error: "Aucune ligne dans le fichier." };

  const headers = Object.keys(raw[0] || {});
  const matKey = headers.find((h) => matchAlias(h, MATRICULE_ALIASES));
  const nomKey = headers.find((h) => matchAlias(h, NOM_ALIASES));
  const prenomKey = headers.find((h) => matchAlias(h, PRENOM_ALIASES));
  const noteKey = headers.find((h) => matchAlias(h, NOTE_ALIASES));
  if (!noteKey) {
    return { rows: [], error: "Colonne « note » introuvable. Téléchargez le modèle." };
  }
  if (!matKey && !(nomKey && prenomKey)) {
    return { rows: [], error: "Colonne matricule (ou nom + prénom) requise." };
  }

  const suplTitles = (opts.suplTitles || []).map((t) => t.trim()).filter(Boolean);
  const suplKeys = new Map<string, string>();
  for (const title of suplTitles) {
    const found = headers.find((h) => normHeader(h) === normHeader(title));
    if (found) suplKeys.set(title, found);
  }

  const rows: GradeImportRow[] = [];
  raw.forEach((line, i) => {
    const matricule = matKey ? String(line[matKey] ?? "").trim() : "";
    const nom = nomKey ? String(line[nomKey] ?? "").trim() : "";
    const prenom = prenomKey ? String(line[prenomKey] ?? "").trim() : "";
    const noteRaw = String(line[noteKey] ?? "").trim().replace(",", ".");
    // Ignorer lignes d'aide / pied de page sans identité
    if (!matricule && !nom && !prenom) return;

    let note: number | null = null;
    let error: string | undefined;
    if (noteRaw === "") {
      error = "Note manquante";
    } else {
      const n = Number(noteRaw);
      if (!Number.isFinite(n) || n < 0) error = "Note invalide";
      else if (n > opts.bareme) error = `Note > barème /${opts.bareme}`;
      else note = n;
    }

    const extras: Record<string, number | null> = {};
    for (const [title, key] of suplKeys) {
      const rawEx = String(line[key] ?? "").trim().replace(",", ".");
      if (!rawEx) {
        extras[title] = null;
        continue;
      }
      const n = Number(rawEx);
      if (!Number.isFinite(n) || n < 0) {
        error = error || `Note supl. « ${title} » invalide`;
        extras[title] = null;
      } else if (n > opts.bareme) {
        error = error || `« ${title} » > barème /${opts.bareme}`;
        extras[title] = null;
      } else {
        extras[title] = n;
      }
    }

    rows.push({
      rowIndex: i + 2,
      matricule,
      nom,
      prenom,
      note,
      extras,
      error,
    });
  });

  return { rows };
}

export function matchStudentToImportRow(
  row: GradeImportRow,
  students: { enrollment_id: string; matricule: string | null; nom: string; prenom: string }[],
): string | null {
  const mat = row.matricule.trim().toLowerCase();
  if (mat) {
    const byMat = students.find((s) => (s.matricule || "").trim().toLowerCase() === mat);
    if (byMat) return byMat.enrollment_id;
  }
  const nom = row.nom.trim().toLowerCase();
  const prenom = row.prenom.trim().toLowerCase();
  if (nom && prenom) {
    const hits = students.filter(
      (s) => s.nom.trim().toLowerCase() === nom && s.prenom.trim().toLowerCase() === prenom,
    );
    if (hits.length === 1) return hits[0].enrollment_id;
  }
  return null;
}
