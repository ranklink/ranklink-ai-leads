"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface Filters {
  search?: string;
  website: string;
  minRating?: string;
  maxRating?: string;
  minReviews?: string;
  maxReviews?: string;
  minScore?: string;
  businessStatus?: string;
  sortBy: string;
  sortOrder: string;
}

export function LeadFilters({ filters, onChange, onExport }: { filters: Filters; onChange: (f: Filters) => void; onExport: () => void }) {
  const update = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 border rounded-lg bg-card">
      <div>
        <Label>Search</Label>
        <Input placeholder="Search name/address" value={filters.search || ""} onChange={(e) => update("search", e.target.value)} />
      </div>
      <div>
        <Label>Website</Label>
        <Select value={filters.website} onChange={(e) => update("website", e.target.value)}>
          <option value="ANY">Any</option>
          <option value="HAS_WEBSITE">Has website</option>
          <option value="NO_WEBSITE">No website</option>
        </Select>
      </div>
      <div>
        <Label>Min Rating</Label>
        <Input type="number" min="0" max="5" step="0.1" value={filters.minRating || ""} onChange={(e) => update("minRating", e.target.value)} placeholder="0" />
      </div>
      <div>
        <Label>Min Reviews</Label>
        <Input type="number" value={filters.minReviews || ""} onChange={(e) => update("minReviews", e.target.value)} placeholder="0" />
      </div>
      <div>
        <Label>Min Score</Label>
        <Input type="number" value={filters.minScore || ""} onChange={(e) => update("minScore", e.target.value)} placeholder="0" />
      </div>
      <div>
        <Label>Business Status</Label>
        <Select value={filters.businessStatus || ""} onChange={(e) => update("businessStatus", e.target.value)}>
          <option value="">Any</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="CLOSED_TEMPORARILY">Closed temporarily</option>
        </Select>
      </div>
      <div>
        <Label>Sort</Label>
        <div className="flex gap-1">
          <Select value={filters.sortBy} onChange={(e) => update("sortBy", e.target.value)}>
            <option value="leadScore">Score</option>
            <option value="rating">Rating</option>
            <option value="reviewCount">Reviews</option>
            <option value="name">Name</option>
          </Select>
          <Select value={filters.sortOrder} onChange={(e) => update("sortOrder", e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
