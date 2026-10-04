import test from "node:test";
import assert from "node:assert/strict";
import { buildDeterministicDraft, getProfileForTesting } from "../src/services/personalization.service";

const base = { name: "Acme Dental", category: "Dentist", primaryType: "dentist", address: "Pune, India", websiteExists: true, reviewCount: 100, rating: 4.8 };

test("selects the no-website strategy first", () => assert.equal(getProfileForTesting({ ...base, websiteExists: false }), "NO_WEBSITE"));
test("selects review growth for businesses with few reviews", () => assert.equal(getProfileForTesting({ ...base, reviewCount: 10 }), "REVIEW_GROWTH"));
test("does not invent facts in the deterministic draft", () => {
  const draft = buildDeterministicDraft(base, "Sam", "Alex");
  assert.match(draft.body, /100 Google reviews/);
  assert.match(draft.body, /If you’d rather not receive messages/);
  assert.equal(draft.profile, "LOCAL_PRESENCE");
});
