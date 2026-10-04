import assert from "assert";
import { calculateLeadScore } from "../src/services/lead-scoring.service";

// No website => 35 + rating >4.2 =>5 => total 40 (reviewCount 200 gives 0, no phone, closed =>0)
assert.equal(calculateLeadScore({ website: null, reviewCount: 200, rating: 5, phone: null, businessStatus: "CLOSED" }), 40);

// Ideal hot lead: no website (35) + phone (10) + low reviews 20 + rating 3-4.2 15 + operational 5 = 85
assert.equal(calculateLeadScore({ website: null, phone: "+91", reviewCount: 5, rating: 4.0, businessStatus: "OPERATIONAL" }), 85);

// High review count with no website but with phone: 35 + phone10 + reviews 5 (80->5) + rating 15 + operational5 =70 ; without phone =60
assert.equal(calculateLeadScore({ website: null, reviewCount: 80, rating: 4.0, businessStatus: "OPERATIONAL" }), 60);
assert.equal(calculateLeadScore({ website: null, phone: "+91", reviewCount: 80, rating: 4.0, businessStatus: "OPERATIONAL" }), 70);

// Has website, many reviews, high rating => low score: website5 + phone0 + reviews0 + rating5 + operational5 =15 ; with phone =25
assert.equal(calculateLeadScore({ website: "https://example.com", reviewCount: 243, rating: 4.6, businessStatus: "OPERATIONAL" }), 15);
assert.equal(calculateLeadScore({ website: "https://example.com", phone: "+91", reviewCount: 243, rating: 4.6, businessStatus: "OPERATIONAL" }), 25);

console.log("✅ lead-scoring.test.ts passed");
