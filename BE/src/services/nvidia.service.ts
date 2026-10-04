import { env } from "../config/env";
import { EmailDraft } from "./personalization.service";

interface NvidiaResponse { choices?: Array<{ message?: { content?: string } }> }

function extractJson(content: string): { subject: string; body: string } | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.subject === "string" && typeof parsed.body === "string") return parsed;
  } catch { /* fall back to the deterministic draft */ }
  return null;
}

export async function rewriteWithNvidia(draft: EmailDraft, leadName: string): Promise<EmailDraft> {
  if (env.AI_PROVIDER !== "nvidia" || !env.NVIDIA_API_KEY) return draft;

  const response = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NVIDIA_API_KEY}` },
    body: JSON.stringify({
      model: env.NVIDIA_MODEL,
      temperature: 0.35,
      max_tokens: 350,
      messages: [
        { role: "system", content: "You write concise, respectful B2B cold emails. Never invent facts. Return JSON only with subject and body." },
        { role: "user", content: `Rewrite this draft for ${leadName}. Preserve every factual claim and the opt-out sentence. Use plain text, under 120 words, one question CTA, no hype.\n\nReturn exactly: {"subject":"...","body":"..."}\n\n${draft.body}` },
      ],
    }),
  });
  if (!response.ok) return draft;
  const payload = await response.json() as NvidiaResponse;
  const rewritten = extractJson(payload.choices?.[0]?.message?.content || "");
  return rewritten ? { ...draft, ...rewritten, source: "nvidia" } : draft;
}
