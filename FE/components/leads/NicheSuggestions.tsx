"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNicheSuggestions, NicheSuggestion } from "@/services/niches.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sparkles, TrendingUp, TrendingDown, Target, ShoppingBag, Loader2, Search, Lightbulb, BarChart3, Globe, Star, CheckCircle2, History } from "lucide-react";
import { CANADA_PROVINCES, isCanadaCountry } from "@/lib/locations";

interface Props {
  locationValue: string;
  onSelectNiche: (niche: string) => void;
  onLocationChange?: (loc: string) => void;
  recentKeywordSet?: Set<string>;
  recentSearches?: any[];
}

function competitionColor(c: string) {
  if (c === "LOW") return "bg-emerald-500 text-white border-emerald-600";
  if (c === "MEDIUM") return "bg-amber-500 text-white border-amber-600";
  if (c === "HIGH") return "bg-red-500 text-white border-red-600";
  return "bg-slate-500 text-white border-slate-600";
}
function competitionIcon(c: string) {
  if (c === "LOW") return <TrendingUp className="w-3 h-3" />;
  if (c === "MEDIUM") return <BarChart3 className="w-3 h-3" />;
  if (c === "HIGH") return <TrendingDown className="w-3 h-3" />;
  return <Lightbulb className="w-3 h-3" />;
}
function reviewSummary(suggestion: NicheSuggestion) {
  const reviews = suggestion.metrics.avgReviewCount;
  if (reviews === null) return "No review sample";
  const rating = suggestion.metrics.avgRating;
  return reviews + " avg reviews" + (rating === null ? "" : " • " + rating + "★");
}

export function NicheSuggestions({ locationValue, onSelectNiche, onLocationChange, recentKeywordSet, recentSearches }: Props) {
  const [loc, setLoc] = useState(locationValue || "Bengaluru, Karnataka");
  const [filter, setFilter] = useState<string>("ALL");
  const isCanada = isCanadaCountry(loc);
  const [scope, setScope] = useState("");
  const [enabled] = useState(true);

  // sync when parent location changes (e.g., form edits or recent-search click / back-nav restore)
  useEffect(() => {
    if (locationValue && locationValue !== loc) setLoc(locationValue);
  }, [locationValue]); // eslint-disable-line

  useEffect(() => {
    if (isCanada && isCanadaCountry(locationValue)) setScope("");
  }, [locationValue, isCanada]);

  const query = useQuery({
    queryKey: ["niches", isCanada ? scope : loc, filter],
    queryFn: () => getNicheSuggestions({ location: isCanada ? `${scope}, Canada` : loc, limit: 12, competition: filter === "ALL" ? undefined : filter }),
    enabled: enabled && (!isCanada || !!scope),
    staleTime: 1000 * 60 * 5,
  });

  const data = query.data;

  return (
    <Card className="lead-niche-panel overflow-hidden">
      <CardHeader className="lead-niche-header pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="lead-niche-heading flex items-center gap-2 text-base md:text-lg">
              <span className="lead-niche-mark p-2 rounded-lg text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              Niche Finder
              <Badge className="lead-niche-beta ml-1 text-[10px]">BETA</Badge>
            </CardTitle>
            <CardDescription className="lead-niche-description mt-1.5 text-xs md:text-sm max-w-2xl">
              Find potential outreach opportunities in <span className="font-medium">{data?.location || loc}</span>. Rankings prioritize local places rated 3.5★ or lower; ratings alone do not establish buying intent. {data?.totalLeadsAnalyzed ?? "—"} saved places analyzed.
            </CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lightbulb className="w-3 h-3" /> Local data + curated ideas
          </div>
        </div>

        <div className="lead-niche-controls flex flex-col md:flex-row gap-3 mt-4">
          <div className="flex-1 space-y-1.5">
            <Label className="lead-niche-label text-xs">Location for analysis</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={loc}
                  onChange={(e) => {
                    setLoc(e.target.value);
                    onLocationChange?.(e.target.value);
                  }}
                  placeholder="Bengaluru, Karnataka"
                  className="lead-niche-input pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
                className="lead-niche-analyze"
              >
                {query.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden sm:inline ml-2">Analyze</span>
              </Button>
            </div>
            {isCanada && <div className="mt-2 space-y-1.5">
              <Label className="text-xs">Province / territory</Label>
              <Select value={scope} onChange={(e) => { setScope(e.target.value); onLocationChange?.(e.target.value ? `${e.target.value}, Canada` : "Canada"); }} className="bg-white">
                <option value="">Choose a province or territory</option>
                {CANADA_PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
              </Select>
              <p className="text-[11px] text-amber-700">Choose a province to avoid analyzing all of Canada.</p>
            </div>}
          </div>
          <div className="space-y-1.5 md:w-48">
            <Label className="lead-niche-label text-xs">Filter</Label>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="lead-niche-input">
              <option value="ALL">All suggestions</option>
              <option value="LOW">Low competition only</option>
              <option value="MEDIUM">Low + Medium</option>
            </Select>
          </div>
        </div>

        {data?.insights && (
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Target className="w-3 h-3" /> Hot: {data.insights.hotNiches.slice(0, 3).join(" • ") || "—"}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700">
              <ShoppingBag className="w-3 h-3" /> Saturated: {data.insights.saturated.slice(0, 3).join(" • ") || "—"}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="lead-niche-content">
        {isCanada && !scope ? <p className="text-sm text-amber-700 rounded-md border border-amber-200 bg-amber-50 p-3">Select a Canadian province or territory to analyze a focused market.</p> : query.isLoading ? (
          <div className="lead-niche-skeleton grid md:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted" />
            ))}
          </div>
        ) : query.isError ? (
          <p className="lead-niche-error text-sm" role="alert">{(query.error as Error).message}</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.suggestions.map((s: NicheSuggestion) => {
              const isSearched = recentKeywordSet?.has(`${s.niche.toLowerCase()}|${loc.toLowerCase()}`) || recentKeywordSet?.has(`${s.niche.toLowerCase()}|${locationValue.toLowerCase()}`);
              const matchingSearch = recentSearches?.find((r: any) => r.keyword.toLowerCase() === s.niche.toLowerCase() && r.location.toLowerCase() === loc.toLowerCase());
              return (
              <div
                key={s.niche}
                className={`lead-niche-suggestion relative group rounded-xl border p-4 hover:shadow-md transition-all flex flex-col ${isSearched ? "is-searched bg-violet-50/70 border-violet-300 shadow-sm" : "bg-white hover:border-violet-200"}`}
              >
                {isSearched && (
                  <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white flex items-center gap-1 shadow"><CheckCircle2 className="w-3 h-3" /> Searched</span>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="lead-niche-card-title font-semibold text-sm leading-tight line-clamp-1">{s.niche}</h4>
                    <Badge className="mt-1 text-[10px] px-2 py-0.5">
                      {s.dataSource === "CURATED" ? "Idea · no local data" : "Local data · sample " + s.metrics.count}
                    </Badge>
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 shrink-0 ${competitionColor(s.competition)}`}>
                    <span className="flex items-center gap-1">
                      {competitionIcon(s.competition)} {s.competition === "UNKNOWN" ? "Unverified" : s.competition}
                    </span>
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 min-h-[32px]">{s.reason}</p>
                {s.confidence === "LOW" && s.dataSource === "LOCAL" && (
                  <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                    Too few examples to rank reliably. Treat this as an early signal.
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-3">
                  <div className="rounded-lg bg-muted/60 px-2 py-1.5 text-center">
                    <div className="font-semibold">{s.metrics.count}</div>
                    <div className="text-muted-foreground leading-none">saved leads</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1.5 text-center">
                    <div className="font-semibold">{s.metrics.lowRatedPct === null ? "—" : `${s.metrics.lowRatedCount} (${s.metrics.lowRatedPct}%)`}</div>
                    <div className="text-muted-foreground leading-none">≤3.5★ places</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-1.5 text-center">
                    <div className="font-semibold flex items-center justify-center gap-1">
                      <Globe className="w-3 h-3" /> {s.metrics.withoutWebsitePct === null ? "—" : 100 - s.metrics.withoutWebsitePct + "%"}
                    </div>
                    <div className="text-muted-foreground leading-none">have site</div>
                  </div>
                  <div className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-1.5 text-center">
                    <div className="font-bold text-violet-700 flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 fill-violet-600 text-violet-600" /> {s.opportunityScore ?? "—"}
                    </div>
                    <div className="text-violet-600 leading-none">opportunity score</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border text-muted-foreground">{s.demand}</span>
                  {s.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700">{t}</span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> {reviewSummary(s)}
                  </span>
                  <div className="flex gap-1.5">
                    {isSearched && matchingSearch && (
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => window.location.href = `/searches/${matchingSearch.id}`}>
                        <History className="w-3 h-3 mr-1" />View
                      </Button>
                    )}
                    <Button size="sm" className="lead-niche-use-button h-7 text-xs" onClick={() => onSelectNiche(s.niche)}>
                      {isSearched ? "Search again" : "Use niche"}
                    </Button>
                  </div>
                </div>

                <div className="absolute inset-0 rounded-xl border-2 border-violet-500 opacity-0 group-hover:opacity-[0.08] pointer-events-none transition-opacity" />
              </div>
            ); })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Tip: Click <span className="font-semibold">Use niche</span> to auto-fill the search form below and instantly find leads for that niche in your location.
        </p>
      </CardContent>
    </Card>
  );
}
