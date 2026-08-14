import test from "node:test";
import assert from "node:assert/strict";

import { chooseGrantSource, findRequestedBeneficiary } from "./page.core.mjs";

test("chooseGrantSource prefers typed stock when the selected type has stock", () => {
  assert.equal(
    chooseGrantSource(
      { generic: 20, tutor_ia: 3, exam_sim: 0, ai_corrections: 0, course_builder: 0 },
      "tutor_ia",
    ),
    "typed",
  );
});

test("chooseGrantSource falls back to generic stock when typed stock is empty", () => {
  assert.equal(
    chooseGrantSource(
      { generic: 20, tutor_ia: 0, exam_sim: 0, ai_corrections: 0, course_builder: 0 },
      "tutor_ia",
    ),
    "generic",
  );
});

test("findRequestedBeneficiary matches a URL beneficiary by id or email", () => {
  const people = [
    { id: "student-id", email: "student@nexa.test" },
    { id: "staff-id", email: "staff@nexa.test" },
  ];

  assert.equal(findRequestedBeneficiary(people, "staff-id")?.id, "staff-id");
  assert.equal(findRequestedBeneficiary(people, "STUDENT@NEXA.TEST")?.id, "student-id");
  assert.equal(findRequestedBeneficiary(people, "missing@nexa.test"), null);
});
