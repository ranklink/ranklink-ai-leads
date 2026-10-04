import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Table, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="py-10 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Local Business Lead Generation</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Discover high-potential local businesses using Google Places API (New). Find businesses without websites, low reviews, and ready opportunities.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/leads/search"><Button size="lg"><Search className="w-4 h-4 mr-2" />Find Leads</Button></Link>
          <Link href="/dashboard"><Button variant="outline" size="lg"><BarChart3 className="w-4 h-4 mr-2" />Dashboard</Button></Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-8">
        <div className="border rounded-xl p-6 space-y-2">
          <Search className="w-8 h-8 text-primary" />
          <h3 className="font-semibold">Search Businesses</h3>
          <p className="text-sm text-muted-foreground">Enter keyword, location, and radius. We call Google Places Text Search & Place Details with controlled concurrency.</p>
        </div>
        <div className="border rounded-xl p-6 space-y-2">
          <Table className="w-8 h-8 text-primary" />
          <h3 className="font-semibold">Score & Filter</h3>
          <p className="text-sm text-muted-foreground">Lead scoring + opportunity detection. Filter by website, rating, reviews, and score in MySQL.</p>
        </div>
        <div className="border rounded-xl p-6 space-y-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h3 className="font-semibold">Export & Act</h3>
          <p className="text-sm text-muted-foreground">View details, Google reviews, Maps links, and export CSV for outreach.</p>
        </div>
      </div>
    </div>
  );
}
