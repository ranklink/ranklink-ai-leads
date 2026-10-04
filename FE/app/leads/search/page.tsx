"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LeadSearchForm } from "@/components/leads/LeadSearchForm";
import { NicheSuggestions } from "@/components/leads/NicheSuggestions";
import { getSearches } from "@/services/searches.service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, Eye, History } from "lucide-react";

function getInitialFromStorage(): { keyword?: string; location?: string; searchId?: string } | null {
  try {
    const raw = localStorage.getItem("lastLeadSearch");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefer URL params > localStorage > defaults (guard against buggy path values)
  const rawUrlKeyword = searchParams.get("keyword");
  const rawUrlLocation = searchParams.get("location");
  const isValidLocation = (v: string | null) => !!v && !v.startsWith("/") && v.length >= 2;
  const urlKeyword = rawUrlKeyword && rawUrlKeyword.length >= 2 ? rawUrlKeyword : null;
  const urlLocation = isValidLocation(rawUrlLocation) ? rawUrlLocation : null;

  const [keyword, setKeyword] = useState<string>(() => urlKeyword || "Dentist");
  const [searchLocation, setSearchLocation] = useState<string>(() => urlLocation || "Bengaluru, Karnataka");
  const location = searchLocation; // alias for legacy refs below
  const setLocation = setSearchLocation;
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount if URL didn't provide values (fixes back-nav losing state)
  useEffect(() => {
    if (urlKeyword || urlLocation) { setHydrated(true); return; }
    const stored = getInitialFromStorage();
    if (stored) {
      if (stored.keyword) setKeyword(stored.keyword);
      if (stored.location && !stored.location.startsWith("/")) setSearchLocation(stored.location);
    }
    setHydrated(true);
  }, []); // eslint-disable-line

  // Keep URL in sync so refresh/back retains niche (shallow replace, no scroll)
  useEffect(() => {
    if (!hydrated) return;
    // Don't sync if location looks like a path (bug guard)
    if (searchLocation.startsWith("/")) return;
    const params = new URLSearchParams();
    // preserve other params? start fresh to avoid carrying buggy location
    if (keyword) params.set("keyword", keyword);
    if (searchLocation) params.set("location", searchLocation);
    const qs = params.toString();
    const target = `/leads/search${qs ? `?${qs}` : ""}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== target) router.replace(target, { scroll: false });
  }, [keyword, searchLocation, hydrated]); // eslint-disable-line

  const searchesQuery = useQuery({
    queryKey: ["searches", "recent", 1],
    queryFn: () => getSearches(1, 5),
    staleTime: 1000 * 30,
  });
  const recent: any[] = searchesQuery.data?.data?.items ?? [];
  const recentKeywordSet = new Set<string>(recent.map((s: any) => `${s.keyword.toLowerCase()}|${s.location.toLowerCase()}`));
  const lastSearch = recent[0];

  // Also check localStorage lastSearch for banner if API empty but storage has it
  const [lastStored, setLastStored] = useState<{ keyword: string; location: string; searchId: string } | null>(null);
  useEffect(() => {
    const s = getInitialFromStorage();
    // clean buggy stored location
    if (s?.location?.startsWith("/")) {
      try { localStorage.removeItem("lastLeadSearch"); } catch {}
    } else if (s?.searchId) setLastStored(s as any);
  }, [searchesQuery.data]);

  // Fix bookmarked buggy URL on load: if URL had location=/leads/search, clean it
  useEffect(() => {
    if (rawUrlLocation && rawUrlLocation.startsWith("/")) {
      const params = new URLSearchParams();
      if (rawUrlKeyword) params.set("keyword", rawUrlKeyword);
      params.set("location", "Bengaluru, Karnataka");
      router.replace(`/leads/search?${params.toString()}`, { scroll: false });
    }
  }, []); // eslint-disable-line

  const bannerSearch = lastSearch || lastStored;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Recently searched banner - fixes "can't see searched one after coming back" */}
      {bannerSearch && (
        <Card className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-amber-50/70 border-amber-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="p-1.5 rounded-md bg-amber-500 text-white"><History className="w-4 h-4" /></span>
            <span>
              Last searched: <span className="font-semibold">{bannerSearch.keyword}</span> in <span className="font-medium">{bannerSearch.location}</span>
              {lastSearch?.createdAt && (
                <span className="text-muted-foreground ml-2 inline-flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(lastSearch.createdAt).toLocaleString()}</span>
              )}
              {lastSearch?.resultCount !== undefined && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white border">{lastSearch.resultCount} leads</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              onClick={() => {
                setKeyword(bannerSearch.keyword);
                setSearchLocation(bannerSearch.location);
                document.getElementById("lead-search-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              Load again
            </Button>
            {bannerSearch.searchId || (bannerSearch as any).id ? (
              <Link href={`/searches/${(bannerSearch as any).searchId || (bannerSearch as any).id}`}>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700"><Eye className="w-4 h-4 mr-1" />View results</Button>
              </Link>
            ) : null}
          </div>
        </Card>
      )}

      {/* Recent searches strip (5) */}
      {recent.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
          <span className="text-muted-foreground shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" /> Recent:</span>
          {recent.slice(0, 5).map((s: any) => (
            <button
              key={s.id}
              onClick={() => { setKeyword(s.keyword); setSearchLocation(s.location); }}
              className={`shrink-0 px-3 py-1 rounded-full border text-xs hover:bg-accent ${keyword === s.keyword && searchLocation === s.location ? "bg-violet-600 text-white border-violet-600" : "bg-white"}`}
              title={`${s.keyword} in ${s.location} • ${s.resultCount} leads`}
            >
              {s.keyword} • {s.location}
            </button>
          ))}
          <Link href="/searches" className="shrink-0 text-xs text-violet-600 hover:underline ml-1">View all →</Link>
        </div>
      )}

      <NicheSuggestions
        locationValue={searchLocation}
        onSelectNiche={(niche) => {
          setKeyword(niche);
          document.getElementById("lead-search-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        onLocationChange={setSearchLocation}
        recentKeywordSet={recentKeywordSet}
        recentSearches={recent}
      />
      <div id="lead-search-form" className="max-w-3xl mx-auto">
        <LeadSearchForm
          initialKeyword={keyword}
          initialLocation={searchLocation}
          onKeywordChange={setKeyword}
          onLocationChange={setSearchLocation}
        />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<p>Loading search...</p>}><SearchPageContent /></Suspense>;
}
