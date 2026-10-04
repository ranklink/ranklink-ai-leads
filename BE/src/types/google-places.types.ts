export interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  reviews?: GoogleReview[];
}

export interface GoogleReview {
  name?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  rating?: number;
  text?: { text: string; languageCode: string };
  publishTime?: string;
  relativePublishTimeDescription?: string;
}

export interface GoogleTextSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

export interface NormalizedLead {
  placeId: string;
  name: string;
  category: string | null;
  primaryType: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  internationalPhone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number;
  businessStatus: string | null;
  reviews?: NormalizedReview[];
}

export interface NormalizedReview {
  author: string | null;
  rating: number | null;
  comment: string | null;
  publishedAt: Date | null;
}
