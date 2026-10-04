import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import type {
  GooglePlace,
  GoogleTextSearchResponse,
  NormalizedLead,
  NormalizedReview,
} from "../types/google-places.types";

const BASE_URL = "https://places.googleapis.com/v1";

// Centralized field masks
export const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "nextPageToken",
].join(",");

export const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "rating",
  "userRatingCount",
  "reviews",
  "businessStatus",
  "primaryType",
  "types",
  "location",
].join(",");

function getApiKey(): string {
  if (!env.GOOGLE_PLACES_API_KEY || env.GOOGLE_PLACES_API_KEY === "your_google_key") {
    throw new ApiError(500, "Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in BE/.env");
  }
  return env.GOOGLE_PLACES_API_KEY;
}

// Controlled concurrency helper
export async function pMapWithConcurrency<T, R>(items: T[], fn: (item: T, idx: number) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      results[current] = await fn(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function normalizePlace(place: GooglePlace): NormalizedLead {
  const placeId = place.id || "";
  const name = place.displayName?.text?.trim() || "Unknown Business";
  const category = place.primaryType ?? place.types?.[0] ?? null;
  const primaryType = place.primaryType ?? null;

  const reviews: NormalizedReview[] | undefined = place.reviews?.map((r) => ({
    author: r.authorAttribution?.displayName ?? null,
    rating: r.rating ?? null,
    comment: r.text?.text ?? null,
    publishedAt: r.publishTime ? new Date(r.publishTime) : null,
  }));

  return {
    placeId,
    name,
    category,
    primaryType,
    address: place.formattedAddress ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    phone: place.nationalPhoneNumber ?? null,
    internationalPhone: place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    businessStatus: place.businessStatus ?? null,
    reviews,
  };
}

export async function searchPlaces(textQuery: string, pageSize: number, pageToken?: string): Promise<GoogleTextSearchResponse> {
  const apiKey = getApiKey();

  const body: any = {
    textQuery,
    pageSize: Math.min(pageSize, 20),
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(`${BASE_URL}/places:searchText`, {
    signal: AbortSignal.timeout(30_000),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Google Places searchText error]", errText);
    throw new ApiError(502, `Google Places search failed: ${res.status}`);
  }

  const data = (await res.json()) as GoogleTextSearchResponse;
  return data;
}

export async function getPlaceDetails(placeId: string): Promise<GooglePlace> {
  const apiKey = getApiKey();
  const cleanId = placeId.startsWith("places/") ? placeId : `places/${placeId}`;

  const res = await fetch(`${BASE_URL}/${cleanId}`, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Google Places details error]", errText);
    throw new ApiError(502, `Google Place Details failed: ${res.status}`);
  }

  return (await res.json()) as GooglePlace;
}

export async function searchAndEnrich(textQuery: string, totalLimit: number): Promise<NormalizedLead[]> {
  const collected: NormalizedLead[] = [];
  let pageToken: string | undefined = undefined;
  let attempts = 0;

  while (collected.length < totalLimit && attempts < 5) {
    const remaining = totalLimit - collected.length;
    const pageSize = Math.min(remaining, 20);
    const data = await searchPlaces(textQuery, pageSize, pageToken);
    const places = data.places ?? [];

    if (places.length === 0) break;

    // Normalize places from text search
    const normalized = places.map(normalizePlace);

    // Enrich with details - controlled concurrency 5
    // Only enrich if phone/website missing or to get reviews? We do enrichment for all to get accurate data but limited concurrency
    const enriched = await pMapWithConcurrency(
      normalized,
      async (lead) => {
        try {
          // If text search already has phone and website, still fetch details for reviews?
          // To save quota, we could skip if not needed, but for MVP we fetch details for every lead with concurrency control
          const details = await getPlaceDetails(lead.placeId);
          const norm = normalizePlace(details);
          // merge: prefer details but keep fallback from text search
          return {
            ...lead,
            phone: norm.phone ?? lead.phone,
            internationalPhone: norm.internationalPhone ?? lead.internationalPhone,
            website: norm.website ?? lead.website,
            googleMapsUrl: norm.googleMapsUrl ?? lead.googleMapsUrl,
            rating: norm.rating ?? lead.rating,
            reviewCount: norm.reviewCount || lead.reviewCount,
            address: norm.address ?? lead.address,
            reviews: norm.reviews ?? lead.reviews,
          };
        } catch (e) {
          console.warn(`Failed to enrich ${lead.placeId}`, e);
          return lead;
        }
      },
      5
    );

    collected.push(...enriched.slice(0, remaining));

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    attempts++;
    // Google requires short delay before next page token is valid in old API, new API may not need; add small delay
    if (pageToken) await new Promise((r) => setTimeout(r, 1500));
  }

  return collected.slice(0, totalLimit);
}
