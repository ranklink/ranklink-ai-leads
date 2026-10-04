# End-to-End AI Sales Automation Plan

Status: proposed implementation plan. No automation described here has been implemented by creating this document.

## 1. Objective and scope

Extend AI-leads into a system that discovers businesses, researches opportunities, qualifies leads, prepares outreach, executes authorized campaigns, handles replies, schedules follow-ups, books meetings, and reports sales outcomes.

Target workflow:

```text
Business profile + campaign rules
  -> Scheduled discovery -> Deduplication -> Research -> Qualification
  -> Eligible contact -> Personalized draft -> Send authorization
  -> Delivery tracking -> Reply processing -> Qualification conversation
  -> Meeting / proposal -> Won or lost -> Reporting
```

Automate repeatable work with explicit limits. Route uncertainty, unsupported requests, negotiated pricing, and exceptional commitments to a human. AI must not invent business facts or mark a meeting booked without provider confirmation.

Decisions to collect through onboarding before activating campaigns:

- Product/service, approved claims, pricing boundaries, and sender identity.
- Target industries, locations, company criteria, and excluded businesses.
- Email, WhatsApp, or both, with connected business accounts.
- Sending permission rules, daily volume, spending limits, timezone, and working hours.
- Calendar, meeting duration, availability rules, and handoff owner.

These are configuration inputs, not blockers for implementing the foundation. Default every new campaign to draft-only mode.

## 2. Existing foundation

Observed in the repository:

- `FE/`: Next.js App Router, TypeScript, React Query, reusable UI components.
- `BE/`: Express, TypeScript, Zod, Prisma, MySQL.
- `BE/prisma/schema.prisma`: Lead, Review, LeadSearch, SearchLead.
- `BE/src/services/search.service.ts`: synchronous discovery, enrichment, scoring, and persistence.
- Existing scoring, opportunity, personalization, NVIDIA, and Hunter service files.
- `BE/src/controllers/outreach.controller.ts`: draft preview, email verification, and a send operation. Its existence does not establish that live provider sending works.
- `FE/components/leads/OutreachComposer.tsx`: existing outreach UI to extend.
- `WHATSAPP_INTEGRATION_PLAN.md`: channel-specific planning reference.

Reuse this structure. Do not edit generated `BE/dist` files. Validate current integrations against official provider documentation during implementation; this plan does not assert current provider capabilities, pricing, or messaging rules.

## 3. Recommended architecture

Use a modular monolith with a separately deployed worker, rather than introducing microservices immediately.

```text
Next.js dashboard -> Express API -> Prisma / MySQL
                           |              |
                           |       Transactional outbox
                           |              v
                           +------> Queue -> Background worker
                                              |
                                  Workflow coordinator
                                   /       |        \
                              AI tasks  Business rules  Provider adapters

Provider webhooks -> Signature verification -> Durable event inbox -> Worker
```

- MySQL is the source of truth for runs, schedules, messages, permissions, and audit history.
- Proposed queue: Redis with BullMQ, isolated behind a queue adapter. Pin compatible versions after implementation-time verification.
- The coordinator executes versioned state transitions; AI performs bounded research, classification, and drafting tasks.
- Controllers validate requests and delegate to services. Repositories own database access. Integrations own provider communication.
- Use transactional outbox/inbox records to recover from process crashes and duplicate delivery.
- Authenticate users through an established identity provider; validate sessions server-side and enforce organization membership on every operation.
- Store credentials server-side using a secret manager or encrypted credential store; never expose credentials through browser API responses.

### Agent responsibilities

| Task | Inputs | Output | Allowed actions |
| --- | --- | --- | --- |
| Discovery | Campaign targeting | Search requests and lead candidates | Invoke bounded search tools |
| Research | Known lead and permitted public sources | Facts with source URLs, timestamps, and uncertainty | Read-only retrieval |
| Qualification | Evidence and business criteria | Structured decision and reason | Propose lead qualification |
| Outreach | Approved offer and verified facts | Versioned draft | Create drafts |
| Conversation | Thread and approved knowledge | Intent, extracted fields, proposed reply | Draft or use explicitly authorized reply tools |
| Scheduling | Confirmed preferences | Availability options and booking request | Calendar tools within campaign permissions |
| Reporting | Recorded business events | Metrics and explanation | Read-only aggregation |

Shared controls: validated structured output, maximum tool calls, token/cost budgets, timeouts, provenance, prompt versioning, and human handoff. Treat website and message content as untrusted input; it cannot grant tool permissions or override campaign policy.

## 4. Proposed folder structure

```text
BE/
  prisma/schema.prisma
  prisma/migrations/
  src/
    config/                 # Validated environment and provider configuration
    middleware/             # Authentication, organization scope, authorization
    routes/                 # REST endpoints and webhooks
    controllers/            # Request/response handling
    validators/             # Zod request and task output schemas
    services/
      automation/           # Coordinator, transitions, policy, budgets
      campaigns/            # Campaign configuration and enrollment
      contacts/             # Contact permission and suppression
      messaging/            # Drafts, dispatch, follow-ups, conversations
      scheduling/           # Availability and confirmed booking
    agents/                 # Typed AI tasks and versioned prompts
    integrations/           # AI, email, WhatsApp, calendar, website adapters
    repositories/           # Organization-scoped persistence
    jobs/                   # Queue contracts, workers, outbox relay, scheduler
    observability/          # Structured logs, metrics, trace identifiers
    worker.ts               # Separate worker entrypoint
  tests/
FE/
  app/{campaigns,automations,inbox,pipeline,settings}/
  components/{campaigns,automations,inbox,pipeline,settings}/
  services/                 # Typed API clients
  types/                    # API and feature types
docs/
  automation-runbook.md
  provider-setup.md
```

Braced directories above denote separate folders. Keep existing lead/search pages and services, extending them incrementally.

## 5. Database schema blueprint

All organization-owned records require organization scope. Use foreign keys, bounded strings, timestamps, and indexes based on access patterns. Use decimal or integer minor units for money; store currency explicitly. Store operational times in UTC and scheduling timezone as an IANA identifier.

| Entity | Principal fields and constraints |
| --- | --- |
| Organization | id, name, timezone, createdAt, updatedAt |
| User / Membership | External identity subject; membership unique on organizationId + userId; role OWNER, ADMIN, OPERATOR, VIEWER |
| BusinessProfile | organizationId, offer, approved claims, pricing boundaries, qualification rules, version |
| Lead / LeadSearch | Add organizationId; replace global placeId uniqueness with organizationId + placeId uniqueness |
| Contact | organizationId, optional leadId, name; inbound contacts need no Google placeId |
| ContactEndpoint | contactId, organizationId, channel, normalized address, verification status; unique organizationId + channel + address |
| ContactConsentEvent | endpointId, scope, grant/revoke, source, evidence reference, occurredAt; append-only |
| Suppression | organizationId, endpointId, scope, reason; unique endpoint and suppression scope |
| Campaign / CampaignVersion | organizationId, immutable configuration version, targeting, channel, mode, schedule, limits, status |
| CampaignLead | campaignId, leadId, qualification, state; unique campaignId + leadId |
| AutomationRun | organizationId, campaignVersionId, status, start/end, cancellation flag, budget reservation; unique trigger key |
| AutomationStep | runId, lead/contact scope, step key, attempt, status, nextAttemptAt, error code; unique logical step key within run |
| ResearchEvidence | leadId, source URL, extracted fact, fetchedAt, confidence, retention metadata |
| Draft / Approval | Versioned content, evidence references, policy version; approval binds exact draft version and authorizing user |
| ProviderConnection | organizationId, provider, external account ID, credential reference, connection health |
| Conversation / Message | contact endpoint, connection, direction, content, timestamps, provider ID, delivery state; unique outbound idempotency key |
| FollowUp | conversationId, campaign enrollment, dueAt, sequence position, state, cancellation reason |
| WebhookEvent / OutboxEvent | Provider dedupe key or event ID, organization mapping, status, payload reference, attempts, processedAt |
| Deal / Meeting / Proposal | Owner, stage, value/currency; meeting provider ID and booking state; proposal version and approval state |
| UsageLedger / AuditEvent | Provider usage/reservation and attributed cost; actor, action, object, run ID, timestamp |

Index pending work by status + nextAttemptAt/dueAt, conversations by organization + updatedAt, and messages by conversation + createdAt + id. Enforce same-organization relationships with composite keys where practical and repository checks everywhere.

Migration sequence: add nullable ownership fields, create and explicitly assign a legacy organization, backfill and validate counts, add scoped constraints, then make ownership required. Do not delete existing lead data or use schema reset in production. Keep old and new application versions compatible during rollout.

## 6. Proposed API routes

Prefix: `/api/v1`. Preserve existing routes while migrating their internals. All application routes require authentication and organization authorization; webhooks require provider verification instead.

| Method | Route | Purpose |
| --- | --- | --- |
| GET / PUT | `/business-profile` | Read/update targeting and approved offer |
| GET / POST | `/campaigns` | Paginated list / create draft campaign |
| GET / PATCH | `/campaigns/:id` | Inspect / create revised configuration |
| POST | `/campaigns/:id/activate` | Validate configuration and authorize selected automation mode |
| POST | `/campaigns/:id/pause` | Stop new work and prevent queued dispatch |
| POST | `/campaigns/:id/runs` | Enqueue idempotent run; return 202 and run ID |
| GET | `/automation/runs` | Paginated execution history |
| GET | `/automation/runs/:id` | Step progress, evidence, errors, usage |
| POST | `/automation/runs/:id/cancel` | Cancel pending work |
| POST | `/automation/runs/:id/retry` | Retry eligible failed work without repeating completed effects |
| POST | `/drafts/:id/approve` | Approve exact content version |
| POST | `/drafts/:id/send` | Enqueue authorized dispatch with idempotency key |
| GET / POST | `/contacts/:id/consent-events` | Inspect / record permission history |
| POST | `/contacts/:id/suppress` | Stop outbound contact and cancel follow-ups |
| GET | `/conversations` | Paginated shared inbox |
| GET / POST | `/conversations/:id/messages` | Read history / enqueue reply |
| POST | `/conversations/:id/handoff` | Assign human owner and pause automated replies |
| GET / POST | `/conversations/:id/follow-ups` | Inspect / schedule follow-ups |
| DELETE | `/follow-ups/:id` | Cancel pending follow-up |
| GET / POST | `/deals` | Read pipeline / create opportunity |
| PATCH | `/deals/:id` | Update stage with audit history |
| GET | `/calendar/availability` | Fetch available meeting slots |
| POST | `/meetings` | Book a confirmed selected slot |
| POST | `/proposals` | Generate a versioned proposal draft |
| GET / POST | `/integrations` | Connection health / configure provider |
| GET | `/reports/automation` | Funnel, failures, usage, and cost |
| POST | `/webhooks/:provider` | Verify, persist, and acknowledge provider events |

Add provider-specific subscription verification routes where required. Use existing success envelopes consistently; errors expose a stable code, safe message, and request ID. Bound page sizes and validate filters. Mutation authorization must be enforced in services as well as route middleware.

## 7. File-by-file implementation sequence

Each edit group is a reviewable milestone. Complete its acceptance checks before enabling the next capability.

### Edit 01 — Establish the baseline

- Inspect `BE/src/app.ts`, existing routes, repositories, environment examples, and `FE/services/api.ts`.
- Run current backend tests and both builds; record failures before changing behavior.
- Inventory provider adapters and distinguish live operations from mocks and unsupported calls.
- Update `README.md` with actual supported behavior and required dependencies.
- Acceptance: reproducible baseline and no unverified claims about live integrations.

### Edit 02 — Authentication and organization boundaries

- Add authentication, organization, and role middleware under `BE/src/middleware/`.
- Edit `BE/prisma/schema.prisma`; create ownership/membership migrations.
- Edit every repository and controller to scope queries and mutations to the authenticated organization.
- Edit `BE/src/app.ts`, `BE/src/config/env.ts`, `FE/services/api.ts`, and `FE/app/layout.tsx` for validated sessions, exact allowed origins, and authenticated navigation.
- Protect cookie-authenticated mutations against CSRF and configure secure session cookies.
- Acceptance: unauthenticated requests fail and cross-organization reads, writes, exports, and job access are denied.

### Edit 03 — Contacts, permission, and business onboarding

- Add contact, endpoint, consent, suppression, and business-profile models and migrations.
- Add matching repositories, services, validators, controllers, and routes.
- Extend `FE/app/settings/page.tsx` and `FE/components/leads/LeadDetails.tsx`.
- Acceptance: offer and target criteria are saved; permission history is auditable; suppressed endpoints cannot send.

### Edit 04 — Durable jobs and workflow execution

- Add `BE/src/jobs/{queue,outbox-relay,scheduler}.ts`, `BE/src/worker.ts`, and automation services.
- Add run, step, outbox, and usage models. Add worker scripts to `BE/package.json`.
- Refactor `BE/src/services/search.service.ts` into reusable discovery execution plus job submission; update search controllers and frontend polling to handle 202 responses.
- Acceptance: a restart resumes unfinished discovery without duplicate leads or lost work; the HTTP request does not wait for external enrichment.

### Edit 05 — Typed AI research and qualification

- Add provider-neutral AI contracts and tasks under `BE/src/agents/` and `BE/src/integrations/`.
- Reuse `nvidia.service.ts`, `personalization.service.ts`, scoring, and opportunity logic through adapters.
- Add evidence persistence, structured output validation, prompt versions, budgets, and explicit uncertain outcomes.
- For website retrieval, block private/local destinations and revalidate redirects; limit size, content types, and timeouts.
- Acceptance: unsupported facts are omitted; malformed output and malicious page instructions cannot trigger actions.

### Edit 06 — Campaign configuration and run dashboard

- Add campaign/version/enrollment schema and `campaigns` services, routes, and validators.
- Add `FE/app/campaigns/page.tsx`, `FE/app/campaigns/[id]/page.tsx`, and `FE/app/automations/page.tsx`.
- Add focused campaign forms, run timelines, typed clients, and loading/empty/error/success states.
- Acceptance: a user can save targeting, preview a draft-only run, inspect qualification reasons, and pause execution.

### Edit 07 — Draft approval and reliable outbound email

- Refactor `BE/src/controllers/outreach.controller.ts` to use persistent drafts and queued messaging services.
- Wrap `hunter.service.ts` behind a verified email adapter; select another provider if required delivery or inbound capabilities are unavailable.
- Extend `FE/components/leads/OutreachComposer.tsx` with saved versions, review status, and delivery state.
- Recheck campaign authorization, suppression, recipient eligibility, exact draft approval, and budgets immediately before dispatch.
- Acceptance: duplicate clicks/retries cannot silently send duplicates; edits invalidate previous draft approval; ambiguous provider outcomes require reconciliation.

### Edit 08 — Webhooks and shared inbox

- Add provider webhook routes with raw-body signature verification where required, durable ingestion, and deduplication.
- Add conversation/message repositories and event processors; update message state without regression from late events.
- Add `FE/app/inbox/page.tsx`, conversation components, and typed inbox services.
- Acceptance: duplicate and out-of-order events are safe; inbound replies stop pending follow-ups and appear against the correct contact.

### Edit 09 — Follow-ups and bounded automated replies

- Add follow-up scheduling, cancellation, reply classification, and human handoff services.
- Add campaign controls for working hours, sequence length, minimum delays, reply permissions, and daily caps.
- Serialize dispatch and cancellation per conversation; document that messages already accepted by a provider cannot be recalled reliably.
- Acceptance: opt-out, reply, pause, or handoff prevents subsequent queued sends; uncertain intent is routed to a human.

### Edit 10 — WhatsApp channel

- Implement adapters, templates, connection settings, webhook processing, and inbox channel support using `WHATSAPP_INTEGRATION_PLAN.md` as the feature reference.
- Verify current official onboarding, permission, template, and reply eligibility requirements before implementing channel policies.
- Reuse contacts, runs, messages, follow-ups, and suppression rather than creating parallel channel-specific business logic.
- Acceptance: official test account completes inbound/outbound flow; ineligible messages are blocked at dispatch time.

### Edit 11 — Meetings, proposals, and pipeline

- Add scheduling adapters and services, meeting/deal/proposal schema, routes, and validators.
- Add `FE/app/pipeline/page.tsx` and deal timelines; expose scheduling within the inbox.
- Require a selected slot, attendee confirmation, availability recheck, and provider-confirmed booking. Reconcile ambiguous booking attempts before retrying.
- Generate proposals only from approved offer/pricing data; keep negotiated terms under human control.
- Acceptance: conflicts, timezone conversion, retries, cancellation, and rescheduling behave correctly; no false booking confirmation.

### Edit 12 — Reporting and production rollout

- Extend dashboard controller/services and `FE/components/dashboard/DashboardStats.tsx`.
- Add usage ledger aggregation, campaign funnel reporting, failure alerts, queue health, and audit views.
- Add `docs/automation-runbook.md`, `docs/provider-setup.md`, worker deployment configuration, and CI checks.
- Acceptance: staging end-to-end tests pass; backup restoration and worker restart recovery are demonstrated; a limited authorized pilot stays within configured caps.

## 8. Reliability and automation policy

- Run states: QUEUED -> RUNNING -> WAITING_APPROVAL / WAITING_EXTERNAL -> COMPLETED; also FAILED and CANCELLED. Track campaign pause separately.
- Persist every transition with optimistic concurrency/version checks. Completed external effects are not repeated by a generic run retry.
- Use bounded retries with exponential backoff and jitter for transient errors. Permanent validation/permission errors do not retry.
- Queue execution is at-least-once. Use stable idempotency keys, unique database constraints, and provider idempotency when available. Do not promise exactly-once external delivery.
- When a timeout leaves provider acceptance unknown, mark the attempt UNKNOWN and reconcile it before another send.
- Reserve budget atomically before provider calls and settle actual usage afterward. Enforce per-organization concurrency and rate limits.
- Recheck permission, suppression, authorization, and cancellation at dispatch, including after delayed jobs wake up.
- Separate modes: DRAFT_ONLY, REVIEW_BEFORE_SEND, and AUTHORIZED_AUTOMATION. Activation records the user's scope, limits, and configuration version.
- Disable automated replies during human handoff. Provide organization and campaign pause controls with audit records.
- Limit retention of message bodies and research data; redact sensitive content and credentials in logs.

## 9. Setup commands and environment plan

Existing baseline commands, run in separate terminals where needed:

```powershell
cd BE
npm install
npx prisma generate
npm test
npm run build
npm run dev
```

```powershell
cd FE
npm install
npm run build
npm run dev
```

Use `npm ci` in CI once a matching lockfile is verified. A configured MySQL database and backend/frontend environment files are required. Never overwrite an existing environment file when preparing local setup.

Planned commands to add during Edit 04, not available yet:

```text
npm run worker:dev
npm run worker:start
```

Environment template to introduce during implementation; angle-bracket values must be replaced locally, and provider-specific names finalized with the selected adapters:

```dotenv
# Backend: existing configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=mysql://<user>:<password>@localhost:3306/google_leads
GOOGLE_PLACES_API_KEY=
AI_PROVIDER=template
NVIDIA_API_KEY=
HUNTER_API_KEY=
HUNTER_EMAIL_ACCOUNT_ID=
OUTREACH_SENDER_NAME=
OUTREACH_SENDER_EMAIL=
OUTREACH_REPLY_TO=

# Proposed backend/worker configuration
REDIS_URL=redis://localhost:6379
AUTH_ISSUER=
AUTH_AUDIENCE=
SECRET_STORE_REFERENCE=
AUTOMATION_DEFAULT_MODE=DRAFT_ONLY
AUTOMATION_ENABLED=false
WORKER_CONCURRENCY=2

# Frontend only
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

Per-organization budgets, channels, credentials references, and campaign limits belong in persisted configuration. Startup validation must reject enabled integrations with missing credentials. Mock providers must be explicit and must never report a simulated send as real delivery.

## 10. Testing steps

1. Baseline: backend tests and both TypeScript production builds.
2. Unit: transition rules, eligibility, suppression, structured AI validation, budgets, timezone schedules, and retry classification.
3. Database/queue integration: real isolated MySQL and Redis; ownership constraints, outbox recovery, worker crashes, and duplicate jobs.
4. Provider contracts: recorded sanitized fixtures plus provider sandbox tests for signatures, retries, rate limits, delivery status, and booking conflicts.
5. Browser end-to-end: configure business -> create draft campaign -> discover -> review -> authorized test send -> receive reply -> stop follow-up -> book test meeting -> view report.
6. Security: cross-organization access, CSRF where applicable, webhook spoofing/replay, SSRF, stored XSS, prompt injection, secret redaction.
7. Operational: crash after provider acceptance, unavailable queue, unavailable AI provider, exhausted budget, stale approval, expired credentials, and restore from backup.
8. Accessibility/responsiveness: keyboard navigation, form errors, mobile layouts, and readable status updates.

Tests use controlled recipients and calendars. Live customer outreach requires a configured and explicitly activated campaign.

## 11. Deployment notes

- Deploy frontend, API, and worker independently; keep MySQL and Redis on private networks.
- Extend the existing backend Docker setup for a worker process. Use the same application release for API and workers during schema transitions.
- Run reviewed additive migrations once with `npx prisma migrate deploy`; never run development migrations or reset against production.
- Configure HTTPS, exact frontend origin, verified webhook endpoints, secret injection, readiness/liveness checks, graceful worker shutdown, and structured logs.
- Monitor queue age, failed/unknown sends, webhook lag, agent failures, provider cost, and campaign conversion using recorded events.
- Roll out in order: draft-only internal use -> controlled test recipients -> limited authorized campaign -> broader activation after measured results.
- Rollback: pause campaigns, stop new dispatch, drain or park jobs safely, revert compatible application code, and reconcile provider outcomes. Do not blindly undo data migrations or replay outbound work.

## 12. Completion checklist

- [ ] Existing searches, lead views, and exports still work with organization isolation.
- [ ] Scheduled discovery runs recover after restarts.
- [ ] Research and drafts expose evidence and uncertainty.
- [ ] Campaign activation and limits govern all external actions.
- [ ] Outreach, delivery events, replies, and follow-ups are persisted and auditable.
- [ ] Replies, suppression, handoff, and pause stop future automated contact.
- [ ] Email and WhatsApp are enabled only when their configured adapters pass channel tests.
- [ ] Meetings are confirmed by the calendar provider; proposals use approved terms.
- [ ] Pipeline, reporting, cost limits, alerts, backups, and recovery are verified.
- [ ] README, environment examples, setup instructions, and runbooks match the delivered code.

First implementation milestone: Edits 01–06, delivering authenticated, recoverable discovery and qualification with a draft-only campaign dashboard. Complete Edits 07–12 to deliver the full authorized sales automation workflow.
