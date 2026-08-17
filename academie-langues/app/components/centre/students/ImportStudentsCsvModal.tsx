"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { AFRICA_54, findAfricaCountry } from "@/app/data/africa-54";
import {
  catalogTotalShort,
  isShortPricingMode,
  sumPaymentPlanFees,
  type ShortPricingMode,
} from "@/app/utils/short-pricing";
import {
  defaultAcademicYear,
  isCursusFeeMode,
  resolveCursusTuition,
  type CursusFeeMode,
} from "@/app/utils/cursus-passage";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ACTION_TONE } from "@/app/utils/action-tones";
import { ActionConfirmModal } from "@/app/components/centre/ActionConfirmModal";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import { BLUE, ORANGE, CenterSelect } from "@/app/centre/center-page-ui";

const MAX_ROWS = 150;
const TEMPLATE_HEADERS = [
  "prenom", "nom", "email", "telephone", "programme", "campus", "niveau",
  "classe", "genre", "date_naissance", "pays", "region", "duree_mois", "coupon",
  "annee_scolaire", "tuteur_nom", "tuteur_lien", "tuteur_tel",
];

type FiliereOption = {
  id: string;
  name: string;
  type: "cursus" | "formation_courte";
  default_tuition_fee: number | null;
  pricing_mode: ShortPricingMode | null;
  cursus_fee_mode: CursusFeeMode | null;
  duree_valeur: number | null;
  duree_unite: string | null;
  payment_plan: unknown;
};
type NiveauOption = {
  id: string;
  filiere_id: string;
  annee: number;
  tuition_fee: number | null;
  payment_plan?: unknown;
};
type GroupeOption = { id: string; nom: string; filiere_id: string | null; niveau_id: string | null };
type CampusOption = { id: string; name: string };
type FiliereCampus = { filiere_id: string; campus: CampusOption };

type ParsedRow = {
  line: number;
  prenom: string;
  nom: string;
  email: string;
  phone: string;
  programme: string;
  campus: string;
  niveau: string;
  classe: string;
  genre: string;
  birthDate: string;
  pays: string;
  region: string;
  dureeMois: string;
  coupon: string;
  academicYear: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  error?: string;
};

type ImportResult = {
  line: number;
  email: string;
  ok: boolean;
  error?: string;
  code?: string;
  emailSent?: boolean;
  temporaryPassword?: string;
};

function normalizeHeader(raw: string) {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
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
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
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

function cell(headers: string[], row: string[], ...aliases: string[]) {
  for (const alias of aliases) {
    const i = headers.indexOf(alias);
    if (i >= 0 && row[i]) return String(row[i]).trim();
  }
  return "";
}

function mapGenre(raw: string) {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (["homme", "h", "m", "male", "masculin", "garcon", "boy", "man"].includes(v)) return "Homme";
  if (["femme", "f", "female", "feminin", "fille", "girl", "woman"].includes(v)) return "Femme";
  if (["autre", "other", "a"].includes(v)) return "Autre";
  return raw.trim();
}

function resolveCountry(raw: string) {
  const v = raw.trim();
  if (!v) return findAfricaCountry("CM") || AFRICA_54[0];
  const byCode = AFRICA_54.find((c) => c.code.toLowerCase() === v.toLowerCase());
  if (byCode) return byCode;
  const byDial = AFRICA_54.find((c) => c.dial.replace(/\s/g, "") === v.replace(/\s/g, ""));
  if (byDial) return byDial;
  const byName = AFRICA_54.find((c) => c.name.toLowerCase() === v.toLowerCase());
  return byName || findAfricaCountry("CM") || AFRICA_54[0];
}

function unwrapCampus(raw: unknown): CampusOption | null {
  if (!raw || typeof raw !== "object") return null;
  const c = Array.isArray(raw) ? raw[0] : raw;
  if (!c || typeof c !== "object") return null;
  const row = c as { id?: string; name?: string };
  return row.id && row.name ? { id: row.id, name: row.name } : null;
}

function downloadTemplate() {
  const example = [
    "Jean", "DUPONT", "jean.dupont@example.com", "690000000",
    "", "", "1", "", "Homme", "2005-03-12", "CM", "", "", "", "", "", "", "",
  ];
  const csv = [TEMPLATE_HEADERS.join(";"), example.join(";")].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-import-apprenants.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportStudentsCsvModal({
  centerId,
  onClose,
  onImported,
}: {
  centerId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const { locale, t } = useI18n();
  const feedback = useActionFeedback();
  const [filieres, setFilieres] = useState<FiliereOption[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauOption[]>([]);
  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [filiereCampuses, setFiliereCampuses] = useState<FiliereCampus[]>([]);
  const [defaultFiliereId, setDefaultFiliereId] = useState("");
  const [defaultCampusId, setDefaultCampusId] = useState("");
  const [defaultNiveauId, setDefaultNiveauId] = useState("");
  const [defaultGroupeId, setDefaultGroupeId] = useState("");
  const [defaultMonths, setDefaultMonths] = useState(3);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [seatLimitReached, setSeatLimitReached] = useState(false);

  const selectedFiliere = filieres.find((f) => f.id === defaultFiliereId);
  const isShort = selectedFiliere?.type === "formation_courte";
  const shortMode: ShortPricingMode =
    isShort && isShortPricingMode(selectedFiliere?.pricing_mode)
      ? selectedFiliere!.pricing_mode!
      : "forfaitaire";

  const defaultCampuses = useMemo(
    () => filiereCampuses.filter((fc) => fc.filiere_id === defaultFiliereId).map((fc) => fc.campus),
    [filiereCampuses, defaultFiliereId],
  );
  const defaultNiveaux = useMemo(
    () => niveaux.filter((n) => n.filiere_id === defaultFiliereId),
    [niveaux, defaultFiliereId],
  );
  const defaultGroupes = useMemo(
    () => groupes.filter((g) => g.filiere_id === defaultFiliereId),
    [groupes, defaultFiliereId],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("filieres")
        .select("id, name, type, default_tuition_fee, pricing_mode, cursus_fee_mode, duree_valeur, duree_unite, payment_plan")
        .eq("center_id", centerId)
        .eq("status", "published");
      const list: FiliereOption[] = (data || []).map((f: FiliereOption) => ({
        ...f,
        pricing_mode: isShortPricingMode(f.pricing_mode) ? f.pricing_mode : null,
        cursus_fee_mode: isCursusFeeMode(f.cursus_fee_mode) ? f.cursus_fee_mode : null,
      }));
      setFilieres(list);
      if (list.length === 0) {
        setNiveaux([]);
        setGroupes([]);
        setFiliereCampuses([]);
        return;
      }
      const ids = list.map((f) => f.id);
      const [{ data: nivs }, { data: grps }, { data: linked }] = await Promise.all([
        supabase.from("niveaux").select("id, filiere_id, annee, tuition_fee, payment_plan").in("filiere_id", ids).order("annee"),
        supabase.from("groupes").select("id, nom, niveau_id, filiere_id").in("filiere_id", ids),
        supabase.from("filiere_campus").select("filiere_id, campuses(id, name)").in("filiere_id", ids),
      ]);
      setNiveaux(
        ((nivs || []) as NiveauOption[]).filter((n) => n.annee != null),
      );
      setGroupes((grps || []) as GroupeOption[]);
      setFiliereCampuses(
        ((linked || []) as { filiere_id: string; campuses?: unknown }[])
          .map((lc) => {
            const campus = unwrapCampus(lc.campuses);
            return campus ? { filiere_id: lc.filiere_id, campus } : null;
          })
          .filter((x): x is FiliereCampus => Boolean(x)),
      );
    })();
  }, [centerId]);

  useEffect(() => {
    setDefaultNiveauId("");
    setDefaultGroupeId("");
    setDefaultCampusId("");
  }, [defaultFiliereId]);

  useEffect(() => {
    if (!defaultFiliereId) return;
    if (defaultCampuses.length === 1) setDefaultCampusId(defaultCampuses[0].id);
  }, [defaultFiliereId, defaultCampuses]);

  const matchFiliere = useCallback((name: string) => {
    const q = name.trim().toLowerCase();
    if (q) {
      return filieres.find((f) => f.name.toLowerCase() === q) || null;
    }
    return selectedFiliere || null;
  }, [filieres, selectedFiliere]);

  const rowError = useCallback((row: Omit<ParsedRow, "error">, emails: Map<string, number>) => {
    if (!row.prenom || !row.nom || !row.email) return t("centre", "studentsCsvMissingIdentity");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return t("centre", "studentsCsvInvalidEmail");
    if ((emails.get(row.email) || 0) > 1) return t("centre", "studentsCsvDuplicateEmail");
    if (!row.programme && !defaultFiliereId) return t("centre", "studentsCsvMissingProgram");
    if (row.programme && !matchFiliere(row.programme)) {
      return t("centre", "studentsCsvUnknownProgram", { name: row.programme });
    }
    const filiere = matchFiliere(row.programme);
    if (filiere?.type === "cursus") {
      const years = niveaux.filter((n) => n.filiere_id === filiere.id);
      const hasDefaultLevel = filiere.id === defaultFiliereId && defaultNiveauId;
      const yearNum = row.niveau ? (Number(row.niveau.replace(/\D/g, "")) || Number(row.niveau)) : NaN;
      const hasCsvLevel = years.some((n) => n.annee === yearNum || String(n.annee) === row.niveau.trim());
      if (!hasDefaultLevel && !hasCsvLevel) return t("centre", "createStudentLevelRequired");
    }
    return "";
  }, [t, defaultFiliereId, defaultNiveauId, matchFiliere, niveaux]);

  const revalidate = useCallback((list: ParsedRow[]) => {
    const emails = new Map<string, number>();
    for (const r of list) {
      if (r.email) emails.set(r.email, (emails.get(r.email) || 0) + 1);
    }
    return list.map((r) => {
      const { error: _ignored, ...rest } = r;
      const error = rowError(rest, emails);
      return { ...rest, error: error || undefined };
    });
  }, [rowError]);

  useEffect(() => {
    setRows((prev) => (prev.length ? revalidate(prev) : prev));
  }, [revalidate]);

  const validRows = useMemo(() => rows.filter((r) => !r.error), [rows]);
  const invalidRows = useMemo(() => rows.filter((r) => r.error), [rows]);

  const onFile = async (file: File) => {
    setParseError("");
    setResults(null);
    setFileName(file.name);
    const text = await file.text();
    const { headers, rows: rawRows } = parseCsvText(text);
    if (headers.length === 0 || rawRows.length === 0) {
      setRows([]);
      setParseError(t("centre", "studentsCsvEmpty"));
      return;
    }
    if (rawRows.length > MAX_ROWS) {
      setParseError(t("centre", "studentsCsvTooMany", { max: MAX_ROWS }));
    }
    const sliced = rawRows.slice(0, MAX_ROWS);
    const parsed: ParsedRow[] = sliced.map((raw, idx) => ({
      line: idx + 2,
      prenom: cell(headers, raw, "prenom", "first_name", "firstname", "prenoms"),
      nom: cell(headers, raw, "nom", "last_name", "lastname", "name"),
      email: cell(headers, raw, "email", "e_mail", "mail").toLowerCase(),
      phone: cell(headers, raw, "telephone", "phone", "tel", "mobile"),
      programme: cell(headers, raw, "programme", "filiere", "program", "filiere_name"),
      campus: cell(headers, raw, "campus"),
      niveau: cell(headers, raw, "niveau", "level", "annee"),
      classe: cell(headers, raw, "classe", "groupe", "classroom", "salle"),
      genre: mapGenre(cell(headers, raw, "genre", "gender", "sexe")),
      birthDate: cell(headers, raw, "date_naissance", "birth_date", "naissance", "dob"),
      pays: cell(headers, raw, "pays", "country", "country_code"),
      region: cell(headers, raw, "region"),
      dureeMois: cell(headers, raw, "duree_mois", "duration_months", "mois"),
      coupon: cell(headers, raw, "coupon", "coupon_code", "code_coupon"),
      academicYear: cell(headers, raw, "annee_scolaire", "academic_year"),
      guardianName: cell(headers, raw, "tuteur_nom", "guardian_name"),
      guardianRelation: cell(headers, raw, "tuteur_lien", "guardian_relation"),
      guardianPhone: cell(headers, raw, "tuteur_tel", "guardian_phone", "tuteur_telephone"),
    }));
    setRows(revalidate(parsed));
  };

  const runImport = async () => {
    setConfirmOpen(false);
    if (validRows.length === 0) {
      feedback.show({ status: "empty", title: t("centre", "studentsCsvNoneReady"), message: t("centre", "studentsCsvFixRows") });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      feedback.show({ status: "error", title: t("common", "actionErrorTitle"), message: t("centre", "passageSessionExpired") });
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    const out: ImportResult[] = [];
    feedback.show({
      status: "loading",
      title: t("centre", "studentsCsvImporting"),
      message: t("centre", "studentsCsvProgress", { done: 0, total: validRows.length }),
    });

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const filiere = matchFiliere(row.programme);
        if (!filiere) throw new Error(t("centre", "studentsCsvMissingProgram"));

        const campusesForFiliere = filiereCampuses
          .filter((fc) => fc.filiere_id === filiere.id)
          .map((fc) => fc.campus);
        let campusId = (filiere.id === defaultFiliereId ? defaultCampusId : "") || null;
        if (row.campus) {
          const q = row.campus.toLowerCase();
          const hit = campusesForFiliere.find((c) => c.name.toLowerCase() === q)
            || campusesForFiliere.find((c) => c.name.toLowerCase().includes(q));
          if (hit) campusId = hit.id;
        } else if (!campusId && campusesForFiliere.length === 1) {
          campusId = campusesForFiliere[0].id;
        }
        if (campusesForFiliere.length > 1 && !campusId) {
          throw new Error(t("centre", "createStudentCampusRequired"));
        }

        const niveauxForFiliere = niveaux.filter((n) => n.filiere_id === filiere.id);
        let niveauId = (filiere.id === defaultFiliereId ? defaultNiveauId : "") || null;
        if (filiere.type === "cursus") {
          if (row.niveau) {
            const year = Number(row.niveau.replace(/\D/g, "")) || Number(row.niveau);
            const hit = niveauxForFiliere.find((n) => n.annee === year || String(n.annee) === row.niveau.trim());
            if (hit) niveauId = hit.id;
          }
          if (!niveauId) throw new Error(t("centre", "createStudentLevelRequired"));
        }

        const groupesForFiliere = groupes.filter((g) => g.filiere_id === filiere.id);
        let groupeId = (filiere.id === defaultFiliereId ? defaultGroupeId : "") || null;
        if (row.classe) {
          const hit = groupesForFiliere.find((g) => g.nom.toLowerCase() === row.classe.toLowerCase());
          if (hit) groupeId = hit.id;
        }

        const extras = sumPaymentPlanFees(filiere.payment_plan);
        let tuition = Number(filiere.default_tuition_fee) || 0;
        const country = resolveCountry(row.pays);
        const phone = row.phone
          ? (row.phone.startsWith("+") ? row.phone : `${country.dial} ${row.phone}`)
          : null;

        const body: Record<string, unknown> = {
          prenom: row.prenom.toUpperCase(),
          nom: row.nom.toUpperCase(),
          email: row.email,
          phone,
          filiere_id: filiere.id,
          niveau_id: niveauId,
          groupe_id: groupeId,
          campus_id: campusId,
          tuition_fee: tuition,
          locale,
        };
        if (row.genre) body.genre = row.genre;
        if (row.birthDate) body.birth_date = row.birthDate;

        if (filiere.type === "formation_courte") {
          const mode: ShortPricingMode = isShortPricingMode(filiere.pricing_mode) ? filiere.pricing_mode : "forfaitaire";
          const months = Math.max(1, Number(row.dureeMois) || defaultMonths);
          body.pricing_mode = mode;
          if (mode === "mensuel") {
            body.duration_value = months;
            body.duration_unit = "month";
            body.duration_months = months;
            tuition = catalogTotalShort({
              pricingMode: "mensuel",
              defaultTuitionFee: Number(filiere.default_tuition_fee) || 0,
              months,
              extraFees: extras,
            });
          } else {
            tuition = catalogTotalShort({
              pricingMode: "forfaitaire",
              defaultTuitionFee: Number(filiere.default_tuition_fee) || 0,
              extraFees: extras,
            });
            if (filiere.duree_valeur && filiere.duree_unite) {
              body.duration_value = filiere.duree_valeur;
              body.duration_unit =
                filiere.duree_unite === "mois" ? "month"
                : filiere.duree_unite === "semaines" ? "week" : "day";
            }
          }
          body.catalog_tuition_fee = tuition;
          body.tuition_fee = tuition;
        }

        if (filiere.type === "cursus") {
          const niv = niveauxForFiliere.find((n) => n.id === niveauId);
          const feeMode = isCursusFeeMode(filiere.cursus_fee_mode) ? filiere.cursus_fee_mode : "par_niveau";
          tuition = resolveCursusTuition({
            feeMode,
            filiereDefault: filiere.default_tuition_fee,
            niveauTuition: niv?.tuition_fee ?? null,
            extraFees: feeMode === "par_niveau"
              ? sumPaymentPlanFees(niv?.payment_plan)
              : extras,
          });
          body.tuition_fee = tuition;
          body.academic_year = row.academicYear || defaultAcademicYear();
        }

        if (row.coupon) body.coupon_code = row.coupon.toUpperCase();

        const res = await fetch("/api/etudiants", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (data.code === "SEAT_LIMIT_REACHED") {
            setSeatLimitReached(true);
            out.push({
              line: row.line,
              email: row.email,
              ok: false,
              code: "SEAT_LIMIT_REACHED",
              error: t("centre", "seatLimitMessage", { occupied: data.occupied, max: data.max, offer: data.offerName }),
            });
            for (let j = i + 1; j < validRows.length; j++) {
              out.push({
                line: validRows[j].line,
                email: validRows[j].email,
                ok: false,
                code: "SEAT_LIMIT_REACHED",
                error: t("centre", "seatLimitSkipped"),
              });
            }
            setResults(out);
            setImporting(false);
            feedback.close();
            return;
          }
          throw new Error(data.error || t("centre", "createStudentCreateError"));
        }

        if (data.studentId) {
          await supabase.from("student_details").upsert({
            student_id: data.studentId,
            country: country.name,
            country_code: country.dial,
            region: row.region || null,
            guardian_name: row.guardianName || null,
            guardian_relation: row.guardianRelation || null,
            guardian_phone: row.guardianPhone
              ? (row.guardianPhone.startsWith("+") ? row.guardianPhone : `${country.dial} ${row.guardianPhone}`)
              : null,
          });
        }

        out.push({
          line: row.line,
          email: row.email,
          ok: true,
          emailSent: data.emailSent,
          temporaryPassword: data.temporaryPassword,
        });
      } catch (e) {
        out.push({
          line: row.line,
          email: row.email,
          ok: false,
          error: e instanceof Error ? e.message : t("centre", "createStudentCreateError"),
        });
      }
      setProgress({ done: i + 1, total: validRows.length });
      feedback.show({
        status: "loading",
        title: t("centre", "studentsCsvImporting"),
        message: t("centre", "studentsCsvProgress", { done: i + 1, total: validRows.length }),
      });
    }

    setResults(out);
    setImporting(false);
    const okCount = out.filter((r) => r.ok).length;
    const failCount = out.length - okCount;
    if (okCount === 0) {
      feedback.show({
        status: "error",
        title: t("centre", "studentsCsvAllFailed"),
        message: t("centre", "studentsCsvFailCount", { count: failCount }),
      });
    } else if (failCount > 0) {
      feedback.show({
        status: "error",
        title: t("centre", "studentsCsvPartial"),
        message: t("centre", "studentsCsvPartialHelp", { ok: okCount, fail: failCount }),
      });
    } else {
      feedback.show({
        status: "success",
        title: t("centre", "studentsCsvDone"),
        message: t("centre", "studentsCsvCreatedCount", { count: okCount }),
      });
    }
  };

  const downloadFailures = () => {
    if (!results) return;
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) return;
    const csv = ["ligne;email;erreur", ...failed.map((r) => `${r.line};${r.email};"${(r.error || "").replace(/"/g, '""')}"`)].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-apprenants-erreurs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl border border-black/[0.06] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "studentsCsvTitle")}</h3>
            <p className="text-sm text-neutral-500 mt-1 font-medium">{t("centre", "studentsCsvHelp")}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700" aria-label={t("centre", "bulletinClose")}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={downloadTemplate} className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-black/[0.03]">
            <Download size={14} /> {t("centre", "studentsCsvTemplate")}
          </button>
          <label className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer" style={{ backgroundColor: BLUE }}>
            <Upload size={14} /> {t("centre", "studentsCsvChooseFile")}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {fileName ? <span className="text-xs text-neutral-500 self-center font-medium truncate max-w-[14rem]">{fileName}</span> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1.5">{t("centre", "studentsCsvDefaultProgram")}</label>
            <CenterSelect
              value={defaultFiliereId}
              onChange={setDefaultFiliereId}
              placeholder={t("centre", "createStudentChooseProgram")}
              options={[
                { value: "", label: t("centre", "createStudentChooseProgram") },
                ...filieres.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          </div>
          {defaultCampuses.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-neutral-500 block mb-1.5">{t("centre", "createStudentCampusRequired")}</label>
              <CenterSelect
                value={defaultCampusId}
                onChange={setDefaultCampusId}
                placeholder={t("centre", "createStudentChooseCampus")}
                options={[
                  { value: "", label: t("centre", "createStudentChooseCampus") },
                  ...defaultCampuses.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          )}
          {selectedFiliere?.type === "cursus" && defaultNiveaux.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-neutral-500 block mb-1.5">{t("centre", "createStudentLevelRequired")}</label>
              <CenterSelect
                value={defaultNiveauId}
                onChange={setDefaultNiveauId}
                placeholder={t("centre", "createStudentChooseLevel")}
                options={[
                  { value: "", label: t("centre", "createStudentChooseLevel") },
                  ...defaultNiveaux.map((n) => ({ value: n.id, label: `${t("centre", "identityLevel")} ${n.annee}` })),
                ]}
              />
            </div>
          )}
          {defaultGroupes.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-neutral-500 block mb-1.5">{t("centre", "identityClass")}</label>
              <CenterSelect
                value={defaultGroupeId}
                onChange={setDefaultGroupeId}
                placeholder={t("centre", "identityNoneDefine")}
                options={[
                  { value: "", label: t("centre", "identityNoneDefine") },
                  ...defaultGroupes.map((g) => ({ value: g.id, label: g.nom })),
                ]}
              />
            </div>
          )}
          {isShort && shortMode === "mensuel" && (
            <div>
              <label className="text-xs font-semibold text-neutral-500 block mb-1.5">{t("centre", "createStudentDurationMonths")}</label>
              <input
                type="number"
                min={1}
                value={defaultMonths}
                onChange={(e) => setDefaultMonths(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-10 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none"
              />
            </div>
          )}
        </div>

        {parseError && (
          <div className={`${ACTION_TONE.errorBox} mb-4`}>{parseError}</div>
        )}

        {rows.length > 0 && !results && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-3 text-xs font-semibold mb-2">
              <span className={ACTION_TONE.positiveText}>{validRows.length} {t("centre", "studentsCsvReady")}</span>
              {invalidRows.length > 0 && (
                <span className={ACTION_TONE.negativeText}>{invalidRows.length} {t("centre", "studentsCsvInvalid")}</span>
              )}
            </div>
            <div className="rounded-xl border border-black/[0.06] max-h-56 overflow-auto">
              <table className="w-full text-left text-xs min-w-[32rem]">
                <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t("centre", "enrollmentFirstName")}</th>
                    <th className="px-3 py-2">{t("centre", "enrollmentLastName")}</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">{t("centre", "settingsStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {rows.map((r) => (
                    <tr key={r.line}>
                      <td className="px-3 py-2 text-neutral-400">{r.line}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: BLUE }}>{r.prenom}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: BLUE }}>{r.nom}</td>
                      <td className="px-3 py-2 text-neutral-600">{r.email}</td>
                      <td className="px-3 py-2">
                        {r.error ? (
                          <span className={ACTION_TONE.negativeText}>{r.error}</span>
                        ) : (
                          <span className={ACTION_TONE.positiveText}>{t("centre", "studentsCsvOk")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results && (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-semibold" style={{ color: BLUE }}>{t("centre", "studentsCsvResult")}</p>
              {results.some((r) => !r.ok) && (
                <button type="button" onClick={downloadFailures} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: BLUE }}>
                  <Download size={12} /> {t("centre", "studentsCsvDownloadErrors")}
                </button>
              )}
            </div>
            {seatLimitReached && (
              <div className="mb-3 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
                <p>{results.find((r) => r.code === "SEAT_LIMIT_REACHED" && r.error !== t("centre", "seatLimitSkipped"))?.error}</p>
                <button
                  type="button"
                  onClick={() => window.open(`https://wa.me/+237683375069?text=${encodeURIComponent(t("centre", "seatLimitContactMsg"))}`, "_blank")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: ORANGE }}
                >
                  {t("centre", "seatLimitContact")}
                </button>
              </div>
            )}
            <div className="rounded-xl border border-black/[0.06] max-h-56 overflow-auto">
              <table className="w-full text-left text-xs min-w-[32rem]">
                <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-400 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">{t("centre", "settingsStatus")}</th>
                    <th className="px-3 py-2">{t("centre", "studentsCsvPassword")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {results.map((r) => (
                    <tr key={`${r.line}-${r.email}`}>
                      <td className="px-3 py-2 font-medium">{r.email}</td>
                      <td className="px-3 py-2">
                        {r.ok ? (
                          <span className={`inline-flex items-center gap-1 ${ACTION_TONE.positiveText}`}>
                            <CheckCircle2 size={12} /> {r.emailSent ? t("centre", "createStudentAccessSent") : t("centre", "studentsCsvCreated")}
                          </span>
                        ) : (
                          <span className={`inline-flex items-start gap-1 ${ACTION_TONE.negativeText}`}>
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {r.error}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {r.ok && !r.emailSent && r.temporaryPassword ? r.temporaryPassword : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importing && (
          <p className="text-sm font-medium text-neutral-500 mb-3 inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            {t("centre", "studentsCsvProgress", { done: progress.done, total: progress.total })}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={results ? onImported : onClose} className="h-10 px-4 rounded-lg text-sm font-semibold text-neutral-600 bg-neutral-100">
            {results ? t("centre", "createStudentDone") : t("centre", "identityCancel")}
          </button>
          {!results && (
            <button
              type="button"
              disabled={importing || validRows.length === 0 || filieres.length === 0}
              onClick={() => setConfirmOpen(true)}
              className="h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
              style={{ backgroundColor: BLUE }}
            >
              <FileSpreadsheet size={14} /> {t("centre", "studentsCsvImport", { count: validRows.length })}
            </button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <ActionConfirmModal
          title={t("centre", "studentsCsvTitle")}
          message={t("centre", "studentsCsvConfirm", { count: validRows.length })}
          confirmLabel={t("centre", "studentsCsvImport", { count: validRows.length })}
          cancelLabel={t("centre", "identityCancel")}
          tone="positive"
          busy={importing}
          onCancel={() => { if (!importing) setConfirmOpen(false); }}
          onConfirm={() => void runImport()}
        />
      )}
    </div>
  );
}
