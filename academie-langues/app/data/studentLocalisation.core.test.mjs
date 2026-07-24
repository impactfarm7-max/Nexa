import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapAfricaToCountryRef,
  resolveCountryCode,
  regionsForCode,
  formPatchForCountry,
} from "./studentLocalisation.core.mjs";

const FIXTURE = [
  {
    code: "CM",
    name: "Cameroun",
    dial: "+237",
    regions: ["Centre", "Littoral", "Ouest"],
  },
  {
    code: "SN",
    name: "Sénégal",
    dial: "+221",
    regions: ["Dakar", "Thiès"],
  },
];

test("mapAfricaToCountryRef expose pays + régions (pas une liste vide)", () => {
  const options = mapAfricaToCountryRef(FIXTURE);
  assert.equal(options.length, 2);
  assert.deepEqual(options[0], {
    code: "CM",
    name: "Cameroun",
    phone_code: "+237",
    regions: ["Centre", "Littoral", "Ouest"],
  });
});

test("resolveCountryCode retrouve le code ISO depuis le nom ou l'indicatif", () => {
  const options = mapAfricaToCountryRef(FIXTURE);
  assert.equal(resolveCountryCode(options, { country: "Cameroun", country_code: null }), "CM");
  assert.equal(resolveCountryCode(options, { country: null, country_code: "+221" }), "SN");
  assert.equal(resolveCountryCode(options, { country: null, country_code: "SN" }), "SN");
  assert.equal(resolveCountryCode([], { country: "Cameroun", country_code: "+237" }), "");
});

test("regionsForCode retourne les régions du pays sélectionné", () => {
  const options = mapAfricaToCountryRef(FIXTURE);
  assert.deepEqual(regionsForCode(options, "CM"), ["Centre", "Littoral", "Ouest"]);
  assert.deepEqual(regionsForCode(options, ""), []);
});

test("formPatchForCountry pose nom + indicatif et reset la région", () => {
  const options = mapAfricaToCountryRef(FIXTURE);
  assert.deepEqual(formPatchForCountry(options, "CM"), {
    country: "Cameroun",
    country_code: "+237",
    region: null,
  });
  assert.equal(formPatchForCountry(options, ""), null);
});
