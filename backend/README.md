# FindMyCut — Backend API

Hono HTTP server with Drizzle ORM + Neon PostgreSQL. Handles auth, file uploads, analysis orchestration, recommendations, and DOKU payment integration.

---

## Architecture

Simple Layered Pattern:

```
HTTP Request
    ↓
Route (validasi input, parse request)
    ↓
Service (business logic, orchestration)
    ↓
Repository (Drizzle queries → Neon PostgreSQL)
```

---

## API Endpoints

Base URL: `/api/v1`

### Health
```
GET /health → { status: "ok", service: "findmycut-api" }
```

### Auth (`/api/v1/auth`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/register` | `{ username, password }` | `{ token, user: { id, username } }` |
| POST | `/login` | `{ username, password }` | `{ token, user: { id, username } }` |
| GET | `/google` | — | Redirect to Google OAuth |
| GET | `/google/callback` | — | `{ token, user }` |

### Users (`/api/v1/users`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/session` | `{ device_id? }` | `{ id, tier, created_at }` |

Creates anonymous session. If `device_id` exists, returns existing user.

### Uploads (`/api/v1/uploads`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/` | multipart `file` | `{ id, url }` |

Uploads image to Cloudflare R2. Returns public URL.

### Analyses (`/api/v1/analyses`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/` | `{ user_id, image_url }` | `{ analysis_id, status: "processing" }` (202) |
| GET | `/:id/status` | — | `{ analysis_id, status, current_agent, progress[] }` |

Creates analysis and triggers agent pipeline. Poll status to track progress.

### Recommendations (`/api/v1/analyses`)

| Method | Path | Response |
|--------|------|----------|
| GET | `/:id/recommendations` | Tier-gated recommendations |

**Free tier response:**
```json
{
  "tier": "free",
  "data": [
    {
      "name": "French Crop",
      "match": 80,
      "image": [{ "type": "Front", "url": "..." }],
      "barbershop": { "instruction": "...", "maintenance": "...", "location": null },
      "is_locked": false
    },
    {
      "name": "Crew Cut",
      "match": 90,
      "image": [],
      "barbershop": null,
      "is_locked": true
    }
  ]
}
```

**Pro tier response:**
```json
{
  "tier": "pro",
  "data": [
    {
      "name": "Buzz Cut",
      "match": 100,
      "image": [
        { "type": "Front", "url": "..." },
        { "type": "Side", "url": "..." },
        { "type": "Back", "url": "..." },
        { "type": "Top", "url": "..." }
      ],
      "barbershop": {
        "instruction": "Sides: #1.5 blended to #3...",
        "maintenance": "Trim every 4-5 weeks...",
        "location": null
      },
      "is_locked": false
    }
  ]
}
```

### Payments (`/api/v1/payments`)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/checkout` | `{ user_id, analysis_id? }` | `{ checkout_url, transaction_id }` |
| POST | `/webhook` | DOKU callback | `{ status: "success" }` |

---

## Database Schema

6 tables managed by Drizzle ORM:

### users
- `id` (UUID, PK)
- `username` (unique, nullable)
- `email` (unique, nullable)
- `password_hash` (nullable)
- `google_id` (unique, nullable)
- `device_id` (unique, nullable — anonymous sessions)
- `tier` (default: "free")
- `created_at`

### analyses
- `id` (UUID, PK)
- `user_id` (FK → users)
- `image_url` (R2 URL)
- `face_shape`, `face_confidence`, `hair_density`, `hair_texture`
- `status` (processing/completed/failed)
- `current_agent` (vision/knowledge/ranker/imagegen/done)
- `created_at`

### agent_logs
- `id` (serial, PK)
- `analysis_id` (FK → analyses)
- `agent_name`, `step`, `message`
- `tool_call`, `tool_input`, `tool_output`, `reasoning`
- `created_at`

### recommendations
- `id` (UUID, PK)
- `analysis_id` (FK → analyses, unique)
- `style_name`, `match_score`
- `barber_instruction`, `maintenance`, `styling_tips`
- `image_urls` (JSONB: `{ front, left, right, back, top }`)
- `barbershop` (JSONB)
- `is_locked` (boolean, default: true)
- `created_at`

### payments
- `id` (UUID, PK)
- `user_id` (FK → users)
- `invoice_number` (unique)
- `amount` (IDR)
- `tier` (pro)
- `status` (pending/paid/failed/expired)
- `doku_session_id`, `doku_token_id`
- `payment_method`, `paid_at`
- `created_at`

### hairstyle_embeddings
- `id` (serial, PK)
- `style_name` (unique)
- `description`, `suitable_face_shapes`, `suitable_hair_types`, etc.
- `embedding` (pgvector, 1536 dimensions)

---

## File Structure

```
backend/src/
├── index.ts               # Hono server entry
├── types.ts               # Shared TypeScript interfaces
├── routes/
│   ├── users.ts           # POST /users/session
│   ├── auth.ts            # POST /auth/register, /login
│   ├── uploads.ts         # POST /uploads
│   ├── analyses.ts        # POST /analyses, GET /:id/status
│   ├── recommendations.ts # GET /:id/recommendations
│   └── payments.ts        # POST /payments/checkout, /webhook
├── services/
│   ├── user.service.ts    # Anonymous session logic
│   ├── auth.service.ts    # Register/login logic
│   ├── upload.service.ts  # R2 upload wrapper
│   ├── analysis.service.ts # Create analysis, log agent steps
│   ├── recommendation.service.ts # Tier-gated recommendations
│   └── payment.service.ts # DOKU checkout + webhook
├── repositories/
│   ├── user.repo.ts       # Users CRUD
│   ├── analysis.repo.ts   # Analyses CRUD
│   ├── agent-log.repo.ts  # Agent logs CRUD
│   ├── recommendation.repo.ts # Recommendations CRUD + unlock
│   └── payment.repo.ts    # Payments CRUD
├── lib/
│   ├── schema.ts          # Drizzle schema (6 tables)
│   ├── db.ts              # Neon PostgreSQL connection
│   ├── auth.ts            # JWT + bcrypt utilities
│   ├── r2.ts              # Cloudflare R2 upload
│   ├── doku.ts            # DOKU Checkout API client
│   └── rate-limit.ts      # In-memory rate limiter
└── middleware/
    ├── auth.ts            # JWT verification middleware
    └── rate-limit.ts      # Rate limit middleware
```

---

## Environment Variables

See `.env.example` for template. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `REPLICATE_API_TOKEN` | Replicate API token |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public URL |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `DOKU_CLIENT_ID` | DOKU merchant client ID |
| `DOKU_SECRET_KEY` | DOKU secret key |

---

## Tier Access Control

| Feature | Free | Pro (Rp15.000) |
|---------|------|----------------|
| Photo upload | 1 (front only) | 4 (all angles) |
| Agent pipeline | Full (4 agents) | Full (4 agents) |
| Recommendations | 1 unlocked + 5 locked | All 6 unlocked |
| Generated images | Front only | All angles |
| Barber instructions | Locked | Unlocked |
| Styling tips | Locked | Unlocked |
| Sort order | Lowest match first | Highest match first |

---

## DOKU Payment Flow

```
1. User clicks "Upgrade to Pro"
2. FE → POST /api/v1/payments/checkout { user_id }
3. Backend creates payment record + DOKU checkout
4. DOKU returns checkout_url
5. FE redirects user to DOKU payment page
6. User pays (VA/QRIS/CC/e-wallet)
7. DOKU webhook → POST /api/v1/payments/webhook
8. Backend verifies signature, updates user tier to "pro"
9. Recommendations unlocked
```

---

## Running

```bash
# Install dependencies
bun install

# Generate Drizzle migrations
bunx drizzle-kit generate

# Push schema to database
bunx drizzle-kit push

# Start development server
bun run src/index.ts

# Server runs on http://localhost:3000
```
