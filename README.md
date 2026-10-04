# Google Local Business Lead Generation SaaS MVP

**Monorepo:** `FE` (Next.js 15) + `BE` (Express + Prisma + MySQL)

```
AI-leads/
  FE/  → Next.js frontend (App Router)
  BE/  → Express API (Google Places New, scoring, CSV, MySQL)
```

## Architecture
```
Next.js  --REST--> Express --Prisma--> MySQL
                    └─→ Google Places API (New) [Text Search + Place Details, concurrency=5]
```

## Prereqs
- Node 20+
- MySQL 8+ (`CREATE DATABASE google_leads;`)

## Backend Setup
```bash
cd BE
npm install
cp .env.example .env
# edit DATABASE_URL and GOOGLE_PLACES_API_KEY (or use MOCK_GOOGLE=true)
npx prisma migrate dev --name init
npx prisma generate
npm run dev # http://localhost:5000/api/v1/health
```

## Run Backend and Frontend Together

From the repository root:

```bash
npm run dev
```

This starts the backend at `http://localhost:5000`, the frontend at `http://localhost:3000`, and the automation worker. Press `Ctrl+C` to stop all processes.

## NVIDIA and Automated Outreach

The existing agents use NVIDIA's OpenAI-compatible chat completions API. In `BE/.env`, configure:

```env
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-8b-instruct
```

Keep `OUTREACH_ENABLED=false` while testing. To enable Hunter delivery after connecting and verifying a mailbox:

```env
HUNTER_API_KEY=your_hunter_api_key
HUNTER_EMAIL_ACCOUNT_ID=your_hunter_email_account_id
OUTREACH_ENABLED=true
```

Create campaigns in `DRAFT_ONLY` mode first. `AUTO_SEND` requires outbound configuration, selects only contacts that meet the campaign confidence and verification rules, enforces the daily send limit, records idempotent Hunter events, and can schedule one opt-in follow-up.

Mock mode (no Google key):
```bash
MOCK_GOOGLE=true npm run dev
```

## Telegram lead-search assistant

The Telegram bot supports secure account linking and `/find <business type> | <city>` searches. It sends up to five ranked results from each search. Results are also saved in the signed-in organization's account. Telegram does not send outreach messages or start phone calls.

1. Create a bot with Telegram's `@BotFather` and copy its token and username.
2. For local development, set the bot token and username in `BE/.env` and leave the webhook variables empty. The worker uses Telegram long polling, so local development does not need a public API URL. For deployment, use a public HTTPS API host and configure webhook values in both API and worker environments:

   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_BOT_USERNAME=your_bot_username
   TELEGRAM_WEBHOOK_SECRET=generate_a_random_32_character_or_longer_value
   TELEGRAM_WEBHOOK_URL=https://api.example.com/api/v1/telegram/webhook
   ```

   The webhook secret must contain 32–256 letters, numbers, underscores, or hyphens. Use the same values for the API and worker. Never commit the bot token or webhook secret.
3. Run the database migration and restart both services:

   ```bash
   cd BE
   npx prisma migrate deploy
   npx prisma generate
   npm run build
   ```

   The API registers the Telegram webhook at startup when all webhook settings are present. With webhook settings empty, the worker uses long polling. Keep the worker running to process incoming commands.
4. Sign in to LocalLeads, open **Settings → Telegram assistant**, generate a one-time code, and send `/link <code>` to your bot. The code expires after ten minutes.
5. Try `/find dentists | Pune` or `/help` in the linked Telegram chat.

Each organization can connect one Telegram chat. Only the Telegram account that linked the chat can use search commands. Disconnect it from Settings. A public HTTPS API endpoint is required for Telegram webhooks.

## Frontend Setup
```bash
cd FE
npm install
cp .env.example .env.local
npm run dev # http://localhost:3000
```

## Render deployment (frontend, API, and always-on worker)

This repository includes a Render Blueprint for the Next.js frontend, Express API, and Telegram/automation worker. The database is external: create a TiDB Cloud Starter database and use its Prisma-compatible MySQL connection string with TLS enabled (`sslaccept=strict`). TiDB requires TLS for public endpoints; see [TiDB's Prisma connection guide](https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-prisma/). Do not commit or share the connection string, Telegram bot token, bootstrap password, or Google Places key.

1. Push this project to a private GitHub repository and connect it to Render.
2. Create a TiDB Cloud Starter instance and database. Copy its Prisma-compatible MySQL URL (including `sslaccept=strict`).
3. In Render, create a Blueprint from the repository root using `render.yaml`. Enter the same `DATABASE_URL` for the API and worker, `GOOGLE_PLACES_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (without `@`), `FRONTEND_URL`, `BOOTSTRAP_EMAIL`, and a unique `BOOTSTRAP_PASSWORD` of at least 14 characters as private environment values. `FRONTEND_URL` must be the exact HTTPS URL Render assigns to `ai-leads-frontend` (no trailing slash).
4. The API startup applies checked-in Prisma migrations and creates the first administrator only if that email does not already exist. After the first successful deployment, remove `BOOTSTRAP_PASSWORD` from the API environment and redeploy; the existing account is left unchanged.
5. The worker uses Telegram long polling, so no inbound Telegram webhook URL is required. Keep the worker running to process bot commands and automation jobs. Sign in using `BOOTSTRAP_EMAIL` and the password you chose.

`OUTREACH_ENABLED` is forced off. Automated sending is not enabled by this deployment. Render free web services sleep after inactivity and are intended for previews; the worker requires a paid always-on plan. Render lists the smallest worker plan at about $7/month at the time of writing; confirm current pricing in Render before deploying. The TiDB Starter plan has its own limits and terms.

The app requires authentication in production. Public demo credentials have been removed, and API access is scoped to the signed-in account's organization. Keep the Render and database accounts private.

## API Examples
- `POST /api/v1/leads/search` {keyword, location, radius, limit, minimumRating, website}
- `GET /api/v1/leads?page=1&limit=25&website=NO_WEBSITE&minScore=80`
- `GET /api/v1/leads/:id`
- `GET /api/v1/leads/export?website=NO_WEBSITE&minScore=80` → CSV
- `GET /api/v1/searches` / `GET /api/v1/searches/:id`
- `GET /api/v1/dashboard/stats`

## Workflow
Find Leads → Validate (Zod) → Create LeadSearch → Google Text Search → Normalize → Place Details (concurrency 5) → lead score + opportunities → Prisma upsert (placeId dedupe) → SearchLead relations → return to Next.js → table + filters + CSV.

## Tests
```bash
cd BE
npm test # runs tests/* via tsx --test
# or
npx tsx --test tests/lead-scoring.test.ts
```
