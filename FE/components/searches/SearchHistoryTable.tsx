"use client";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { LeadSearch } from "@/types/search";

export function SearchHistoryTable({ searches }: { searches: LeadSearch[] }) {
  if (!searches.length) return <p className="text-center py-8 text-muted-foreground">No searches yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Found</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {searches.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.keyword}</TableCell>
            <TableCell>{s.location}</TableCell>
            <TableCell>{s.requestedCount}</TableCell>
            <TableCell>{s.resultCount}</TableCell>
            <TableCell><Badge variant="outline" className={s.status === "COMPLETED" ? "bg-green-50 text-green-700" : s.status === "FAILED" ? "bg-red-50 text-red-700" : ""}>{s.status}</Badge></TableCell>
            <TableCell className="text-xs">{new Date(s.createdAt).toLocaleString()}</TableCell>
            <TableCell>
              <Link href={`/searches/${s.id}`}><Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button></Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
