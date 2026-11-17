export interface Opportunity {
  type: string;
  label: string;
}

export interface Review {
  id: string;
  author: string | null;
  rating: number | null;
  comment: string | null;
  publishedAt: string | null;
}

export interface LeadContact {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  source: string;
  confidence: number;
  verificationStatus: string | null;
  updatedAt: string;
}

export interface Lead {
  id: string;
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
  websiteExists: boolean;
  leadScore: number;
  opportunitySummary: string | null;
  opportunities?: Opportunity[];
  reviews?: Review[];
  contacts?: LeadContact[];
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
