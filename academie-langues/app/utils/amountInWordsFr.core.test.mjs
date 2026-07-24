import { test } from "node:test";
import assert from "node:assert/strict";
import { amountInWordsFr } from "./amountInWordsFr.core.mjs";

test("0 → zéro franc CFA", () => {
  assert.equal(amountInWordsFr(0), "zéro franc CFA");
});

test("1 → un franc CFA", () => {
  assert.equal(amountInWordsFr(1), "un franc CFA");
});

test("71 → soixante et onze francs CFA", () => {
  assert.equal(amountInWordsFr(71), "soixante et onze francs CFA");
});

test("80 → quatre-vingts francs CFA", () => {
  assert.equal(amountInWordsFr(80), "quatre-vingts francs CFA");
});

test("90_000 → quatre-vingt-dix mille francs CFA", () => {
  assert.equal(amountInWordsFr(90_000), "quatre-vingt-dix mille francs CFA");
});

test("150_000 → cent cinquante mille francs CFA", () => {
  assert.equal(amountInWordsFr(150_000), "cent cinquante mille francs CFA");
});

test("1_000_000 → un million francs CFA", () => {
  assert.equal(amountInWordsFr(1_000_000), "un million francs CFA");
});

test("string avec espaces / FCFA → parse digits", () => {
  assert.equal(amountInWordsFr("90 000 FCFA"), "quatre-vingt-dix mille francs CFA");
});

test("négatif / NaN → zéro franc CFA", () => {
  assert.equal(amountInWordsFr(-5), "zéro franc CFA");
  assert.equal(amountInWordsFr(Number.NaN), "zéro franc CFA");
});
