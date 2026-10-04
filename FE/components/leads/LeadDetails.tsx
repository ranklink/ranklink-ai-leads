"use client";
import { Lead } from "@/types/lead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadScore } from "./LeadScore";
import { OpportunityBadge } from "./OpportunityBadge";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Globe, Star, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewsList } from "./ReviewsList";
import { OutreachComposer } from "./OutreachComposer";

export function LeadDetails({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{lead.name}</CardTitle>
              <p className="text-muted-foreground text-sm">{lead.category || lead.primaryType || "Business"} • {lead.address || "No address"}</p>
            </div>
            <LeadScore score={lead.leadScore} />
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> <span className="text-sm"><strong>{lead.rating ?? "-"}</strong> / 5 • {lead.reviewCount} Google Reviews</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> <span className="text-sm">{lead.address || "No address"}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> <span className="text-sm">{lead.phone || "No phone"} {lead.internationalPhone && `(${lead.internationalPhone})`}</span></div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              {lead.website ? <a href={lead.website} target="_blank" className="text-sm text-primary underline flex items-center gap-1">{lead.website} <ExternalLink className="w-3 h-3" /></a> : <span className="text-sm text-red-500">No website found</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Business Status:</span> <Badge variant="outline">{lead.businessStatus || "Unknown"}</Badge>
            </div>
            {lead.googleMapsUrl && <a href={lead.googleMapsUrl} target="_blank"><Button variant="outline" size="sm"><MapPin className="w-4 h-4 mr-2" />Open Google Maps</Button></a>}
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Opportunities</h4>
            <div className="flex flex-wrap gap-2">
              {lead.opportunities?.map((o, i) => <OpportunityBadge key={i} type={o.type} label={o.label} />)}
              {(!lead.opportunities || lead.opportunities.length === 0) && <span className="text-sm text-muted-foreground">No specific opportunities detected</span>}
            </div>
            <p className="text-xs text-muted-foreground pt-2">Lead Score: {lead.leadScore}/100 • {lead.leadScore >= 80 ? "HOT" : lead.leadScore >= 60 ? "GOOD" : "Warm"}</p>
          </div>
        </CardContent>
      </Card>

      <ReviewsList reviews={lead.reviews || []} />
      <OutreachComposer lead={lead} />
    </div>
  );
}
