import { Badge } from "@/components/ui/badge";

const colorMap: Record<string, string> = {
  NO_WEBSITE: "bg-red-50 text-red-700 border-red-200",
  LOW_REVIEW_COUNT: "bg-amber-50 text-amber-700 border-amber-200",
  REPUTATION_OPPORTUNITY: "bg-purple-50 text-purple-700 border-purple-200",
  PHONE_AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  STRONG_LOCAL_PRESENCE: "bg-blue-50 text-blue-700 border-blue-200",
};

export function OpportunityBadge({ label, type }: { label: string; type: string }) {
  return <Badge className={colorMap[type] || ""}>{label}</Badge>;
}
