export type AfricaCountry = { code: string; name: string; flag: string; dial: string; regions: string[]; };

/**
 * Type de subdivision administrative affiché dans les formulaires.
 * La colonne DB reste `region` ; seul le libellé UI change.
 * - zone : liste = villes / zones principales (pas une vraie région admin)
 */
export type SubdivisionKind =
  | "region"
  | "province"
  | "department"
  | "governorate"
  | "state"
  | "wilaya"
  | "district"
  | "zone";

/** Vocabulaire local par pays (ISO). Défaut : zone (villes / zones principales). */
const SUBDIVISION_KIND_BY_CODE: Record<string, SubdivisionKind> = {
  CM: "region",
  GA: "province",
  CG: "department",
  CD: "province",
  CF: "department",
  TD: "region",
  GQ: "province",
  ST: "district",
  SN: "region",
  CI: "district",
  BF: "region",
  ML: "region",
  NE: "region",
  BJ: "department",
  TG: "region",
  GN: "region",
  GW: "region",
  MR: "region",
  SL: "district",
  LR: "district",
  GH: "region",
  NG: "state",
  GM: "region",
  CV: "zone",
  MA: "region",
  DZ: "wilaya",
  TN: "governorate",
  LY: "district",
  EG: "governorate",
  SD: "state",
  SS: "state",
  ET: "region",
  ER: "region",
  DJ: "region",
  SO: "region",
  KE: "district",
  UG: "district",
  TZ: "region",
  RW: "province",
  BI: "province",
  MZ: "province",
  AO: "province",
  ZM: "province",
  ZW: "province",
  MW: "district",
  NA: "region",
  BW: "district",
  ZA: "province",
  LS: "district",
  SZ: "region",
  MG: "province",
  MU: "district",
  SC: "district",
  KM: "zone",
};

export function getSubdivisionKind(countryCode?: string | null): SubdivisionKind {
  if (!countryCode) return "zone";
  return SUBDIVISION_KIND_BY_CODE[countryCode.toUpperCase()] || "zone";
}

/** Clé i18n marketing pour le libellé du champ subdivision. */
export function subdivisionLabelKey(kind: SubdivisionKind): string {
  switch (kind) {
    case "region":
      return "ouvrirCentreFieldSubdivisionRegion";
    case "province":
      return "ouvrirCentreFieldSubdivisionProvince";
    case "department":
      return "ouvrirCentreFieldSubdivisionDepartment";
    case "governorate":
      return "ouvrirCentreFieldSubdivisionGovernorate";
    case "state":
      return "ouvrirCentreFieldSubdivisionState";
    case "wilaya":
      return "ouvrirCentreFieldSubdivisionWilaya";
    case "district":
      return "ouvrirCentreFieldSubdivisionDistrict";
    case "zone":
    default:
      return "ouvrirCentreFieldSubdivisionZone";
  }
}

export function subdivisionPlaceholderKey(kind: SubdivisionKind): string {
  switch (kind) {
    case "region":
      return "ouvrirCentreFieldSubdivisionRegionPh";
    case "province":
      return "ouvrirCentreFieldSubdivisionProvincePh";
    case "department":
      return "ouvrirCentreFieldSubdivisionDepartmentPh";
    case "governorate":
      return "ouvrirCentreFieldSubdivisionGovernoratePh";
    case "state":
      return "ouvrirCentreFieldSubdivisionStatePh";
    case "wilaya":
      return "ouvrirCentreFieldSubdivisionWilayaPh";
    case "district":
      return "ouvrirCentreFieldSubdivisionDistrictPh";
    case "zone":
    default:
      return "ouvrirCentreFieldSubdivisionZonePh";
  }
}

export const AFRICA_54 = [
  { code: "DZ", name: "Algérie",             flag: "🇩🇿", dial: "+213", regions: ["Alger", "Oran", "Constantine", "Annaba", "Sétif", "Blida", "Batna", "Tlemcen", "Tizi Ouzou"] },
  { code: "AO", name: "Angola",              flag: "🇦🇴", dial: "+244", regions: ["Luanda", "Benguela", "Huíla", "Huambo", "Cabinda"] },
  { code: "BJ", name: "Bénin",               flag: "🇧🇯", dial: "+229", regions: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Natitingou"] },
  { code: "BW", name: "Botswana",            flag: "🇧🇼", dial: "+267", regions: ["Gaborone", "Francistown", "Maun", "Kasane"] },
  { code: "BF", name: "Burkina Faso",        flag: "🇧🇫", dial: "+226", regions: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya"] },
  { code: "BI", name: "Burundi",             flag: "🇧🇮", dial: "+257", regions: ["Bujumbura", "Gitega", "Ngozi", "Rumonge"] },
  { code: "CV", name: "Cabo Verde",          flag: "🇨🇻", dial: "+238", regions: ["Praia", "Mindelo", "Santa Maria"] },
  { code: "CM", name: "Cameroun",            flag: "🇨🇲", dial: "+237", regions: ["Centre", "Littoral", "Ouest", "Sud-Ouest", "Nord-Ouest", "Nord", "Extrême-Nord", "Adamaoua", "Est", "Sud"] },
  { code: "CF", name: "Centrafrique",        flag: "🇨🇫", dial: "+236", regions: ["Bangui", "Bimbo", "Mbaïki", "Berberati"] },
  { code: "KM", name: "Comores",             flag: "🇰🇲", dial: "+269", regions: ["Moroni", "Mutsamudu", "Fomboni"] },
  { code: "CG", name: "Congo",               flag: "🇨🇬", dial: "+242", regions: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"] },
  { code: "CD", name: "RD Congo",            flag: "🇨🇩", dial: "+243", regions: ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kananga", "Kisangani", "Bukavu", "Goma"] },
  { code: "CI", name: "Côte d'Ivoire",       flag: "🇨🇮", dial: "+225", regions: ["Abidjan", "Yamoussoukro", "Bouaké", "Daloa", "San Pédro", "Man", "Korhogo"] },
  { code: "DJ", name: "Djibouti",            flag: "🇩🇯", dial: "+253", regions: ["Djibouti", "Arta", "Dikhil", "Obock"] },
  { code: "EG", name: "Égypte",              flag: "🇪🇬", dial: "+20",  regions: ["Le Caire", "Alexandrie", "Gizeh", "Louxor", "Assouan", "Port-Saïd"] },
  { code: "GQ", name: "Guinée Équatoriale",  flag: "🇬🇶", dial: "+240", regions: ["Malabo", "Bata", "Mongomo"] },
  { code: "ER", name: "Érythrée",            flag: "🇪🇷", dial: "+291", regions: ["Asmara", "Keren", "Massawa"] },
  { code: "SZ", name: "Eswatini",            flag: "🇸🇿", dial: "+268", regions: ["Mbabane", "Manzini", "Lobamba"] },
  { code: "ET", name: "Éthiopie",            flag: "🇪🇹", dial: "+251", regions: ["Addis-Abeba", "Dire Dawa", "Mekele", "Bahir Dar", "Hawassa", "Gondar"] },
  { code: "GA", name: "Gabon",               flag: "🇬🇦", dial: "+241", regions: ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Lambaréné"] },
  { code: "GM", name: "Gambie",              flag: "🇬🇲", dial: "+220", regions: ["Banjul", "Serekunda", "Brikama"] },
  { code: "GH", name: "Ghana",               flag: "🇬🇭", dial: "+233", regions: ["Accra", "Kumasi", "Tamale", "Sekondi-Takoradi", "Cape Coast"] },
  { code: "GN", name: "Guinée",              flag: "🇬🇳", dial: "+224", regions: ["Conakry", "Labé", "Kankan", "Kindia", "N'Zérékoré"] },
  { code: "GW", name: "Guinée-Bissau",       flag: "🇬🇼", dial: "+245", regions: ["Bissau", "Bafatá", "Gabú"] },
  { code: "KE", name: "Kenya",               flag: "🇰🇪", dial: "+254", regions: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
  { code: "LS", name: "Lesotho",             flag: "🇱🇸", dial: "+266", regions: ["Maseru", "Teyateyaneng", "Mafeteng"] },
  { code: "LR", name: "Libéria",             flag: "🇱🇷", dial: "+231", regions: ["Monrovia", "Gbarnga", "Kakata"] },
  { code: "LY", name: "Libye",               flag: "🇱🇾", dial: "+218", regions: ["Tripoli", "Benghazi", "Misrata", "Sebha"] },
  { code: "MG", name: "Madagascar",          flag: "🇲🇬", dial: "+261", regions: ["Antananarivo", "Toamasina", "Antsirabe", "Fianarantsoa", "Mahajanga"] },
  { code: "MW", name: "Malawi",              flag: "🇲🇼", dial: "+265", regions: ["Lilongwe", "Blantyre", "Mzuzu", "Zomba"] },
  { code: "ML", name: "Mali",                flag: "🇲🇱", dial: "+223", regions: ["Bamako", "Sikasso", "Mopti", "Ségou", "Koutiala", "Kayes"] },
  { code: "MR", name: "Mauritanie",          flag: "🇲🇷", dial: "+222", regions: ["Nouakchott", "Nouadhibou", "Rosso"] },
  { code: "MU", name: "Maurice",             flag: "🇲🇺", dial: "+230", regions: ["Port-Louis", "Beau-Bassin", "Vacoas-Phoenix"] },
  { code: "MA", name: "Maroc",               flag: "🇲🇦", dial: "+212", regions: ["Casablanca", "Rabat", "Fès", "Marrakech", "Tanger", "Agadir", "Meknès", "Oujda"] },
  { code: "MZ", name: "Mozambique",          flag: "🇲🇿", dial: "+258", regions: ["Maputo", "Matola", "Beira", "Nampula"] },
  { code: "NA", name: "Namibie",             flag: "🇳🇦", dial: "+264", regions: ["Windhoek", "Rundu", "Walvis Bay", "Swakopmund"] },
  { code: "NE", name: "Niger",               flag: "🇳🇪", dial: "+227", regions: ["Niamey", "Zinder", "Maradi", "Tahoua", "Agadez"] },
  { code: "NG", name: "Nigeria",             flag: "🇳🇬", dial: "+234", regions: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Kaduna", "Enugu"] },
  { code: "RW", name: "Rwanda",              flag: "🇷🇼", dial: "+250", regions: ["Kigali", "Butare", "Gisenyi", "Ruhengeri"] },
  { code: "ST", name: "Sao Tomé-et-Príncipe",flag: "🇸🇹", dial: "+239", regions: ["São Tomé", "Trindade"] },
  { code: "SN", name: "Sénégal",             flag: "🇸🇳", dial: "+221", regions: ["Dakar", "Thiès", "Touba", "Ziguinchor", "Saint-Louis", "Kaolack"] },
  { code: "SC", name: "Seychelles",          flag: "🇸🇨", dial: "+248", regions: ["Victoria", "Anse Royale"] },
  { code: "SL", name: "Sierra Leone",        flag: "🇸🇱", dial: "+232", regions: ["Freetown", "Bo", "Kenema", "Makeni"] },
  { code: "SO", name: "Somalie",             flag: "🇸🇴", dial: "+252", regions: ["Mogadiscio", "Hargeisa", "Kismaayo"] },
  { code: "ZA", name: "Afrique du Sud",      flag: "🇿🇦", dial: "+27",  regions: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"] },
  { code: "SS", name: "Soudan du Sud",       flag: "🇸🇸", dial: "+211", regions: ["Djouba", "Wau", "Malakal"] },
  { code: "SD", name: "Soudan",              flag: "🇸🇩", dial: "+249", regions: ["Khartoum", "Omdurman", "Port-Soudan"] },
  { code: "TZ", name: "Tanzanie",            flag: "🇹🇿", dial: "+255", regions: ["Dodoma", "Dar es Salaam", "Mwanza", "Arusha", "Zanzibar"] },
  { code: "TD", name: "Tchad",               flag: "🇹🇩", dial: "+235", regions: ["N'Djamena", "Moundou", "Sarh", "Abéché"] },
  { code: "TG", name: "Togo",                flag: "🇹🇬", dial: "+228", regions: ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé"] },
  { code: "TN", name: "Tunisie",             flag: "🇹🇳", dial: "+216", regions: ["Tunis", "Sfax", "Sousse", "Bizerte", "Gabès"] },
  { code: "UG", name: "Ouganda",             flag: "🇺🇬", dial: "+256", regions: ["Kampala", "Gulu", "Lira", "Mbarara"] },
  { code: "ZM", name: "Zambie",              flag: "🇿🇲", dial: "+260", regions: ["Lusaka", "Kitwe", "Ndola", "Livingstone"] },
  { code: "ZW", name: "Zimbabwe",            flag: "🇿🇼", dial: "+263", regions: ["Harare", "Bulawayo", "Mutare", "Gweru"] },
];

export function findAfricaCountry(code: string) {
  return AFRICA_54.find((c) => c.code === code);
}

/** Résout un pays AFRICA_54 depuis code ISO, indicatif (+237) ou nom. */
export function resolveAfricaCountry(input?: string | null) {
  if (!input) return undefined;
  const raw = input.trim();
  if (!raw) return undefined;

  const byCode = AFRICA_54.find((c) => c.code.toLowerCase() === raw.toLowerCase());
  if (byCode) return byCode;

  const dial = raw.startsWith("+") ? raw : `+${raw.replace(/^\+/, "")}`;
  const byDial = AFRICA_54.find((c) => c.dial === dial || c.dial === raw);
  if (byDial) return byDial;

  return AFRICA_54.find((c) => c.name.toLowerCase() === raw.toLowerCase());
}

function normalizeCityKey(city: string) {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Villes courantes → région administrative (quand profiles.region est vide). */
const CITY_TO_REGION: Record<string, Record<string, string>> = {
  CM: {
    yaounde: "Centre",
    douala: "Littoral",
    bafoussam: "Ouest",
    bamenda: "Nord-Ouest",
    garoua: "Nord",
    maroua: "Extrême-Nord",
    ngaoundere: "Adamaoua",
    bertoua: "Est",
    ebolowa: "Sud",
    buea: "Sud-Ouest",
    limbe: "Sud-Ouest",
    kribi: "Sud",
    edea: "Littoral",
    nkongsamba: "Littoral",
  },
  CI: {
    abidjan: "Abidjan",
    yamoussoukro: "Yamoussoukro",
    bouake: "Bouaké",
    daloa: "Daloa",
    sanpedro: "San Pédro",
    man: "Man",
    korhogo: "Korhogo",
  },
  SN: {
    dakar: "Dakar",
    thies: "Thiès",
    touba: "Touba",
    ziguinchor: "Ziguinchor",
    saintlouis: "Saint-Louis",
    kaolack: "Kaolack",
  },
};

export function inferRegionFromCity(
  countryHint?: string | null,
  city?: string | null,
): string | null {
  if (!city?.trim()) return null;
  const country = resolveAfricaCountry(countryHint);
  if (!country) return null;

  const map = CITY_TO_REGION[country.code];
  if (!map) return null;

  const key = normalizeCityKey(city);
  return map[key] || null;
}

export function resolveStudentRegion(opts: {
  region?: string | null;
  detailsRegion?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
}): string | null {
  const direct = opts.region?.trim() || opts.detailsRegion?.trim() || null;
  if (direct) return direct;
  return inferRegionFromCity(opts.countryCode || opts.country, opts.city);
}
