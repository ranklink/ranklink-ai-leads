export function StatusBadge({ status }: { status: string }) {
  const color = ["ACTIVE", "COMPLETED", "APPROVED", "QUALIFIED"].includes(status) ? "bg-emerald-50 text-emerald-800" : ["FAILED", "ERROR"].includes(status) ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{status.replaceAll("_", " ")}</span>;
}
