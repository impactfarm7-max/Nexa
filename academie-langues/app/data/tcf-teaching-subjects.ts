import { TRAINER_DEFAULT_PERMISSIONS } from "@/app/utils/trainer-defaults";

export const TCF_TEACHING_SUBJECTS = [
  { key: "tcf_comprehension_ecrite", label: "Compréhension écrite" },
  { key: "tcf_comprehension_orale", label: "Compréhension orale" },
  { key: "tcf_expression_ecrite", label: "Expression écrite" },
  { key: "tcf_expression_orale", label: "Expression orale" },
] as const;

/** Matière système pour cours transversaux (hors rubrique des 4 compétences). */
export const TCF_NEUTRAL_DISCIPLINE = {
  code: "tcf_neutral",
  label: "Neutre",
} as const;

/** Codes exam_disciplines builtin réservés au constructeur de cours TCF. */
export const TCF_COURSE_DISCIPLINE_CODES = [
  ...TCF_TEACHING_SUBJECTS.map((s) => s.key),
  TCF_NEUTRAL_DISCIPLINE.code,
] as const;

const TCF_COURSE_DISCIPLINE_CODE_SET = new Set<string>(TCF_COURSE_DISCIPLINE_CODES);

export function isTcfCourseDisciplineCode(code: string | null | undefined) {
  return Boolean(code && TCF_COURSE_DISCIPLINE_CODE_SET.has(code));
}

/**
 * Liste les disciplines proposées à la création/édition de programme.
 * - Centre TCF : builtins TCF + matières du centre
 * - Autres centres : uniquement les matières du centre (pas de CE/CO/EE/EO/Neutre)
 */
export function filterDisciplinesForCenterProgram(
  rows: { id: string; name: string; code?: string | null; is_builtin?: boolean | null; center_id?: string | null }[],
  centerType: string | null | undefined,
  centerId: string | null | undefined,
) {
  if (isTcfCanadaCenter(centerType)) {
    return rows.filter(
      (d) =>
        d.center_id === centerId ||
        d.is_builtin === true ||
        isTcfCourseDisciplineCode(d.code),
    );
  }
  return rows.filter(
    (d) =>
      d.center_id === centerId &&
      !isTcfCourseDisciplineCode(d.code) &&
      d.is_builtin !== true,
  );
}

export type TcfTeachingSubjectKey = (typeof TCF_TEACHING_SUBJECTS)[number]["key"];

export function isTcfCanadaCenter(centerType: string | null | undefined) {
  return centerType === "tcf_canada";
}

/** Réexport — préférer `@/app/data/center-types` pour les nouveaux appels. */
export {
  isFormationCourteCenter,
  usesTcfLikeStaffShell,
  normalizeCenterType,
  centerTypeLabel,
} from "@/app/data/center-types";

export const TCF_SUBJECT_KEYS = new Set<string>(TCF_TEACHING_SUBJECTS.map((s) => s.key));

export function isTcfSubjectPermission(key: string) {
  return TCF_SUBJECT_KEYS.has(key);
}

/** Exclut d'eventuelles cles tcf_* legacy dans staff_permissions */
export function filterModulePermissions(permissions: string[]) {
  return permissions.filter((p) => !isTcfSubjectPermission(p));
}

/**
 * Modules par défaut formateur / personnel académique.
 * Source unique : `app/utils/trainer-defaults`.
 */
export const TRAINER_DEFAULT_MODULE_PERMISSIONS = TRAINER_DEFAULT_PERMISSIONS;

/** Sessions Live : toujours présent dans les droits modules (tous rôles staff/formateur). */
export function ensureDefaultLivesPermission(permissions: string[]): string[] {
  const modules = filterModulePermissions(permissions);
  if (modules.includes("lives")) return modules;
  return filterModulePermissions([...modules, "lives"]);
}

/** TCF : la communauté est accessible à tout le personnel du centre. */
export function ensureTcfCommunautePermission(
  permissions: string[],
  centerType: string | null | undefined,
): string[] {
  const modules = filterModulePermissions(permissions);
  if (!isTcfCanadaCenter(centerType)) return modules;
  if (modules.includes("communaute")) return modules;
  return filterModulePermissions([...modules, "communaute"]);
}

/** @deprecated Les matieres TCF vivent dans staff_tcf_subjects, pas staff_permissions */
export function splitStaffPermissions(permissions: string[]) {
  return {
    modules: filterModulePermissions(permissions),
    tcfSubjects: permissions.filter((p) => isTcfSubjectPermission(p)),
  };
}

export function labelForTcfSubject(key: string) {
  return TCF_TEACHING_SUBJECTS.find((s) => s.key === key)?.label ?? key;
}
