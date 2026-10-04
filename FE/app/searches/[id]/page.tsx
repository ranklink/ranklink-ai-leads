"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSearchById } from "@/services/searches.service";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { Badge } from "@/components/ui/badge";

export default function SearchDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", id],
    queryFn: () => getSearchById(id),
  });

  if (isLoading) return <p>Loading search...</p>;
  if (isError) return <p className="text-red-500">Search not found.</p>;
  if (!data) return null;

  const search = data.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{search.keyword} — {search.location}</h1>
        <p className="text-muted-foreground text-sm">{search.resultCount} leads found • <Badge>{search.status}</Badge> • {new Date(search.createdAt).toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Radius: {search.radius} • Requested: {search.requestedCount} • Filter: {search.websiteFilter} {search.minimumRating ? `• Min Rating: ${search.minimumRating}` : ""}</p>
      </div>
      <LeadsTable leads={search.leads || []} />
    </div>
  );
}
