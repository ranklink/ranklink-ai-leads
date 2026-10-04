import { API_URL, authenticatedFetch as fetch } from "./api";

export async function getSearches(page = 1, limit = 20) {
  const res = await fetch(`${API_URL}/searches?page=${page}&limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch searches");
  return data;
}

export async function getSearchById(id: string) {
  const res = await fetch(`${API_URL}/searches/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Search not found");
  return data;
}
