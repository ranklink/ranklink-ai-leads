import assert from "node:assert/strict";
import test from "node:test";
import { fallbackAnalytics } from "../src/agents/analytics.agent";
import { fallbackContactEnrichment } from "../src/agents/contact-enrichment.agent";
import { fallbackFollowUp } from "../src/agents/followup.agent";
import { fallbackOutreach } from "../src/agents/outreach.agent";
import { fallbackHardRuleQualification, fallbackQualification } from "../src/agents/qualification.agent";
import { fallbackResearch } from "../src/agents/research.agent";
import {
  analyticsInputSchema,
  analyticsOutputSchema,
  contactEnrichmentInputSchema,
  contactEnrichmentOutputSchema,
  followUpInputSchema,
  followUpOutputSchema,
  outreachInputSchema,
  outreachOutputSchema,
  qualificationInputSchema,
  qualificationOutputSchema,
  researchInputSchema,
  researchOutputSchema,
} from "../src/agents/schemas";

const observedAt = "2026-11-10T08:00:00.000Z";
const evidence = [
  { id: "website", fact: "The business website is not listed.", sourceUrl: "https://maps.google.com/?q=sample", observedAt, sourceType: "GOOGLE_PLACES" as const },
  { id: "review-1", fact: "A customer mentioned friendly service.", sourceUrl: "https://maps.google.com/?q=sample", observedAt, sourceType: "CUSTOMER_REVIEW" as const },
];

test("each registered agent has a schema-valid deterministic fallback", async (t) => {
  const researchInput = researchInputSchema.parse({
    leadId: "lead_test",
    name: "Sample Dental",
    category: "Dentist",
    address: "1 Main Street",
    website: null,
    phone: null,
    rating: 4.6,
    reviewCount: 18,
    businessStatus: "OPERATIONAL",
    evidence,
  });
  const research = researchOutputSchema.parse(fallbackResearch(researchInput));

  const qualificationInput = qualificationInputSchema.parse({
    leadId: researchInput.leadId,
    applicationScore: 82,
    minimumScore: 50,
    businessStatus: researchInput.businessStatus,
    criteria: "Active dental practices with a public website.",
    research,
  });
  const qualification = qualificationOutputSchema.parse(fallbackQualification(qualificationInput));

  await t.test("RESEARCH uses only observed evidence", () => {
    assert.match(research.summary, /Sample Dental/);
    assert.deepEqual(research.evidenceIds, ["website", "review-1"]);
    assert.deepEqual(research.missingFields, ["website", "phone"]);
  });

  await t.test("QUALIFICATION returns a reviewable fit decision", () => {
    assert.equal(qualification.fit, "HIGH");
    assert.equal(qualification.recommendedAction, "REVIEW");
    assert.deepEqual(qualificationOutputSchema.parse(fallbackHardRuleQualification({ ...qualificationInput, applicationScore: 40 })).recommendedAction, "REJECT");
  });

  await t.test("CONTACT_ENRICHMENT ranks only supplied candidates", () => {
    const input = contactEnrichmentInputSchema.parse({
      leadId: "lead_test",
      companyName: "Sample Dental",
      domain: "sample.test",
      candidates: [
        { name: "Taylor", email: "taylor@sample.test", role: "Owner", confidence: 0.91, verificationStatus: "valid" },
        { name: "Jordan", email: "jordan@sample.test", role: "Manager", confidence: 0.63, verificationStatus: "unknown" },
      ],
    });
    const output = contactEnrichmentOutputSchema.parse(fallbackContactEnrichment(input));
    assert.deepEqual(output.contacts.map((contact) => contact.email), ["taylor@sample.test", "jordan@sample.test"]);
  });

  await t.test("OUTREACH creates a grounded review draft", () => {
    const input = outreachInputSchema.parse({
      leadId: "lead_test",
      companyName: "Sample Dental",
      recipientName: "Taylor",
      recipientEmail: "taylor@sample.test",
      senderName: "Kiran",
      offer: "We help local practices improve their online booking experience.",
      qualification,
      evidence,
    });
    const output = outreachOutputSchema.parse(fallbackOutreach(input));
    assert.equal(output.personalizationEvidenceIds[0], "website");
    assert.match(output.body, /If this is not relevant/);
  });

  await t.test("FOLLOW_UP proposes a low-pressure delay", () => {
    const input = followUpInputSchema.parse({
      leadId: "lead_test",
      companyName: "Sample Dental",
      originalSubject: "A question for Sample Dental",
      originalBody: "Would you be open to a short conversation?",
      sentAt: observedAt,
      senderName: "Kiran",
    });
    const output = followUpOutputSchema.parse(fallbackFollowUp(input));
    assert.ok(output.waitHours >= 72);
    assert.match(output.body, /close the loop/);
  });

  await t.test("ANALYTICS summarizes aggregate counts", () => {
    const input = analyticsInputSchema.parse({ periodStart: observedAt, periodEnd: "2026-11-11T08:00:00.000Z", metrics: { leads: 12, qualified: 4, drafts: 3, sent: 2, failed: 1 } });
    const output = analyticsOutputSchema.parse(fallbackAnalytics(input));
    assert.match(output.summary, /12 leads/);
    assert.match(output.summary, /2 sent messages/);
    assert.equal(output.recommendations.length, 1);
  });
});
