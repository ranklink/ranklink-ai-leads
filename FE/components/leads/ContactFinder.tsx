"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { enrichLeadContacts } from "@/services/leads.service";
import type { Lead } from "@/types/lead";

export function ContactFinder({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient();
  const enrichment = useMutation({
    mutationFn: () => enrichLeadContacts(lead.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead", lead.id] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Company contacts</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Search Hunter.io for publicly listed professional emails at this company domain.</p>
        </div>
        <Button onClick={() => enrichment.mutate()} disabled={!lead.website || enrichment.isPending}>
          <Search className="mr-2 h-4 w-4" />{enrichment.isPending ? "Searching…" : "Find contacts"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!lead.website && <p className="text-sm text-muted-foreground">Add a company website before searching for contacts.</p>}
        {enrichment.isError && <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive" role="alert">{enrichment.error instanceof Error ? enrichment.error.message : "Could not find contacts. Please try again."}</p>}
        {enrichment.isSuccess && enrichment.data.found === 0 && <p className="text-sm text-muted-foreground" role="status">Hunter did not find contacts for {enrichment.data.domain}. You can try again later.</p>}
        {lead.contacts?.length ? (
          <ul className="divide-y rounded-md border" aria-label="Company contacts found through Hunter">
            {lead.contacts.map((contact) => (
              <li key={contact.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{contact.name || contact.email}</p>
                  {contact.name && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail size={14} />{contact.email}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{contact.role || "Role not provided"} · {contact.source} · {Math.round(contact.confidence * 100)}% confidence{contact.verificationStatus ? ` · ${contact.verificationStatus}` : ""}</p>
                </div>
                <a className="text-sm font-medium text-primary underline" href={`mailto:${encodeURIComponent(contact.email)}`}>Email contact</a>
              </li>
            ))}
          </ul>
        ) : !enrichment.isSuccess && <p className="text-sm text-muted-foreground">No contacts saved yet. Search the company domain to look for contact details.</p>}
        <p className="text-xs text-muted-foreground">A provider API request may use your Hunter plan credits. Results are saved to this workspace.</p>
      </CardContent>
    </Card>
  );
}
