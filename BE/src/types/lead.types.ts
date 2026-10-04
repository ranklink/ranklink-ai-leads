export interface Opportunity {
  type: "NO_WEBSITE" | "LOW_REVIEW_COUNT" | "REPUTATION_OPPORTUNITY" | "PHONE_AVAILABLE" | "STRONG_LOCAL_PRESENCE";
  label: string;
}

export interface LeadScoreInput {
  website?: string | null;
  rating?: number | null;
  reviewCount?: number;
  phone?: string | null;
  businessStatus?: string | null;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  search?: string;
  website?: "ANY" | "HAS_WEBSITE" | "NO_WEBSITE";
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  maxReviews?: number;
  minScore?: number;
  maxScore?: number;
  businessStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
