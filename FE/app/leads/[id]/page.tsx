"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getLeadById } from "@/services/leads.service";
import { LeadDetails } from "@/components/leads/LeadDetails";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLeadById(id),
  });

  if (isLoading) return <p>Loading lead...</p>;
  if (isError) return <p className="text-red-500">Failed to load lead.</p>;
  if (!data) return null;

  return (
    <div>
      <LeadDetails lead={data.data} />
    </div>
  );
}
