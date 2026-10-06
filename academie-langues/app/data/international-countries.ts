import type { AfricaCountry } from "@/app/data/africa-54";
import { SIGNUP_CITIES } from "@/app/data/signup-countries";

function flagOf(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const BASE: { code: string; name: string; dial: string; regions?: string[] }[] = [
  {
    code: "CA",
    name: "Canada",
    dial: "+1",
    regions: [
      "Québec", "Ontario", "Colombie-Britannique", "Alberta", "Manitoba", "Saskatchewan",
      "Nouvelle-Écosse", "Nouveau-Brunswick", "Terre-Neuve-et-Labrador", "Île-du-Prince-Édouard",
    ],
  },
  { code: "US", name: "États-Unis", dial: "+1" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "BE", name: "Belgique", dial: "+32" },
  { code: "CH", name: "Suisse", dial: "+41" },
  { code: "LU", name: "Luxembourg", dial: "+352" },
  { code: "MC", name: "Monaco", dial: "+377" },
  { code: "DE", name: "Allemagne", dial: "+49" },
  { code: "AT", name: "Autriche", dial: "+43" },
  { code: "NL", name: "Pays-Bas", dial: "+31" },
  { code: "GB", name: "Royaume-Uni", dial: "+44" },
  { code: "IE", name: "Irlande", dial: "+353" },
  { code: "ES", name: "Espagne", dial: "+34" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "IT", name: "Italie", dial: "+39" },
  { code: "GR", name: "Grèce", dial: "+30" },
  { code: "SE", name: "Suède", dial: "+46" },
  { code: "NO", name: "Norvège", dial: "+47" },
  { code: "DK", name: "Danemark", dial: "+45" },
  { code: "FI", name: "Finlande", dial: "+358" },
  { code: "PL", name: "Pologne", dial: "+48" },
  { code: "CZ", name: "Tchéquie", dial: "+420" },
  { code: "HU", name: "Hongrie", dial: "+36" },
  { code: "RO", name: "Roumanie", dial: "+40" },
];

/** Pays hors Afrique (Europe, Amérique du Nord), même forme que AFRICA_54. */
export const INTERNATIONAL_COUNTRIES: AfricaCountry[] = BASE.map((c) => ({
  code: c.code,
  name: c.name,
  flag: flagOf(c.code),
  dial: c.dial,
  regions: c.regions ?? SIGNUP_CITIES[c.code] ?? [],
}));
