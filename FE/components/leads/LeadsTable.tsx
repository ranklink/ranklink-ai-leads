"use client";
import Link from "next/link";
import { Lead } from "@/types/lead";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadScore } from "./LeadScore";
import { OpportunityBadge } from "./OpportunityBadge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye } from "lucide-react";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return <p className="text-center py-12 text-muted-foreground">No leads found. Try adjusting filters or run a new search.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Reviews</TableHead>
          <TableHead>Website</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Opportunity</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell className="font-medium max-w-[180px] truncate" title={lead.name}>{lead.name}</TableCell>
            <TableCell className="text-xs">{lead.category || "-"}</TableCell>
            <TableCell className="text-xs max-w-[180px] truncate" title={lead.address || ""}>{lead.address || "-"}</TableCell>
            <TableCell>{lead.rating ?? "-"}</TableCell>
            <TableCell>{lead.reviewCount}</TableCell>
            <TableCell>
              {lead.website ? (
                <a href={lead.website} target="_blank" rel="noopener" className="text-primary flex items-center gap-1 text-xs">
                  Available <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-red-500 text-xs font-medium">No website</span>
              )}
            </TableCell>
            <TableCell className="text-xs">{lead.phone || "-"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1 max-w-[180px]">
                {lead.opportunities?.slice(0, 2).map((o, i) => (
                  <OpportunityBadge key={i} label={o.label} type={o.type} />
                )) || lead.opportunitySummary}
              </div>
            </TableCell>
            <TableCell><LeadScore score={lead.leadScore} /></TableCell>
            <TableCell>
              <Link href={`/leads/${lead.id}`}>
                <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
