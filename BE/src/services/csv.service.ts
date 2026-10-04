import { leadsToCsv } from "../utils/csv";

export function generateLeadsCsv(leads: any[]): string {
  return leadsToCsv(leads);
}
