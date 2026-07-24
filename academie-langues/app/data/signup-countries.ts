/** Pays africains pour l'inscription (indicatif téléphonique lié au pays). */
export type SignupCountry = {
  code: string;
  name: string;
  phone_code: string;
};

export const SIGNUP_COUNTRIES_FALLBACK: SignupCountry[] = [
  { code: "CM", name: "Cameroun", phone_code: "+237" },
  { code: "CI", name: "Côte d'Ivoire", phone_code: "+225" },
  { code: "SN", name: "Sénégal", phone_code: "+221" },
  { code: "GA", name: "Gabon", phone_code: "+241" },
  { code: "CG", name: "Congo", phone_code: "+242" },
  { code: "CD", name: "RD Congo", phone_code: "+243" },
  { code: "BF", name: "Burkina Faso", phone_code: "+226" },
  { code: "ML", name: "Mali", phone_code: "+223" },
  { code: "BJ", name: "Bénin", phone_code: "+229" },
  { code: "TG", name: "Togo", phone_code: "+228" },
  { code: "NE", name: "Niger", phone_code: "+227" },
  { code: "TD", name: "Tchad", phone_code: "+235" },
  { code: "GN", name: "Guinée", phone_code: "+224" },
  { code: "MA", name: "Maroc", phone_code: "+212" },
  { code: "DZ", name: "Algérie", phone_code: "+213" },
  { code: "TN", name: "Tunisie", phone_code: "+216" },
  { code: "NG", name: "Nigeria", phone_code: "+234" },
  { code: "GH", name: "Ghana", phone_code: "+233" },
  { code: "KE", name: "Kenya", phone_code: "+254" },
  { code: "MG", name: "Madagascar", phone_code: "+261" },
];
