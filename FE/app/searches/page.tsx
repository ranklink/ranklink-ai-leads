"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSearches } from "@/services/searches.service";
import { SearchHistoryTable } from "@/components/searches/SearchHistoryTable";
import { Button } from "@/components/ui/button";

export default function SearchesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["searches", page],
    queryFn: () => getSearches(page, 20),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search History</h1>
      {isLoading && <p>Loading...</p>}
      {data && (
        <>
          <SearchHistoryTable searches={data.data.items} />
          <div className="flex justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm">Page {data.data.pagination.page} / {data.data.pagination.totalPages} • {data.data.pagination.total} total</span>
            <Button variant="outline" disabled={page >= data.data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}
