import { Prisma, type AgentJob } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/database";
import { env } from "../../config/env";

const providerResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1).max(100_000) }) })).min(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().optional(), completion_tokens: z.number().int().nonnegative().optional() }).optional(),
});

export interface StructuredAgentSpec<TInput, TOutput> {
  promptVersion: string;
  systemPrompt: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  fallback(input: TInput): TOutput;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function errorCode(error: unknown): string {
  if (error instanceof z.ZodError) return "AGENT_SCHEMA_INVALID";
  if (error instanceof SyntaxError) return "AGENT_JSON_INVALID";
  if (error instanceof Error && /^AI_HTTP_\d+$/.test(error.message)) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") return "AI_TIMEOUT";
  return "AGENT_EXECUTION_FAILED";
}

export async function executeStructuredAgent<TInput, TOutput>(
  job: AgentJob,
  rawInput: unknown,
  spec: StructuredAgentSpec<TInput, TOutput>,
): Promise<TOutput> {
  const input = spec.inputSchema.parse(rawInput);
  const startedAt = Date.now();
  let model = "rules";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    let output: TOutput;
    if (env.AI_PROVIDER === "nvidia" && env.NVIDIA_API_KEY) {
      model = env.NVIDIA_MODEL;
      const response = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(45_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.NVIDIA_API_KEY}` },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1800,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: spec.systemPrompt },
            { role: "user", content: JSON.stringify(input) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
      const payload = providerResponseSchema.parse(await response.json());
      inputTokens = payload.usage?.prompt_tokens;
      outputTokens = payload.usage?.completion_tokens;
      output = spec.outputSchema.parse(parseJson(payload.choices[0].message.content));
    } else {
      output = spec.outputSchema.parse(spec.fallback(input));
    }

    await prisma.agentRun.create({
      data: {
        jobId: job.id,
        status: "SUCCEEDED",
        model,
        promptVersion: spec.promptVersion,
        inputJson: json(input),
        outputJson: json(output),
        latencyMs: Date.now() - startedAt,
        inputTokens,
        outputTokens,
      },
    });
    return output;
  } catch (error) {
    await prisma.agentRun.create({
      data: {
        jobId: job.id,
        status: "FAILED",
        model,
        promptVersion: spec.promptVersion,
        inputJson: json(input),
        latencyMs: Date.now() - startedAt,
        inputTokens,
        outputTokens,
        errorCode: errorCode(error),
      },
    });
    throw error;
  }
}

