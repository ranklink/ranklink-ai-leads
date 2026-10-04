"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLeads } from "@/services/leads.service";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadFilters, Filters } from "@/components/leads/LeadFilters";
import { ExportLeadsButton } from "@/components/leads/ExportLeadsButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LeadsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    website: "ANY",
    sortBy: "leadScore",
    sortOrder: "desc",
  });
  const [page, setPage] = useState(1);

  const queryParams: Record<string, any> = {
    page,
    limit: 25,
    search: filters.search || undefined,
    website: filters.website !== "ANY" ? filters.website : undefined,
    minRating: filters.minRating || undefined,
    maxRating: filters.maxRating || undefined,
    minReviews: filters.minReviews || undefined,
    maxReviews: filters.maxReviews || undefined,
    minScore: filters.minScore || undefined,
    businessStatus: filters.businessStatus || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["leads", queryParams],
    queryFn: () => getLeads(queryParams),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex gap-2">
          <ExportLeadsButton filters={queryParams} />
          <Link href="/leads/search"><Button>Find Leads</Button></Link>
        </div>
      </div>

      <LeadFilters filters={filters} onChange={setFilters} onExport={() => {}} />

      {isLoading && <p>Loading leads...</p>}
      {isError && <p className="text-red-500">Failed to load leads. Is backend running?</p>}
      {data && (
        <>
          <p className="text-sm text-muted-foreground">{data.data.pagination.total} leads found</p>
          <LeadsTable leads={data.data.items} />
          <div className="flex justify-between items-center">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm">Page {data.data.pagination.page} / {data.data.pagination.totalPages}</span>
            <Button variant="outline" disabled={page >= data.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}
