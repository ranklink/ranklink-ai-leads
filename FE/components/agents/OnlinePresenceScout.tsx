import { AlertCircle, CheckCircle2, Globe, Instagram } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/types/lead";

export function OnlinePresenceScout({ lead }: { lead: Lead }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Online Presence Scout</CardTitle>
        <p className="text-sm text-muted-foreground">Checks the business details available from its Google Places listing.</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-lg border p-3">
          {lead.website ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
          <div>
            <p className="text-sm font-medium">Website</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">{lead.website ? `Listed: ${lead.website}` : "No website is listed on Google Places. This may be a website opportunity; confirm with the business before outreach."}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border p-3">
          <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Social profiles</p>
            <p className="mt-1 text-sm text-muted-foreground">Unknown. Social profile data is not connected, so this agent cannot determine whether the business is active on social media.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
