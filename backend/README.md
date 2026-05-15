# FindMyCut — Backend API

> **Hackathon:** OpenClaw Agenthon Indonesia 2026 | **Team:** Pencari Kerja

REST API server powering FindMyCut — an AI-powered haircut recommendation platform. Handles authentication, image uploads, AI pipeline orchestration, tier-based access control, and DOKU payment integration.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Bun |
| Framework | Hono |
| Language | TypeScript |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth (anonymous, email, Google OAuth) |
| Storage | Cloudflare R2 (WebP conversion via Sharp) |
| Payment | DOKU Checkout |
| AI Orchestration | 5-agent pipeline (see `/agent` folder) |
| Docs | Swagger UI at `/docs` |

---

## Quick Start

```bash
bun install
cp .env.example .env   # Fill in credentials
bunx drizzle-kit push  # Create DB tables
bun run dev            # http://localhost:3000
```

**Swagger UI:** http://localhost:3000/docs

---

## Architecture

```
Client (React FE)
    ↓ HTTP
┌─────────────────────────────────────────────┐
│  Hono Server (port 3000)                    │
│  ├── Middleware: CORS, Rate Limit, Auth     │
│  ├── Routes → Services → Repositories      │
│  └── Agent Runner (async, non-blocking)     │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────────┐
    ↓          ↓              ↓
 Neon DB   Cloudflare R2   Agent Pipeline
 (Drizzle)  (images)       (5 AI agents)
```

---

## API Endpoints (19 total)

### Health & Docs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health check |
| GET | `/docs` | Swagger UI |
| GET | `/docs/openapi.json` | OpenAPI spec |

### Auth (`/api/auth/*` — Better Auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-in/anonymous` | Create anonymous session |
| POST | `/api/auth/sign-up/email` | Register (email + password) |
| POST | `/api/auth/sign-in/email` | Login (email + password) |
| POST | `/api/auth/sign-in/username` | Login (username + password) |
| POST | `/api/auth/sign-in/social` | Google OAuth (body: `{provider:"google"}`) |
| GET | `/api/auth/get-session` | Get current session |
| POST | `/api/auth/sign-out` | Logout |

### Core API (`/api/v1/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Current user profile |
| POST | `/api/v1/uploads` | Upload photo → R2 (WebP) |
| POST | `/api/v1/analyses` | Trigger AI analysis (async) |
| GET | `/api/v1/analyses/:id/status` | Poll progress + agent logs |
| GET | `/api/v1/analyses/:id/recommendations` | Get results (tier-filtered) |
| POST | `/api/v1/payments/checkout` | Create DOKU payment |
| POST | `/api/v1/payments/webhook` | DOKU callback |

---

## Core Flow

```
1. User uploads selfie         → POST /uploads → R2 (WebP)
2. Trigger AI analysis         → POST /analyses → 202 Accepted
3. Pipeline runs (background)  → 5 agents process sequentially
4. FE polls progress           → GET /analyses/:id/status
5. Get recommendations         → GET /analyses/:id/recommendations
6. (Optional) Pay for Pro      → POST /payments/checkout → DOKU
7. Webhook updates tier        → All recommendations unlocked
```

---

## Tier System

| Feature | Free (Rp0) | Pro (Rp15.000) |
|---------|-----------|----------------|
| Recommendations | 1 unlocked + rest locked | All unlocked |
| Generated images | Front only | All angles |
| Barber instructions | Locked | Unlocked |
| Barbershop finder | Locked | Unlocked |
| Sort order | Lowest match first | Highest match first |

---

## Database Schema

```
user (Better Auth)     → id, name, email, tier, isAnonymous
session (Better Auth)  → id, userId, token, expiresAt
account (Better Auth)  → id, userId, providerId, accessToken
analyses               → id, userId, imageUrl, faceShape, status, currentAgent
recommendations        → id, analysisId, styleName, matchScore, imageUrls, isLocked
agent_logs             → id, analysisId, agentName, step, message, reasoning
payments               → id, userId, invoiceNumber, amount, status, paidAt
hairstyle_embeddings   → id, styleName, suitableFaceShapes, barberInstruction
barbershop_cache       → id, name, lat, lng, areaKey, source, fetchedAt
```

---

## File Structure

```
backend/
├── src/
│   ├── index.ts                 # Server entry + health checks + graceful shutdown
│   ├── routes/                  # HTTP route handlers
│   ├── services/                # Business logic + agent orchestration
│   ├── repositories/            # Database queries (Drizzle)
│   ├── middleware/              # Auth + rate limiting
│   └── lib/
│       ├── auth.ts              # Better Auth config
│       ├── schema.ts            # Drizzle schema (all tables)
│       ├── db.ts                # Neon connection
│       ├── r2.ts                # Cloudflare R2 + Sharp image processing
│       ├── doku.ts              # DOKU payment API
│       ├── swagger.ts           # OpenAPI 3.0 spec
│       ├── rate-limit.ts        # In-memory rate limiter
│       ├── logger.ts            # Pino structured logging
│       └── healthcheck.ts       # Startup diagnostics
├── drizzle/                     # Migration files
├── docs/plans/                  # Architecture docs + ERD
├── .env.example                 # Environment template
└── package.json
```

---

## Key Design Decisions

1. **Async Pipeline** — Analysis returns 202 immediately; AI pipeline runs in background. FE polls for progress.
2. **Tier-based Filtering** — Same pipeline runs for free/pro; output is filtered at response time.
3. **Graceful Degradation** — If any agent fails, pipeline continues with fallback data.
4. **Image Processing** — All uploads converted to WebP (max 1080px, quality 80) via Sharp before R2 storage.
5. **Real-time Logging** — Every agent thought, tool call, and result logged to `agent_logs` for live progress display.
