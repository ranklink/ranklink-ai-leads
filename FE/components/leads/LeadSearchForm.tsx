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
import { Loader2, Search } from "lucide-react";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
      <h2 className="text-xl font-semibold">Find Local Business Leads</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Business / Keyword</Label>
          <Input placeholder="Dentist" {...register("keyword")} />
          {errors.keyword && <p className="text-xs text-red-500">{errors.keyword.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input placeholder="Bengaluru, Karnataka" {...register("location")} />
          {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Radius</Label>
          <Select {...register("radius")}>
            <option value={5000}>5 KM</option>
            <option value={10000}>10 KM</option>
            <option value={20000}>20 KM</option>
            <option value={50000}>50 KM</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Number of Leads</Label>
          <Select {...register("limit")}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={60}>60</option>
            <option value={100}>100</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Minimum Rating</Label>
          <Select {...register("minimumRating")}>
            <option value="">Any</option>
            <option value="3">3+</option>
            <option value="3.5">3.5+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2 max-w-xs">
        <Label>Website</Label>
        <Select {...register("website")}>
          <option value="ANY">Any</option>
          <option value="HAS_WEBSITE">Has Website</option>
          <option value="NO_WEBSITE">No Website</option>
        </Select>
      </div>

      {mutation.isError && <p className="text-sm text-red-500">{(mutation.error as Error).message}</p>}
      {mutation.isSuccess && <p className="text-sm text-green-600">Found {mutation.data?.data?.resultCount} leads!</p>}

      <Button type="submit" disabled={mutation.isPending} className="w-full md:w-auto">
        {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><Search className="w-4 h-4 mr-2" />Find Leads</>}
      </Button>
    </form>
  );
}
