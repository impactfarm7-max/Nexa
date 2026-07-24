export type StudentCountryLike = {
  code: string;
  name: string;
  phone_code: string;
  regions: string[];
};

export type AfricaCountryLike = {
  code: string;
  name: string;
  dial: string;
  regions?: string[];
};

export function mapAfricaToCountryRef(africaCountries?: AfricaCountryLike[]): StudentCountryLike[];

export function resolveCountryCode(
  countries: StudentCountryLike[],
  details?: { country?: string | null; country_code?: string | null },
): string;

export function regionsForCode(countries: StudentCountryLike[], code: string): string[];

export function formPatchForCountry(
  countries: StudentCountryLike[],
  code: string,
): { country: string; country_code: string; region: null } | null;
