import { AFRICA_54 } from "@/app/data/africa-54";
import {
  mapAfricaToCountryRef,
  resolveCountryCode,
  regionsForCode,
  formPatchForCountry,
} from "@/app/data/studentLocalisation.core.mjs";

export type StudentCountryRef = {
  code: string;
  name: string;
  phone_code: string;
  regions: string[];
};

/** Options pays/région pour la fiche étudiant (source locale, hors countries_ref). */
export function getStudentCountryOptions(): StudentCountryRef[] {
  return mapAfricaToCountryRef(AFRICA_54);
}

export function resolveStudentCountryCode(
  countries: StudentCountryRef[],
  details: { country?: string | null; country_code?: string | null },
): string {
  return resolveCountryCode(countries, details);
}

export function getRegionsForCountry(countries: StudentCountryRef[], code: string): string[] {
  return regionsForCode(countries, code);
}

export function buildCountryFormPatch(
  countries: StudentCountryRef[],
  code: string,
): { country: string; country_code: string; region: null } | null {
  return formPatchForCountry(countries, code);
}
