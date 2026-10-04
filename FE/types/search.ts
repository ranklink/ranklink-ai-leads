export interface LeadSearch {
  id: string;
  keyword: string;
  location: string;
  radius: number | null;
  minimumRating: number | null;
  websiteFilter: string;
  requestedCount: number;
  resultCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { leads: number };
  leads?: any[];
}
