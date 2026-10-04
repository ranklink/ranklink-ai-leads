"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Review } from "@/types/lead";
import { Star } from "lucide-react";

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Google Reviews • Recent / Relevant Reviews</CardTitle></CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews available. Google Places may return a limited subset.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.author || "Anonymous"}</span>
                  {r.rating && <span className="flex items-center text-amber-500 text-xs"><Star className="w-3 h-3 fill-amber-500" /> {r.rating}</span>}
                  {r.publishedAt && <span className="text-xs text-muted-foreground">{new Date(r.publishedAt).toLocaleDateString()}</span>}
                </div>
                {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
