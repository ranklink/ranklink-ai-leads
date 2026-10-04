# WhatsApp Business Integration Plan

## Purpose

Extend AI-leads from local business discovery into a sales workflow that manages WhatsApp conversations, qualification, proposals, and conversions.

This document describes proposed features, not functionality that is already implemented.

## Existing Project

- Frontend: Next.js and TypeScript.
- Backend: Express and TypeScript.
- Database: MySQL with Prisma.
- Current capabilities: Google Places search, lead scoring, opportunity identification, lead filtering, and CSV export.

## Proposed Features

| Feature | Project behavior |
| --- | --- |
| WhatsApp action on a lead | Open WhatsApp with a prepared message for a contact who has agreed to receive it. Opening a chat does not confirm delivery. |
| Shared inbox | Read and reply from the dashboard, with conversations linked to lead records. |
| AI message drafts | Suggest messages using verified lead details and detected opportunities; let the salesperson review before sending. |
| Lead qualification | Collect requirements, budget, and timeline and save them against the lead. |
| Sales pipeline | Track New, Contacted, Replied, Qualified, Proposal Sent, Won, and Lost. |
| Scheduled follow-ups | Send eligible follow-ups and cancel pending outreach when the recipient replies or opts out. |
| Proposal sharing | Send quotations, brochures, portfolio links, and documents. |
| Meeting booking | Collect preferred appointment times and integrate with a calendar. |
| Inbound lead capture | Create or associate leads from website enquiries, QR codes, and click-to-WhatsApp ads. |
| Campaign reporting | Track available delivery/read events, replies, qualification, meetings, and conversions. Read status may not always be available. |

## Platform and Messaging Requirements

Use the official WhatsApp Business Platform / Cloud API for dashboard messaging and automation. A WhatsApp Business mobile app account alone does not provide this integration. Confirm the existing number's onboarding or coexistence eligibility during setup.

- A public phone number found on Google Maps is not permission to send WhatsApp marketing.
- Record recipient permission, including its source, timestamp, and scope, before outbound outreach.
- Honor opt-outs immediately and cancel pending messages.
- Initiate API conversations using approved message templates.
- Free-form replies are permitted within 24 hours of the recipient's last message; outside that window, use approved templates.
- Provide a clear route to a human when using automated responses.
- Do not assume a Google Places phone number belongs to a WhatsApp account.
- Verify current pricing, template availability, account limits, and onboarding requirements before launch.

Sources: [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/), [Business Platform](https://whatsappbusiness.com/products/business-platform/), and [WhatsApp Flows](https://whatsappbusiness.com/products/whatsapp-flows/).

## Recommended First Version

1. WhatsApp connection settings and connection health.
2. Consent status, source, and history on each lead/contact.
3. Shared inbox linked to leads.
4. Approved-template sending and AI-assisted reply drafts.
5. Sales stages and follow-up reminders.

Start with human-reviewed sending. Add scheduled outbound messaging after webhook processing, consent enforcement, and cancellation behavior are reliable.

## Recommended Architecture

```text
Next.js dashboard
        |
        v
Express API -----> Prisma / MySQL
        |
        +--------> WhatsApp Cloud API
        |
        +--------> Background queue and worker

WhatsApp webhooks --> Verified webhook endpoint
                            |
                            v
                    Durable event processing
                            |
                            v
                    Messages and lead activity
```

- Keep UI, API controllers, business services, repositories, and validation separate.
- Keep provider credentials on the backend and out of browser responses and logs.
- Protect settings, conversations, and messaging routes with authentication and appropriate roles.
- For multiple customer businesses, scope every record and operation to its owning organization.
- Verify webhook signatures, deduplicate events, and handle retries and out-of-order delivery statuses.
- Recheck consent, template status, and the reply window immediately before sending.
- Use a durable queue for scheduled sends, retries, and webhook processing.
- Treat AI output as a draft; do not invent claims about businesses, prices, or services.

## Proposed Folder Structure

Adapt these additions to the existing project conventions:

```text
FE/
  app/whatsapp/
  components/whatsapp/
  services/whatsapp.service.ts
  types/whatsapp.ts

BE/
  src/
    routes/whatsapp.routes.ts
    controllers/whatsapp.controller.ts
    services/whatsapp/
    repositories/whatsapp/
    validators/whatsapp.validator.ts
    integrations/whatsapp/
    jobs/whatsapp/
```

## Proposed Database Additions

These are conceptual entities; finalize the Prisma schema before implementation.

| Entity | Purpose and principal fields |
| --- | --- |
| WhatsAppConnection | Owning organization, provider business account ID, phone number ID, display number, connection status, secure credential reference. |
| Contact | Owning organization, normalized phone number, name, optional lead association. Supports inbound enquiries without a Google Place ID. |
| ContactConsentEvent | Contact, grant/revoke action, scope, source, evidence reference, occurrence timestamp. Preserve consent history. |
| Conversation | Connection, contact, assigned user, status, last inbound message timestamp. |
| Message | Conversation, provider message ID, direction, message type, content or media reference, template reference, delivery status, timestamps. |
| MessageTemplate | Connection, provider template ID, name, language, category, approval status, synchronized definition. |
| FollowUp | Conversation, scheduled time, template or reminder details, status, cancellation reason. |
| LeadActivity | Lead/contact, actor, activity type, stage changes, timestamp. |
| WebhookEvent | Deduplication key, event type, processing status, received/processed timestamps, retention-controlled payload. |

Add created/updated timestamps where relevant, foreign keys, organization-scoped contact uniqueness, unique provider identifiers where appropriate, and indexes for conversation history and pending jobs. Define retention and access controls for message content.

## Proposed API Routes

All application routes require authorization; provider webhook routes use verification and signature checks instead of user-session authentication.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/whatsapp/connection` | Read connection status without exposing credentials. |
| POST | `/api/v1/whatsapp/connection` | Configure an authorized business connection. |
| GET | `/api/v1/whatsapp/templates` | List available templates and approval status. |
| GET | `/api/v1/whatsapp/conversations` | List conversations with pagination. |
| GET | `/api/v1/whatsapp/conversations/:id/messages` | Fetch paginated message history. |
| POST | `/api/v1/whatsapp/conversations/:id/messages` | Validate eligibility and send a message. |
| POST | `/api/v1/whatsapp/conversations/:id/drafts` | Generate a draft for review. |
| POST | `/api/v1/contacts/:id/consent-events` | Record consent or withdrawal. |
| PATCH | `/api/v1/leads/:id/stage` | Update the sales stage. |
| POST | `/api/v1/whatsapp/conversations/:id/follow-ups` | Schedule a reminder or eligible follow-up. |
| DELETE | `/api/v1/whatsapp/follow-ups/:id` | Cancel a pending follow-up. |
| GET | `/api/v1/webhooks/whatsapp` | Handle provider subscription verification. |
| POST | `/api/v1/webhooks/whatsapp` | Receive and verify inbound messages and status events. |

## Implementation Phases

### Phase 1: Foundation

- Confirm account/number onboarding and configure server-side credentials.
- Establish authentication, authorization, and organization ownership where needed.
- Add database migrations, connection settings, and consent tracking.
- Implement verified, durable webhook ingestion.

### Phase 2: Inbox and Sales Workflow

- Build paginated conversations and message history.
- Support approved templates and eligible free-form replies.
- Add delivery status, errors, lead stages, and manual follow-up reminders.
- Add AI drafts with explicit salesperson review.

### Phase 3: Automation

- Introduce scheduled sends with eligibility rechecks and cancellation.
- Add structured qualification and human handoff.
- Add document sharing, booking integrations, and conversion reporting.

## Validation and Launch Checklist

- Verify signature rejection, duplicate webhook handling, and event ordering.
- Test consent withdrawal, recipient replies, expired reply windows, and unapproved templates.
- Test authorization and cross-organization access denial where applicable.
- Verify retries cannot silently produce duplicate outbound messages; reconcile ambiguous provider outcomes.
- Verify loading, empty, error, and success states in the dashboard.
- Confirm secret handling, database backups, retention rules, and operational alerts.
- Deploy the API and worker with a publicly reachable HTTPS webhook endpoint.
- Configure current provider pricing and usage monitoring before production sends.

Exact setup commands, environment variable names, executable schema, and deployment configuration should accompany implementation once the queue, authentication, and onboarding approach are selected.

## Target Workflow

Find a business → obtain permission → start a conversation → qualify the opportunity → send a proposal → track the outcome.

## AWS Cloud Deployment

The recommended AWS production layout is:

```text
CloudFront / Amplify (FE)  →  ALB  →  ECS Fargate (BE)
                                      |
                                      +--> RDS MySQL
                                      +--> Secrets Manager
                                      +--> Google Places API
                                      +--> CloudWatch Logs
```

### 1. Create the AWS database

Create an Amazon RDS MySQL 8 instance in a private subnet. Enable automated backups, encryption, deletion protection, and security-group access only from the ECS service. Copy its private connection string as `DATABASE_URL`.

Do not commit `.env`, `.env.local`, database credentials, Google keys, or WhatsApp tokens. The repository already ignores local environment files.

### 2. Store secrets

Create an AWS Secrets Manager secret for `DATABASE_URL`, `GOOGLE_PLACES_API_KEY`, and `FRONTEND_URL`. Grant the ECS task role permission to read only this secret. Add WhatsApp credentials there later.

### 3. Deploy the backend

Create a Docker image for `BE`, push it to Amazon ECR, and deploy it as an ECS Fargate service behind an Application Load Balancer.

```text
Docker context: BE
Container port: 5000
Health check: /api/v1/health
Container command: npm start
```

Run migrations as a one-off ECS task before switching traffic to a new release:

```json
"prisma:deploy": "prisma migrate deploy"
```

Load these values from Secrets Manager:

```text
NODE_ENV=production
PORT=5000
DATABASE_URL=<managed MySQL connection string>
FRONTEND_URL=https://<your-frontend-domain>
GOOGLE_PLACES_API_KEY=<Google Places API key>
```

Use the ALB or API custom domain to verify:

```text
https://<your-backend-domain>/api/v1/health
```

### 4. Deploy the frontend

Connect the repository to AWS Amplify with the app root directory set to `FE`.

Set this frontend environment variable:

```text
NEXT_PUBLIC_API_URL=https://<your-backend-domain>/api/v1
```

Amplify uses CloudFront for the frontend. Open the deployed dashboard and verify searches, lead details, filters, and CSV export.

### 5. Configure Google Places

Enable the required Google Places APIs, restrict the key by API usage where possible, and set billing limits and alerts. The key must be stored only in the backend environment; it must not use a `NEXT_PUBLIC_` prefix.

### 6. Configure WhatsApp later

When WhatsApp features are implemented, add the Cloud API credentials only to the backend/worker service and expose a public HTTPS webhook endpoint. Configure the exact frontend origin, webhook verification token, access token, phone number ID, and WhatsApp Business Account ID in the provider dashboard and backend secrets.

### Production checks

- Use `prisma migrate deploy`, never `prisma migrate dev`, in production.
- Keep database backups and test restoring one before launch.
- Restrict backend CORS to the deployed frontend origin. The current development middleware intentionally allows broad origins and should be tightened for production.
- Add authentication before exposing lead data or messaging routes publicly.
- Enable HTTPS, health checks, application logs, error alerts, and usage/billing alerts.
- Run backend tests and both production builds before deployment:

```bash
cd BE
npm test
npm run build

cd ../FE
npm run build
```

### AWS domain setup

Create Route 53 records for `app.example.com` and `api.example.com`. Point the frontend record to Amplify and the API record to the ALB. Use ACM certificates for HTTPS, then update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL`.

### AWS operations

- Send ECS container logs to CloudWatch Logs.
- Configure ECS auto scaling and ALB health checks.
- Add CloudWatch alarms for 5xx responses, task restarts, CPU/memory, RDS storage, and database connections.
- Keep ECS tasks and RDS private; expose only the ALB and Amplify frontend.
