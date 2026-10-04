"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getExportUrl } from "@/services/leads.service";

export function ExportLeadsButton({ filters }: { filters: Record<string, string | number | undefined> }) {
  const handleExport = () => {
    const url = getExportUrl(filters);
    window.open(url, "_blank");
  };
  return <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>;
}
