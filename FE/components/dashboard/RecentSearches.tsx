"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RecentSearches({ searches }: { searches: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Searches</CardTitle>
        <Link href="/searches"><Button variant="ghost" size="sm">View All</Button></Link>
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No searches yet.</p>
        ) : (
          <div className="space-y-3">
            {searches.slice(0, 5).map((s) => (
              <Link key={s.id} href={`/searches/${s.id}`} className="flex justify-between items-center p-3 rounded-md border hover:bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{s.keyword} — {s.location}</p>
                  <p className="text-xs text-muted-foreground">{s.resultCount} leads • {new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${s.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{s.status}</span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
