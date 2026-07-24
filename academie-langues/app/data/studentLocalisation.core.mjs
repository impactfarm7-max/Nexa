/**
 * Helpers localisation fiche étudiant (pays / région).
 * Source attendue : liste type AFRICA_54 (code, name, dial, regions).
 */

export function mapAfricaToCountryRef(africaCountries = []) {
  return africaCountries.map((c) => ({
    code: c.code,
    name: c.name,
    phone_code: c.dial,
    regions: Array.isArray(c.regions) ? [...c.regions] : [],
  }));
}

export function resolveCountryCode(countries, { country = null, country_code = null } = {}) {
  if (!countries?.length) return "";

  if (country) {
    const byName = countries.find((c) => c.name === country);
    if (byName) return byName.code;
  }

  if (country_code) {
    const raw = String(country_code).trim();
    const byCode = countries.find((c) => c.code === raw);
    if (byCode) return byCode.code;
    const byPhone = countries.find((c) => c.phone_code === raw || c.phone_code === `+${raw.replace(/^\+/, "")}`);
    if (byPhone) return byPhone.code;
  }

  return "";
}

export function regionsForCode(countries, code) {
  if (!code) return [];
  return countries.find((c) => c.code === code)?.regions || [];
}

export function formPatchForCountry(countries, code) {
  if (!code) return null;
  const country = countries.find((c) => c.code === code);
  if (!country) return null;
  return {
    country: country.name,
    country_code: country.phone_code,
    region: null,
  };
}
