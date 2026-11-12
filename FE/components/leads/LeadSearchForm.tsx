"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { searchLeads } from "@/services/leads.service";
import { Loader2, Search, Building2, MapPin, LocateFixed, Users, Star, Globe } from "lucide-react";

const schema = z.object({
  keyword: z.string().min(2, "Min 2 chars").max(100),
  location: z.string().min(2, "Min 2 chars").max(200),
  radius: z.coerce.number().int().min(1000).max(50000),
  limit: z.coerce.number().int().min(1).max(100),
  minimumRating: z.string().optional(),
  website: z.enum(["ANY", "HAS_WEBSITE", "NO_WEBSITE"]),
});

type FormValues = z.infer<typeof schema>;

export function LeadSearchForm({
  initialKeyword,
  initialLocation,
  onKeywordChange,
  onLocationChange,
}: {
  initialKeyword?: string;
  initialLocation?: string;
  onKeywordChange?: (v: string) => void;
  onLocationChange?: (v: string) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      keyword: initialKeyword ?? "Dentist",
      location: initialLocation ?? "Bengaluru, Karnataka",
      radius: 10000,
      limit: 20,
      minimumRating: "",
      website: "ANY",
    },
  });

  const keywordWatch = watch("keyword");
  const locationWatch = watch("location");

  // sync external changes (AI niche picker)
  React.useEffect(() => {
    if (initialKeyword !== undefined && initialKeyword !== keywordWatch) setValue("keyword", initialKeyword);
  }, [initialKeyword]); // eslint-disable-line
  React.useEffect(() => {
    if (initialLocation !== undefined && initialLocation !== locationWatch) setValue("location", initialLocation);
  }, [initialLocation]); // eslint-disable-line

  // bubble internal changes up so AI panel stays in sync
  React.useEffect(() => { onKeywordChange?.(keywordWatch); }, [keywordWatch]); // eslint-disable-line
  React.useEffect(() => { onLocationChange?.(locationWatch); }, [locationWatch]); // eslint-disable-line

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload: any = {
        keyword: data.keyword,
        location: data.location,
        radius: Number(data.radius),
        limit: Number(data.limit),
        website: data.website,
      };
      if (data.minimumRating) payload.minimumRating = Number(data.minimumRating);
      return searchLeads(payload);
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["searches"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["niches"] });
      try {
        localStorage.setItem("lastLeadSearch", JSON.stringify({
          keyword: variables.keyword,
          location: variables.location,
          searchId: data.data.searchId,
          createdAt: new Date().toISOString(),
        }));
      } catch {}
      router.push(`/searches/${data.data.searchId}`);
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="lead-search-form">
      <div className="lead-search-form-heading">
        <div>
          <p className="lead-search-form-kicker">BUILD YOUR PROSPECT LIST</p>
          <h2 id="lead-search-title">Find local businesses</h2>
          <p className="lead-search-form-description">Set your market and we’ll surface businesses that fit.</p>
        </div>
        <span className="lead-search-source"><MapPin aria-hidden="true" size={15} /> Google Maps data</span>
      </div>

      <div className="lead-search-grid">
        <div className="lead-search-field lead-search-field--wide">
          <Label htmlFor="lead-keyword" className="lead-search-label">Business or keyword</Label>
          <div className="lead-search-input-wrap">
            <Building2 aria-hidden="true" className="lead-search-field-icon" />
            <Input id="lead-keyword" placeholder="e.g. independent dentists" className="lead-search-input" aria-invalid={!!errors.keyword} aria-describedby={errors.keyword ? "lead-keyword-error" : undefined} {...register("keyword")} />
          </div>
          {errors.keyword && <p id="lead-keyword-error" className="lead-search-error" role="alert">{errors.keyword.message}</p>}
        </div>
        <div className="lead-search-field lead-search-field--wide">
          <Label htmlFor="lead-location" className="lead-search-label">Location</Label>
          <div className="lead-search-input-wrap">
            <MapPin aria-hidden="true" className="lead-search-field-icon" />
            <Input id="lead-location" placeholder="City, region" className="lead-search-input" aria-invalid={!!errors.location} aria-describedby={errors.location ? "lead-location-error" : undefined} {...register("location")} />
          </div>
          {errors.location && <p id="lead-location-error" className="lead-search-error" role="alert">{errors.location.message}</p>}
        </div>
        <div className="lead-search-field">
          <Label htmlFor="lead-radius" className="lead-search-label">Search radius</Label>
          <div className="lead-search-select-wrap">
            <LocateFixed aria-hidden="true" className="lead-search-field-icon" />
            <Select id="lead-radius" className="lead-search-select" {...register("radius")}>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={20000}>20 km</option>
              <option value={50000}>50 km</option>
            </Select>
          </div>
        </div>
        <div className="lead-search-field">
          <Label htmlFor="lead-limit" className="lead-search-label">Number of leads</Label>
          <div className="lead-search-select-wrap">
            <Users aria-hidden="true" className="lead-search-field-icon" />
            <Select id="lead-limit" className="lead-search-select" {...register("limit")}>
              <option value={10}>10 leads</option>
              <option value={20}>20 leads</option>
              <option value={40}>40 leads</option>
              <option value={60}>60 leads</option>
              <option value={100}>100 leads</option>
            </Select>
          </div>
        </div>
        <div className="lead-search-field">
          <Label htmlFor="lead-rating" className="lead-search-label">Minimum rating</Label>
          <div className="lead-search-select-wrap">
            <Star aria-hidden="true" className="lead-search-field-icon" />
            <Select id="lead-rating" className="lead-search-select" {...register("minimumRating")}>
              <option value="">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </Select>
          </div>
        </div>
        <div className="lead-search-field">
          <Label htmlFor="lead-website" className="lead-search-label">Website</Label>
          <div className="lead-search-select-wrap">
            <Globe aria-hidden="true" className="lead-search-field-icon" />
            <Select id="lead-website" className="lead-search-select" {...register("website")}>
              <option value="ANY">Any</option>
              <option value="HAS_WEBSITE">Has a website</option>
              <option value="NO_WEBSITE">No website</option>
            </Select>
          </div>
        </div>
      </div>

      {mutation.isError && <p className="lead-search-error" role="alert">{(mutation.error as Error).message}</p>}
      {mutation.isSuccess && <p className="lead-search-success" role="status">Found {mutation.data?.data?.resultCount} leads.</p>}

      <div className="lead-search-form-footer">
        <p>Results are saved to your lead workspace.</p>
        <Button type="submit" disabled={mutation.isPending} className="lead-search-submit">
          {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Search className="w-4 h-4 mr-2" />Find leads</>}
        </Button>
      </div>
    </form>
  );
}
