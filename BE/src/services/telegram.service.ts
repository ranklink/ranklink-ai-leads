import { createHash, randomBytes } from "node:crypto";
import { authContext, currentOrganization } from "../auth/context";
import prisma from "../config/database";
import { env } from "../config/env";
import { searchLeadsSchema } from "../validators/lead-search.validator";
import { telegramWebhookUpdateSchema } from "../validators/telegram.validator";
import { searchService } from "./search.service";

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const UPDATE_LEASE_MS = 60 * 1000;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
let telegramPollingDisabledByAuth = false;

function configured() {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_NOT_CONFIGURED");
  return env.TELEGRAM_BOT_TOKEN;
}

async function telegramRequest<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = configured();
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json() as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !result.ok) throw new Error(`TELEGRAM_API_${response.status}`);
  return result.result as T;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  await telegramRequest("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

export async function createTelegramLink() {
  const organizationId = currentOrganization();
  const code = randomBytes(24).toString("base64url");
  await prisma.telegramLinkCode.updateMany({ where: { organizationId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.telegramLinkCode.create({ data: {
    organizationId,
    userId: authContext.getStore()?.userId ?? "unknown",
    codeHash: sha256(code),
    expiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
  } });
  return { code, expiresAt: new Date(Date.now() + CODE_LIFETIME_MS).toISOString(), botUsername: env.TELEGRAM_BOT_USERNAME || null };
}

export async function getTelegramStatus() {
  const connection = await prisma.telegramConnection.findUnique({
    where: { organizationId: currentOrganization() },
    select: { username: true, connectedAt: true },
  });
  return { configured: Boolean(env.TELEGRAM_BOT_TOKEN), botUsername: env.TELEGRAM_BOT_USERNAME || null, connected: Boolean(connection), connection };
}

export async function disconnectTelegram() {
  await prisma.telegramConnection.deleteMany({ where: { organizationId: currentOrganization() } });
  await prisma.telegramLinkCode.updateMany({ where: { organizationId: currentOrganization(), usedAt: null }, data: { usedAt: new Date() } });
}

export async function enqueueTelegramUpdate(payload: unknown) {
  const update = telegramWebhookUpdateSchema.parse(payload);
  await prisma.telegramUpdate.upsert({
    where: { updateId: BigInt(update.update_id) },
    create: { updateId: BigInt(update.update_id), payload: update as object },
    update: {},
  });
}

export async function pollTelegramUpdates() {
  if (!env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_WEBHOOK_URL || telegramPollingDisabledByAuth) return;
  const latest = await prisma.telegramUpdate.findFirst({ orderBy: { updateId: "desc" }, select: { updateId: true } });
  try {
    const updates = await telegramRequest<unknown[]>("getUpdates", {
      ...(latest ? { offset: Number(latest.updateId) + 1 } : {}),
      timeout: 0,
      allowed_updates: ["message"],
    });
    for (const update of updates) await enqueueTelegramUpdate(update);
  } catch (error) {
    if (error instanceof Error && error.message === "TELEGRAM_API_401") {
      telegramPollingDisabledByAuth = true;
      console.error(JSON.stringify({ event: "telegram_auth_failed", action: "replace_TELEGRAM_BOT_TOKEN_and_restart_worker" }));
      return;
    }
    throw error;
  }
}

function messageText(payload: unknown) {
  const parsed = telegramWebhookUpdateSchema.safeParse(payload);
  const message = parsed.success ? parsed.data.message : undefined;
  if (!message?.text) return null;
  return { chatId: String(message.chat.id), senderId: String(message.from?.id ?? message.chat.id), username: message.from?.username, text: message.text.trim() };
}

async function handleCommand(payload: unknown) {
  const incoming = messageText(payload);
  if (!incoming) return;
  const commandToken = incoming.text.split(/\s+/, 1)[0];
  const command = commandToken.toLowerCase().split("@")[0];

  if (command === "/link") {
    const code = incoming.text.slice(commandToken.length).trim();
    if (!/^[A-Za-z0-9_-]{32}$/.test(code)) {
      await sendTelegramMessage(incoming.chatId, "To connect this chat, generate a link code in your app’s Settings, then send /link followed by the code.");
      return;
    }
    const link = await prisma.telegramLinkCode.findUnique({ where: { codeHash: sha256(code) } });
    if (!link || link.usedAt || link.expiresAt < new Date()) {
      await sendTelegramMessage(incoming.chatId, "That link code is invalid or expired. Generate a new one from Settings.");
      return;
    }
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.telegramLinkCode.updateMany({ where: { id: link.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new Error("TELEGRAM_LINK_CODE_USED");
      await tx.telegramConnection.upsert({
        where: { organizationId: link.organizationId },
        create: { organizationId: link.organizationId, chatId: incoming.chatId, telegramUserId: incoming.senderId, username: incoming.username },
        update: { chatId: incoming.chatId, telegramUserId: incoming.senderId, username: incoming.username },
      });
    });
    await sendTelegramMessage(incoming.chatId, "Connected. Send /find <business type> | <city> to discover leads, or /help for commands.");
    return;
  }

  const connection = await prisma.telegramConnection.findUnique({ where: { chatId: incoming.chatId } });
  if (!connection) {
    await sendTelegramMessage(incoming.chatId, "This chat is not connected to a LocalLeads account. Generate a link code from Settings and send /link <code> here.");
    return;
  }
  if (connection.telegramUserId !== incoming.senderId) {
    await sendTelegramMessage(incoming.chatId, "Only the Telegram account that linked this chat can use it.");
    return;
  }
  if (command === "/help" || command === "/start") {
    await sendTelegramMessage(incoming.chatId, "Commands:\n/find <business type> | <city> — find up to 8 local businesses\n/help — show this help\nSearches are saved to your LocalLeads account. Outreach is never sent from Telegram.");
    return;
  }
  if (command !== "/find") {
    await sendTelegramMessage(incoming.chatId, "I can find local businesses. Try /find dentists | Pune. Send /help for details.");
    return;
  }

  const query = incoming.text.slice(commandToken.length).trim();
  const [keyword, location, extra] = query.split("|").map((value) => value.trim());
  const input = searchLeadsSchema.safeParse({ keyword, location, limit: 8 });
  if (!input.success || extra !== undefined) {
    await sendTelegramMessage(incoming.chatId, "Use this format: /find <business type> | <city>\nExample: /find dentists | Pune");
    return;
  }

  await sendTelegramMessage(incoming.chatId, `Searching for ${input.data.keyword} in ${input.data.location}…`);
  await authContext.run({ organizationId: connection.organizationId, userId: "telegram", role: "OPERATOR" }, async () => {
    const results = await searchService.searchLeads(input.data);
    if (!results.leads.length) {
      await sendTelegramMessage(incoming.chatId, `No matching businesses found for ${input.data.keyword} in ${input.data.location}.`);
      return;
    }
    const clip = (value: string, length: number) => value.length > length ? `${value.slice(0, length - 1)}…` : value;
    const lines = results.leads.slice(0, 5).map((lead, index) => {
      const phone = lead.internationalPhone || lead.phone;
      const website = lead.website ? `\n   ${clip(lead.website, 180)}` : "";
      const phoneLine = phone ? `\n   ${clip(phone, 40)}` : "";
      const rating = lead.rating === null ? "No rating" : `⭐ ${lead.rating}`;
      return `${index + 1}. ${clip(lead.name, 120)} — ${rating} · score ${lead.leadScore}${phoneLine}${website}`;
    });
    await sendTelegramMessage(incoming.chatId, `Found ${results.resultCount} businesses (${input.data.keyword}, ${input.data.location}).\n\n${lines.join("\n\n")}\n\nView and review results in LocalLeads. Search ID: ${results.searchId}`);
  });
}

export async function processDueTelegramUpdate() {
  if (!env.TELEGRAM_BOT_TOKEN) return false;
  const now = new Date();
  const candidate = await prisma.telegramUpdate.findFirst({
    where: { availableAt: { lte: now }, OR: [{ status: "QUEUED" }, { status: "PROCESSING", leaseUntil: { lt: now } }] },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return false;
  const claimed = await prisma.telegramUpdate.updateMany({
    where: { id: candidate.id, availableAt: { lte: now }, OR: [{ status: "QUEUED" }, { status: "PROCESSING", leaseUntil: { lt: now } }] },
    data: { status: "PROCESSING", leaseUntil: new Date(Date.now() + UPDATE_LEASE_MS), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return true;
  try {
    await handleCommand(candidate.payload);
    await prisma.telegramUpdate.update({ where: { id: candidate.id }, data: { status: "COMPLETED", leaseUntil: null } });
  } catch (error) {
    const attempts = candidate.attempts + 1;
    await prisma.telegramUpdate.update({ where: { id: candidate.id }, data: {
      status: attempts >= 3 ? "FAILED" : "QUEUED",
      availableAt: new Date(Date.now() + Math.min(300_000, 15_000 * 2 ** (attempts - 1))),
      leaseUntil: null,
    } });
    console.error(JSON.stringify({ event: "telegram_update_failed", updateId: candidate.updateId.toString(), attempt: attempts, errorCode: error instanceof Error ? error.message : "UNKNOWN" }));
  }
  return true;
}

export async function configureTelegramWebhook() {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  if (env.TELEGRAM_WEBHOOK_URL && env.TELEGRAM_WEBHOOK_SECRET) {
    await telegramRequest("setWebhook", { url: env.TELEGRAM_WEBHOOK_URL, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] });
    return;
  }
  await telegramRequest("deleteWebhook", { drop_pending_updates: false });
}
