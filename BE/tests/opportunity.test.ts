import assert from "assert";
import { detectOpportunities } from "../src/services/opportunity.service";

let opps = detectOpportunities({ website: null, reviewCount: 5, rating: 4.0, phone: "+91" });
assert.ok(opps.find((o) => o.type === "NO_WEBSITE"), "should have NO_WEBSITE");
assert.ok(opps.find((o) => o.type === "LOW_REVIEW_COUNT"), "should have LOW_REVIEW_COUNT");
assert.ok(opps.find((o) => o.type === "REPUTATION_OPPORTUNITY"), "should have REPUTATION_OPPORTUNITY");
assert.ok(opps.find((o) => o.type === "PHONE_AVAILABLE"), "should have PHONE_AVAILABLE");

opps = detectOpportunities({ website: "https://example.com", reviewCount: 200, rating: 4.8, phone: null });
assert.ok(!opps.find((o) => o.type === "NO_WEBSITE"), "should NOT have NO_WEBSITE");
assert.ok(!opps.find((o) => o.type === "LOW_REVIEW_COUNT"), "should NOT have LOW_REVIEW_COUNT");
assert.ok(opps.find((o) => o.type === "STRONG_LOCAL_PRESENCE"), "should have STRONG_LOCAL_PRESENCE");

console.log("✅ opportunity.test.ts passed");
