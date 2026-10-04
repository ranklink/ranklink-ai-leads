import { cn } from "@/lib/utils";

export function LeadScore({ score }: { score: number }) {
  const label = score >= 80 ? "Hot" : score >= 60 ? "Good" : score >= 40 ? "Warm" : "Low";
  const color = score >= 80 ? "bg-red-500 text-white" : score >= 60 ? "bg-orange-500 text-white" : score >= 40 ? "bg-yellow-500 text-white" : "bg-gray-300 text-gray-700";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold", color)}>{score}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
