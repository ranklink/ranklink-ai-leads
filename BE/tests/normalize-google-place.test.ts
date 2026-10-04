import assert from "assert";
import { normalizePlace } from "../src/services/google-places.service";

const place: any = {
  id: "places/ChIJ123",
  displayName: { text: "Smile Dental Clinic", languageCode: "en" },
  formattedAddress: "MG Road, Bengaluru",
  location: { latitude: 12.97, longitude: 77.59 },
  rating: 4.1,
  userRatingCount: 18,
  websiteUri: undefined,
  googleMapsUri: "https://maps.google.com/?cid=123",
  businessStatus: "OPERATIONAL",
  primaryType: "dentist",
  nationalPhoneNumber: "+91 98765 43210",
};

const normalized = normalizePlace(place);

assert.equal(normalized.placeId, "places/ChIJ123");
assert.equal(normalized.name, "Smile Dental Clinic");
assert.equal(normalized.address, "MG Road, Bengaluru");
assert.equal(normalized.rating, 4.1);
assert.equal(normalized.reviewCount, 18);
assert.equal(normalized.phone, "+91 98765 43210");
assert.equal(normalized.website, null);
assert.equal(normalized.category, "dentist");

// missing values safely handled
const minimal: any = { id: "places/empty" };
const norm2 = normalizePlace(minimal);
assert.equal(norm2.name, "Unknown Business");
assert.equal(norm2.reviewCount, 0);
assert.equal(norm2.rating, null);

console.log("✅ normalize-google-place.test.ts passed");
