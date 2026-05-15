# FindMyCut — Backend API

> **Hackathon:** OpenClaw Agenthon Indonesia 2026 | **Team:** Pencari Kerja

## What is this folder?

This is the **REST API server** that powers the entire FindMyCut platform. It handles user authentication, photo uploads, orchestrates the AI agent pipeline, stores results, manages tier-based access control, and processes payments via DOKU.

The backend does NOT contain AI logic directly — it imports and runs the agent pipeline from the `/agent` folder as an async background process.

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Bun | Fast startup, native TypeScript, built-in test runner |
| Framework | Hono | Lightweight, fast, middleware-based (like Express but modern) |
| Language | TypeScript | Type safety across the entire codebase |
| Database | Neon PostgreSQL | Serverless Postgres, scales to zero, branching support |
| ORM | Drizzle ORM | Type-safe queries, lightweight, great DX |
| Auth | Better Auth | Multi-method auth (anonymous, email, Google OAuth) out of the box |
| Storage | Cloudflare R2 | S3-compatible, no egress fees, global CDN |
| Image Processing | Sharp | Convert uploads to WebP, resize to max 1080px |
| Payment | DOKU Checkout | Indonesian payment gateway (QRIS, VA, e-wallet) |
| Logging | Pino | Structured JSON logs, pretty-print in dev |
| API Docs | Swagger UI | Interactive API documentation at `/docs` |

---

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Fill in: DATABASE_URL, BETTER_AUTH_SECRET, R2 keys, DOKU keys, etc.

# 3. Create database tables
bunx drizzle-kit push

# 4. Start development server (hot reload)
bun run dev

# Server runs at http://localhost:3000
# Swagger UI at http://localhost:3000/docs
```

---

## Architecture — How Everything Connects

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                          │
│                                                                     │
│  ┌──────────┐     ┌──────────────────────────────────────────┐      │
│  │  React   │────→│  Hono Server (port 3000)                 │      │
│  │  Frontend│←────│                                          │      │
│  │  :5173   │     │  Middleware Stack:                       │      │
│  └──────────┘     │  1. CORS (allow :5173)                   │      │
│                   │  2. Pino Logger (structured logs)        │      │
│                   │  3. Rate Limiter (10 req/min per IP)     │      │
│                   │  4. Auth Middleware (extract session)    │      │
│                   │                                          │      │
│                   │  Routes → Services → Repositories        │      │
│                   └──────┬───────────┬───────────┬───────────┘      │
│                          │           │           │                  │
│                          ↓           ↓           ↓                  │
│                   ┌──────────┐ ┌──────────┐ ┌──────────────┐        │
│                   │ Neon DB  │ │Cloudflare│ │Agent Pipeline│        │
│                   │(Drizzle) │ │   R2     │ │ (5 AI agents)│        │
│                   │          │ │(images)  │ │  see /agent  │        │
│                   │ Tables:  │ │          │ │              │        │
│                   │ -user    │ │ Folders: │ │ GLM-5-Turbo  │        │
│                   │ -session │ │ -photos/ │ │ + Replicate  │        │
│                   │ -analyses│ │ -hair-   │ │ flux-2-pro   │        │
│                   │ -recs    │ │  styles/ │ │              │        │
│                   │ -payments│ │          │ │              │        │
│                   │ -logs    │ │          │ │              │        │
│                   └──────────┘ └──────────┘ └──────────────┘        │
│                                                                     │
│                   ┌──────────┐ ┌──────────┐                         │
│                   │  DOKU    │ │  Google  │                         │
│                   │ Payment  │ │  OAuth   │                         │
│                   │(checkout)│ │(sign-in) │                         │
│                   └──────────┘ └──────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete User Flow (End-to-End)

```
┌─ USER JOURNEY ──────────────────────────────────────────────────────┐
│                                                                     │
│  1. SIGN IN                                                         │
│     POST /api/auth/sign-in/anonymous                                │
│     → Creates anonymous user (tier: "free")                         │
│     → Returns session cookie                                        │
│                                                                     │
│  2. UPLOAD SELFIE                                                   │
│     POST /api/v1/uploads (multipart file or base64)                 │
│     → Sharp converts to WebP (max 1080px, quality 80)               │
│     → Uploads to Cloudflare R2                                      │
│     → Returns: { url: "https://r2.dev/photos/uuid.webp" }           │
│                                                                     │
│  3. TRIGGER ANALYSIS                                                │
│     POST /api/v1/analyses { user_id, image_url }                    │
│     → Creates analysis record (status: "processing")                │
│     → Spawns agent pipeline in background (non-blocking)            │
│     → Returns immediately: { analysis_id, status: "processing" }    │
│                                                                     │
│  4. POLL PROGRESS (FE polls every 2-3 seconds)                      │
│     GET /api/v1/analyses/:id/status                                 │
│     → Returns: { status, current_agent, progress[] }                │
│     → progress[] shows real-time agent steps:                       │
│       "🔧 Memanggil analyze_image..."                               │
│       "✅ face_shape: oval (85%)"                                   │
│       "🔧 Memanggil generate_hairstyle_image..."                    │
│                                                                     │
│  5. GET RESULTS (after status = "completed")                        │
│     GET /api/v1/analyses/:id/recommendations                        │
│     → Checks user tier from session                                 │
│     → Free: 1 unlocked + rest locked (sorted lowest first)          │
│     → Pro: all unlocked (sorted highest first)                      │
│     → Returns recommendations with images, barber instructions      │
│                                                                     │
│  6. UPGRADE TO PRO (optional)                                       │
│     POST /api/v1/payments/checkout { user_id }                      │
│     → Creates DOKU checkout session (Rp15.000)                      │
│     → Returns: { checkout_url }                                     │
│     → FE redirects to DOKU payment page                             │
│     → User pays via QRIS/VA/e-wallet                                │
│     → DOKU webhook → POST /api/v1/payments/webhook                  │
│     → Backend verifies signature, updates tier to "pro"             │
│     → FE refetches recommendations → all unlocked!                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints (19 total)

### Health & Documentation
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health check → `{ status: "ok" }` |
| GET | `/docs` | Swagger UI (interactive API docs) |
| GET | `/docs/openapi.json` | Raw OpenAPI 3.0 spec |

### Authentication (`/api/auth/*` — Better Auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-in/anonymous` | Create anonymous session (no credentials needed) |
| POST | `/api/auth/sign-up/email` | Register with name + email + password |
| POST | `/api/auth/sign-in/email` | Login with email + password |
| POST | `/api/auth/sign-in/username` | Login with username + password |
| POST | `/api/auth/sign-in/social` | Google OAuth → `{ provider: "google", callbackURL }` |
| GET | `/api/auth/get-session` | Get current user + session info |
| POST | `/api/auth/sign-out` | Destroy session |
| GET | `/api/auth/callback/google` | Google OAuth callback (internal) |

### Core API (`/api/v1/*`)
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/v1/users/me` | — | `{ id, name, email, image }` |
| POST | `/api/v1/uploads` | file (multipart) or `{ image_base64 }` | `{ id, url, width, height }` |
| POST | `/api/v1/analyses` | `{ user_id, image_url, latitude?, longitude? }` | `{ analysis_id, status }` (202) |
| GET | `/api/v1/analyses/:id/status` | — | `{ status, current_agent, progress[] }` |
| GET | `/api/v1/analyses/:id/recommendations` | — | `{ tier, data: Recommendation[] }` |
| POST | `/api/v1/payments/checkout` | `{ user_id }` | `{ checkout_url, transaction_id }` |
| POST | `/api/v1/payments/webhook` | DOKU payload | `{ status: "success" }` |

---

## Database Schema (9 tables)

```sql
-- Better Auth managed (auto-created)
user          → id, name, email, tier, isAnonymous, createdAt
session       → id, userId, token, expiresAt, ipAddress
account       → id, userId, providerId, accessToken, password
verification  → id, identifier, value, expiresAt

-- Application tables (Drizzle ORM)
analyses      → id, userId, imageUrl, faceShape, faceConfidence,
                hairDensity, hairTexture, status, currentAgent
recommendations → id, analysisId, styleName, matchScore,
                  barberInstruction, maintenance, stylingTips,
                  imageUrls (JSONB), barbershop (JSONB), isLocked
agent_logs    → id, analysisId, agentName, step, message,
                toolCall, reasoning, createdAt
payments      → id, userId, invoiceNumber, amount, tier, status,
                dokuSessionId, paymentMethod, paidAt
barbershop_cache → id, name, lat, lng, rating, specialties,
                   areaKey, source, fetchedAt (TTL: 7 days)
```

---

## Tier System — How Access Control Works

The same AI pipeline runs for both free and pro users. The difference is in **how results are presented**:

| Feature | Free (Rp0) | Pro (Rp15.000 one-time) |
|---------|-----------|-------------------------|
| Recommendations shown | 1 clear + rest locked | All unlocked |
| Generated images | 1 (front view, top pick) | 1 (front view, top pick) |
| Barber instructions | Only for #1 | All visible |
| Styling tips | Only for #1 | All visible |
| Barbershop info | Locked | Unlocked |
| Sort order | Lowest match first (hook) | Highest match first |

**Implementation:** `recommendation.service.ts` checks `userRepo.getTier(userId)` and filters response accordingly.

---

## File Structure

```
backend/
├── src/
│   ├── index.ts                    # Hono server entry point
│   │                                 - Middleware stack (CORS, rate limit, auth)
│   │                                 - Route mounting
│   │                                 - Startup health checks
│   │                                 - Graceful shutdown (SIGTERM/SIGINT)
│   ├── routes/
│   │   ├── auth.ts                 # Better Auth handler (all /api/auth/*)
│   │   ├── users.ts               # GET /me (session-based)
│   │   ├── uploads.ts             # POST / (multipart + base64 support)
│   │   ├── analyses.ts            # POST / + GET /:id/status
│   │   ├── recommendations.ts     # GET /:id/recommendations (tier-filtered)
│   │   └── payments.ts            # POST /checkout + POST /webhook
│   ├── services/
│   │   ├── agent-runner.service.ts # Async pipeline orchestration
│   │   │                            - Dynamic imports agent/src/pipeline.ts
│   │   │                            - Logs progress to agent_logs table
│   │   │                            - Downloads generated images → R2
│   │   │                            - Saves recommendations to DB
│   │   ├── analysis.service.ts     # Create analysis, get status + logs
│   │   ├── recommendation.service.ts # Tier-based filtering logic
│   │   ├── payment.service.ts      # DOKU checkout + webhook handling
│   │   └── upload.service.ts       # R2 upload wrapper
│   ├── repositories/               # Database queries (Drizzle)
│   │   ├── analysis.repo.ts
│   │   ├── recommendation.repo.ts
│   │   ├── agent-log.repo.ts
│   │   ├── payment.repo.ts
│   │   └── user.repo.ts           # Raw SQL for Better Auth user table
│   ├── middleware/
│   │   ├── auth.ts                 # Extract session, set userId on context
│   │   └── rate-limit.ts          # IP-based rate limiting
│   └── lib/
│       ├── auth.ts                 # Better Auth config (3 auth methods)
│       ├── schema.ts              # All Drizzle table definitions
│       ├── db.ts                  # Neon connection (neon-http driver)
│       ├── r2.ts                  # S3 client + Sharp image processing
│       ├── doku.ts                # DOKU Checkout API + signature verification
│       ├── swagger.ts             # OpenAPI 3.0 spec (all endpoints documented)
│       ├── rate-limit.ts          # In-memory rate limiter (Map-based)
│       ├── logger.ts              # Pino logger config
│       └── healthcheck.ts         # Startup diagnostics (7 services checked)
├── drizzle/                        # SQL migration files
├── docs/plans/                     # Architecture docs, ERD, timeline
├── .env.example                    # All environment variables documented
└── package.json                    # Scripts: dev, start, check, db:generate, db:migrate
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Async pipeline** | Analysis returns 202 immediately; AI runs in background. User sees real-time progress via polling. |
| **Dynamic agent import** | Backend imports agent code at runtime — allows independent development of agent logic. |
| **Tier filtering at response time** | Same pipeline runs for all users; output filtered based on tier. No wasted compute. |
| **Image → WebP conversion** | All uploads converted to WebP (max 1080px). Reduces storage cost and load time by ~60-80%. |
| **Graceful degradation** | If any agent fails, pipeline continues. If image download fails, recommendations still saved. |
| **500ms completion delay** | Ensures all async progress callbacks finish before setting "completed" status. |
| **Structured logging** | Every agent step logged with agent name, step type, message — enables live progress UI. |
| **In-memory rate limit** | Simple Map-based limiter. Good enough for hackathon; swap to Redis for production. |

---

## Startup Health Checks

On boot, the server verifies all external dependencies before accepting traffic:

```
[14:30:05] ✅ neon-postgres: Connected (45ms)
[14:30:05] ✅ better-auth: Secret configured
[14:30:06] ✅ replicate: API reachable (120ms)
[14:30:06] ✅ mimo-llm: Configured
[14:30:06] ✅ cloudflare-r2: Bucket: findmycut
[14:30:06] ✅ doku-payment: Credentials configured
[14:30:06] ✅ google-maps: API key configured
[14:30:06] 🔥 FindMyCut API running on http://localhost:3000
[14:30:06] 📖 Swagger: http://localhost:3000/docs
```

If **critical** services (Neon DB, Better Auth) fail → server aborts startup.
