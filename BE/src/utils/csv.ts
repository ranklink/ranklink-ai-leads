function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function leadsToCsv(leads: any[]): string {
  const headers = [
    "Business Name",
    "Category",
    "Address",
    "Phone",
    "Website",
    "Google Rating",
    "Review Count",
    "Google Maps URL",
    "Business Status",
    "Lead Score",
    "Opportunity",
    "Date Discovered",
  ];

  const rows = leads.map((lead) => {
    const opportunities = lead.opportunitySummary || "";
    return [
      escapeCsv(lead.name),
      escapeCsv(lead.category),
      escapeCsv(lead.address),
      escapeCsv(lead.phone),
      escapeCsv(lead.website),
      escapeCsv(lead.rating),
      escapeCsv(lead.reviewCount),
      escapeCsv(lead.googleMapsUrl),
      escapeCsv(lead.businessStatus),
      escapeCsv(lead.leadScore),
      escapeCsv(opportunities),
      escapeCsv(lead.createdAt ? new Date(lead.createdAt).toISOString().split("T")[0] : ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
