# FindMyCut — Master Plan

> **Branch:** dev-aldo
> **Deadline:** 15 Mei 2026, 23:00 WIB
> **Last updated:** 15 Mei 2026, 13:20 WIB

---

## ✅ Decisions

| Decision | Choice |
|----------|--------|
| Architecture | Option A — Self-contained agent workspace |
| Backend Pattern | Simple Layered (routes → services → repos) |
| ORM | Drizzle ORM |
| Main LLM | MiMo (custom base URL) |
| Vision | Replicate: lucataco/moondream2 |
| Image Gen | Replicate: black-forest-labs/flux-2-pro |
| Auth | Anonymous session + Username-password + Google OAuth |
| Storage | Cloudflare R2 (convert to webp) |
| Rate Limiting | In-memory (Map) |
| Database | Neon PostgreSQL + pgvector |
| Payment | DOKU Checkout (one-time, 2 tiers: free + pro) |
| Deploy | Coolify (BE + FE) |

---

## 🆓💎 Tiers (2 Only)

### Free (Rp0)
- Photo: front only (1 angle: "depan")
- Recommendations: 6 total, 1 clear + 5 locked/blurred
- Generated images: front only
- Barber instructions: locked
- Styling tips: locked
- Location: locked
- Agent pipeline: full run (all 4 agents), tapi output di-filter

### Pro (Rp15.000 — one-time via DOKU)
- Photo: all 4 angles (depan, kanan, kiri, belakang)
- Recommendations: all 6 clear & unlocked
- Generated images: all angles (front, left, right, back)
- Barber instructions: unlocked
- Styling tips: unlocked
- Location: unlocked
- Agent pipeline: full run, full output

---

## 🔐 Auth (3 Methods)

### 1. Anonymous Session (default)
```
POST /api/v1/users/session
  Body: { device_id?: string }
  Response: { id, tier: "free", created_at }
```
- User langsung bisa pakai tanpa login
- Device ID dari localStorage
- Auto-create user di DB

### 2. Username-Password
```
POST /api/v1/auth/register
  Body: { username, password }
  Response: { token, user }

POST /api/v1/auth/login
  Body: { username, password }
  Response: { token, user }
```

### 3. Google OAuth
```
GET /api/v1/auth/google
  → Redirect ke Google consent screen

GET /api/v1/auth/google/callback
  → Create/link user, return JWT
```

---

## 📡 API Contract (v1)

### Base URL: `/api/v1`

### Users & Auth
```
POST /users/session           → { id, tier, created_at }
POST /auth/register           → { token, user }
POST /auth/login              → { token, user }
GET  /auth/google             → redirect
GET  /auth/google/callback    → { token, user }
```

### Upload
```
POST /uploads
  Headers: Authorization: Bearer <token> (optional)
  Body: multipart/form-data { file: image, user_id: uuid }
  Response: { id, url }
```

### Analysis
```
POST /analyses
  Body: { user_id, image_url }
  Response 202: { analysis_id, status: "processing" }

GET /analyses/:id/status
  Response: { analysis_id, status, current_agent?, progress? }
```

### Recommendations
```
GET /analyses/:id/recommendations
  Response: {
    tier: "free" | "pro",
    data: [
      {
        name: "Textured Crop",
        match: 94,
        image: [
          { type: "Front", url: "..." },
          { type: "Side", url: "..." },
          { type: "Back", url: "..." },
          { type: "Top", url: "..." }
        ],
        barbershop: {
          instruction: "Sides: #1.5 blended to #3...",
          maintenance: "Trim every 4-5 weeks...",
          location: { id, name, address, phone, latitude, longitude, image } | null
        }
      }
    ]
  }

  Free tier:
    - 1 recommendation with front image + barber data
    - 5 recommendations with empty image array, null barbershop
    - Sorted: lowest match first (hook mechanism)

  Pro tier:
    - All 6 recommendations with all images + full barber data
    - Sorted: highest match first
```

### Payments
```
POST /payments/checkout
  Body: { user_id, tier: "pro", analysis_id? }
  Response: { checkout_url, transaction_id }

POST /payments/webhook
  Body: DOKU callback payload
  Response: { status: "success" }
```

---

## 📂 Folder Structure

```
backend/
├── docs/plans/              ← plan documents
├── src/
│   ├── index.ts             # Hono server entry
│   ├── routes/
│   │   ├── users.ts         # POST /users/session
│   │   ├── auth.ts          # POST /auth/register, /login, /auth/google
│   │   ├── uploads.ts       # POST /uploads
│   │   ├── analyses.ts      # POST /analyses, GET /analyses/:id/status
│   │   ├── recommendations.ts # GET /analyses/:id/recommendations
│   │   └── payments.ts      # POST /payments/checkout, /payments/webhook
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── auth.service.ts
│   │   ├── upload.service.ts
│   │   ├── analysis.service.ts
│   │   ├── recommendation.service.ts
│   │   └── payment.service.ts
│   ├── repositories/
│   │   ├── user.repo.ts
│   │   ├── analysis.repo.ts
│   │   ├── recommendation.repo.ts
│   │   ├── agent-log.repo.ts
│   │   └── payment.repo.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── schema.ts
│   │   ├── r2.ts
│   │   ├── auth.ts
│   │   ├── doku.ts
│   │   └── rate-limit.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── rate-limit.ts
│   └── types.ts
├── drizzle/
│   └── migrations/
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json

agent/
├── src/
│   ├── index.ts
│   ├── pipeline.ts
│   ├── runner.ts
│   ├── agents/
│   │   ├── vision.ts
│   │   ├── knowledge.ts
│   │   ├── ranker.ts
│   │   └── imagegen.ts
│   ├── tools/
│   │   ├── vision-tools.ts
│   │   ├── knowledge-tools.ts
│   │   ├── ranker-tools.ts
│   │   └── imagegen-tools.ts
│   ├── knowledge/
│   │   ├── face-shapes.json
│   │   ├── hair-types.json
│   │   └── styles.json
│   ├── lib/
│   │   ├── llm.ts
│   │   ├── replicate.ts
│   │   └── vector-search.ts
│   └── types.ts
├── package.json
└── tsconfig.json
```

---

## 🔐 .env.example

```env
# === Main LLM — MiMo (Agent 2 & 3) ===
MAIN_LLM_BASE_URL=https://your-mimo-endpoint
MAIN_LLM_API_KEY=your-mimo-api-key
MAIN_LLM_MODEL=mimo-v2.5-pro

# === Replicate (Vision + Image Gen) ===
REPLICATE_API_TOKEN=your-replicate-token
REPLICATE_VISION_MODEL=lucataco/moondream2
REPLICATE_IMAGEGEN_MODEL=black-forest-labs/flux-2-pro

# === Neon PostgreSQL ===
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# === Cloudflare R2 ===
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=findmycut
R2_PUBLIC_URL=https://your-bucket.r2.dev

# === Auth ===
JWT_SECRET=your-jwt-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/v1/auth/google/callback

# === DOKU Payment ===
DOKU_CLIENT_ID=your-doku-client-id
DOKU_SECRET_KEY=your-doku-secret-key

# === Rate Limiting ===
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

---

## 🤖 Agent Pipeline

```
📸 User upload foto → R2
        ↓
🔍 Agent 1: Vision Analyzer (Replicate moondream2)
   Tools: analyze_image, merge_analyses
   Output: FaceFeatures JSON
        ↓
🎨 Agent 2: Style Matcher (MiMo tool calling)
   Tools: query_face_shape_guide, query_hair_compatibility, get_style_details
   Output: List kandidat (5-7)
        ↓
⭐ Agent 3: Ranker & Explainer (MiMo tool calling)
   Tools: calculate_match_score, generate_explanation
   Output: Top 6 recommendations
        ↓
🖼️ Agent 4: Image Generator (Replicate FLUX-2-pro)
   Tools: generate_hairstyle_image
   Output: reference images → R2
        ↓
📊 Result → DB → FE polls
```

---

## ⏰ Timeline

| Waktu | Task |
|-------|------|
| 13.30-14.00 | Setup: bun init, drizzle, neon, .env |
| 14.00-15.00 | Backend: schema + auth + users session |
| 15.00-16.00 | Agent: runner + pipeline + types |
| 16.00-17.30 | Agent 1 (Vision) + Agent 2 (Knowledge) |
| 17.30-18.30 | Agent 3 (Ranker) |
| 18.30-19.00 | Break |
| 19.00-19.30 | Agent 4 (Image Gen) + R2 |
| 19.30-20.00 | DOKU payment + tier filtering |
| 20.00-21.00 | Integration + testing |
| 21.00-22.00 | Demo video + pitch deck |
| 22.00-23.00 | Submit Devpost |

---

*Last updated: 15 Mei 2026, 13:20 WIB*
