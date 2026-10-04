# Lead Generation Backend (Express + Prisma + MySQL)

## Setup
```bash
npm install
cp .env.example .env # edit GOOGLE_PLACES_API_KEY
# create MySQL DB
# CREATE DATABASE google_leads;
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

The repository root command also starts the worker:

```bash
cd ..
npm run dev
```

For NVIDIA-backed agents, set `AI_PROVIDER=nvidia`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, and `NVIDIA_MODEL` in `BE/.env`. Keep `OUTREACH_ENABLED=false` until the Hunter mailbox and campaign policy are verified. Campaigns default to `DRAFT_ONLY`; `AUTO_SEND` is opt-in and requires Hunter credentials plus `OUTREACH_ENABLED=true`.

## Mock mode (no API key)
```bash
MOCK_GOOGLE=true npm run dev
```

Runs on http://localhost:5000/api/v1
