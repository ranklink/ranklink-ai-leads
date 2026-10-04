import { API_URL, authenticatedFetch as fetch } from "./api";

export async function getDashboardStats() {
  const res = await fetch(`${API_URL}/dashboard/stats`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch stats");
  return data;
}
