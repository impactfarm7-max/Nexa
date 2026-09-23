import * as XLSX from "xlsx";
import { defaultAcademicYear } from "@/app/utils/cursus-passage";

export const STUDENTS_IMPORT_MAX_ROWS = 150;

export const STUDENTS_IMPORT_HEADERS = [
  "prenom",
  "nom",
  "email",
  "telephone",
  "programme",
  "campus",
  "niveau",
  "semestre",
  "classe",
  "genre",
  "date_naissance",
  "pays",
  "region",
  "duree_mois",
  "coupon",
  "annee_scolaire",
  "tuteur_nom",
  "tuteur_lien",
  "tuteur_tel",
  "matricule",
] as const;

export type StudentsImportRawRow = {
  line: number;
  prenom: string;
  nom: string;
  email: string;
  phone: string;
  programme: string;
  campus: string;
  niveau: string;
  semestre: string;
  classe: string;
  genre: string;
  birthDate: string;
  /** True when a date_naissance was present but could not be normalized (ambiguous D/M). */
  birthDateInvalid?: boolean;
  pays: string;
  region: string;
  dureeMois: string;
  coupon: string;
  academicYear: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  matricule: string;
};

function normalizeHeader(raw: string) {
  return String(raw || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
}

function cell(headers: string[], row: string[], ...aliases: string[]) {
  for (const alias of aliases) {
    const i = headers.indexOf(normalizeHeader(alias));
    if (i >= 0 && row[i] != null && String(row[i]).trim()) return String(row[i]).trim();
  }
  return "";
}

export function mapImportGenre(raw: string) {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (["homme", "h", "m", "male", "masculin", "garcon", "boy", "man"].includes(v)) return "Homme";
  if (["femme", "f", "female", "feminin", "fille", "girl", "woman"].includes(v)) return "Femme";
  if (["autre", "other", "a"].includes(v)) return "Autre";
  return raw.trim();
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const semi = lines[0].split(";").length;
  const comma = lines[0].split(",").length;
  const delim = semi >= comma ? ";" : ",";

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === delim && !inQ) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  return {
    headers: parseLine(lines[0]).map(normalizeHeader),
    rows: lines.slice(1).map(parseLine),
  };
}

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as (string | number | boolean | null | undefined)[][];
  return matrix.map((row) => (row || []).map((c) => String(c ?? "").trim()));
}

export function normalizeBirthDate(raw: string): string {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // Prefer ISO; for D/M vs M/D only accept when day > 12 (unambiguous).
  const m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    // first > 12 → D/M/Y ; second > 12 → M/D/Y
    if (a > 12 && b >= 1 && b <= 12) {
      return `${m[3]}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    if (b > 12 && a >= 1 && a <= 12) {
      return `${m[3]}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    // Ambiguous (both ≤ 12): reject
    return "";
  }
  // Excel serial as string (e.g. "38412")
  if (/^\d{4,5}$/.test(v)) {
    const serial = Number(v);
    if (serial > 20000 && serial < 80000) {
      const epoch = Date.UTC(1899, 11, 30);
      const dt = new Date(epoch + serial * 86400000);
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(dt.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return v;
}

function rowsFromMatrix(matrix: string[][]): { headers: string[]; rows: string[][] } {
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = (matrix[0] || []).map(normalizeHeader);
  const rows = matrix
    .slice(1)
    .filter((r) => r.some((c) => String(c || "").trim()));
  return { headers, rows };
}

function mapRawRows(headers: string[], rows: string[][], maxRows: number): {
  rows: StudentsImportRawRow[];
  truncated: boolean;
} {
  const mapped = rows
    .map((raw, idx) => {
      const birthRaw = cell(headers, raw, "date_naissance", "birth_date", "naissance", "dob");
      const birthDate = normalizeBirthDate(birthRaw);
      return {
      line: idx + 2,
      prenom: cell(headers, raw, "prenom", "first_name", "firstname", "prenoms"),
      nom: cell(headers, raw, "nom", "last_name", "lastname", "name"),
      email: cell(headers, raw, "email", "e_mail", "mail").toLowerCase(),
      phone: cell(headers, raw, "telephone", "phone", "tel", "mobile"),
      programme: cell(headers, raw, "programme", "filiere", "program", "filiere_name"),
      campus: cell(headers, raw, "campus"),
      niveau: cell(headers, raw, "niveau", "level", "annee"),
      semestre: cell(headers, raw, "semestre", "semester"),
      classe: cell(headers, raw, "classe", "groupe", "classroom", "salle", "promo", "promotion"),
      genre: mapImportGenre(cell(headers, raw, "genre", "gender", "sexe")),
      birthDate,
      birthDateInvalid: Boolean(birthRaw) && !birthDate,
      pays: cell(headers, raw, "pays", "country", "country_code"),
      region: cell(headers, raw, "region"),
      dureeMois: cell(headers, raw, "duree_mois", "duration_months", "mois"),
      coupon: cell(headers, raw, "coupon", "coupon_code", "code_coupon"),
      academicYear: cell(headers, raw, "annee_scolaire", "academic_year"),
      guardianName: cell(headers, raw, "tuteur_nom", "guardian_name"),
      guardianRelation: cell(headers, raw, "tuteur_lien", "guardian_relation"),
      guardianPhone: cell(headers, raw, "tuteur_tel", "guardian_phone", "tuteur_telephone"),
      matricule: cell(headers, raw, "matricule", "student_id", "registration_number"),
    };
    })
    // Ignorer lignes d'aide / vides (ex. notes sous le modèle Excel)
    .filter((r) => r.prenom || r.nom || r.email || r.matricule);

  const truncated = mapped.length > maxRows;
  return {
    truncated,
    rows: mapped.slice(0, maxRows),
  };
}

/** Parse CSV or Excel (.xlsx/.xls) student import file. */
export async function parseStudentsImportFile(
  file: File,
  opts?: { maxRows?: number },
): Promise<{ rows: StudentsImportRawRow[]; truncated: boolean; error?: string }> {
  const maxRows = opts?.maxRows ?? STUDENTS_IMPORT_MAX_ROWS;
  const name = (file.name || "").toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls")
    || file.type.includes("spreadsheet")
    || file.type.includes("excel");

  try {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (isExcel) {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return { rows: [], truncated: false, error: "Feuille vide." };
      const parsed = rowsFromMatrix(sheetToMatrix(workbook.Sheets[sheetName]));
      headers = parsed.headers;
      rows = parsed.rows;
    } else {
      const text = await file.text();
      const parsed = parseCsvText(text);
      headers = parsed.headers;
      rows = parsed.rows;
    }

    if (!headers.length || !rows.length) {
      return { rows: [], truncated: false, error: "empty" };
    }

    return mapRawRows(headers, rows, maxRows);
  } catch {
    return { rows: [], truncated: false, error: "unreadable" };
  }
}

/** Download Excel template for scolarité mass import. */
export function downloadStudentsImportExcelTemplate(fileName = "modele-import-apprenants.xlsx") {
  const example = [
    "Jean",
    "DUPONT",
    "jean.dupont@example.com",
    "690000000",
    "",
    "",
    "1",
    "1",
    "",
    "Homme",
    "2005-03-12",
    "CM",
    "",
    "",
    "",
    defaultAcademicYear(),
    "",
    "",
    "",
    "",
  ];
  const sheet = XLSX.utils.aoa_to_sheet([
    [...STUDENTS_IMPORT_HEADERS],
    example,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Apprenants");
  const help = XLSX.utils.aoa_to_sheet([
    ["Aide"],
    ["Matricule renseigne et deja connu au centre = mise a jour du parcours."],
    ["Sans matricule (ou nouveau) = creation."],
    ["Formats: xlsx ou csv. Maximum 150 lignes."],
  ]);
  XLSX.utils.book_append_sheet(wb, help, "Aide");
  XLSX.writeFile(wb, fileName);
}

export function downloadStudentsImportCsvTemplate(fileName = "modele-import-apprenants.csv") {
  const example = [
    "Jean",
    "DUPONT",
    "jean.dupont@example.com",
    "690000000",
    "",
    "",
    "1",
    "1",
    "",
    "Homme",
    "2005-03-12",
    "CM",
    "",
    "",
    "",
    defaultAcademicYear(),
    "",
    "",
    "",
    "",
  ];
  const csv = [[...STUDENTS_IMPORT_HEADERS].join(";"), example.join(";")].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
