# FindMyCut — Master Plan

> **Branch:** dev-aldo
> **Deadline:** 15 Mei 2026, 23:00 WIB
> **Last updated:** 15 Mei 2026, 12:58 WIB

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
| Auth | Username-password + JWT |
| Storage | Cloudflare R2 (convert to webp) |
| Rate Limiting | In-memory (Map) |
| Database | Neon PostgreSQL + pgvector |
| Payment | DOKU Checkout (one-time) |
| Deploy | Coolify (BE + FE) |

---

## 🆓💎 Free vs Pro Tier

### Free Tier
- Photo upload: **front only** (1 foto)
- Recommendations: **1 unlocked**, response tetap banyak tapi locked/cropped
- Generated images: **front view only** (left, right, back = locked)
- Barber instructions: **locked**
- Location/barbershop: **locked** (debatable, bisa free)

### Pro Tier (One-time Payment via DOKU)
- Photo upload: **all 4 angles** (front, back, left, right)
- Recommendations: **all unlocked**
- Generated images: **all angles unlocked**
- Barber instructions: **unlocked**
- Location/barbershop: **unlocked**

### DOKU Checkout Flow
```
User klik "Upgrade to Pro"
    ↓
Backend create payment request ke DOKU
    ↓
DOKU return payment.url
    ↓
FE redirect user ke DOKU Checkout page
    ↓
User pilih payment method (VA, QRIS, CC, e-wallet)
    ↓
User bayar
    ↓
DOKU send webhook notification ke Backend
    ↓
Backend update user tier ke "pro"
    ↓
User redirect balik ke app, semua fitur unlocked
```

---

## 📂 Folder Structure

```
backend/
├── docs/
│   └── plans/
│       ├── FINAL-PLAN.md      ← file ini (master plan, update terus)
│       └── ERD.md             ← database diagram
├── src/
│   ├── index.ts               # Hono server entry
│   ├── routes/
│   │   ├── auth.ts            # POST /register, /login
│   │   ├── analyze.ts         # POST /analyze
│   │   ├── status.ts          # GET /status/:id, /result/:id
│   │   └── payment.ts         # POST /payment/create, POST /payment/webhook
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── analyze.service.ts
│   │   ├── job.service.ts
│   │   └── payment.service.ts
│   ├── repositories/
│   │   ├── user.repo.ts
│   │   ├── job.repo.ts
│   │   ├── agent-log.repo.ts
│   │   ├── result.repo.ts
│   │   └── payment.repo.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── schema.ts          # Drizzle schema
│   │   ├── r2.ts
│   │   ├── auth.ts
│   │   ├── doku.ts            # DOKU API client
│   │   └── rate-limit.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── tier-check.ts      # Check free/pro access
│   └── types.ts
├── drizzle/
│   └── migrations/
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json

agent/
├── src/
│   ├── index.ts               # Export runPipeline
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

## 🔄 Agent Pipeline

```
📸 User upload foto (1 free / 4 pro)
        ↓
┌──────────────────────────────────────┐
│  🔍 Agent 1: Vision Analyzer         │
│  API: Replicate moondream2           │
│  Tools: analyze_image, merge         │
│  Output: FaceFeatures JSON           │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  🎨 Agent 2: Style Matcher           │
│  API: MiMo (tool calling)            │
│  Tools: query_face_shape,            │
│         query_compatibility,         │
│         get_style_details            │
│  Output: List kandidat (5-7)         │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  ⭐ Agent 3: Ranker & Explainer      │
│  API: MiMo (tool calling)            │
│  Tools: calculate_score,             │
│         generate_explanation         │
│  Output: Top 3 + alasan              │
└──────────────┬───────────────────────┘
               ↓
┌──────────────────────────────────────┐
│  🖼️ Agent 4: Image Generator         │
│  API: Replicate FLUX-2-pro           │
│  Tools: generate_hairstyle_image     │
│  Output: reference images → R2       │
└──────────────┬───────────────────────┘
               ↓
         📊 Final Result (tier-filtered)
```

---

## 🔐 .env.example

```env
# Main LLM — MiMo
MAIN_LLM_BASE_URL=https://your-mimo-endpoint
MAIN_LLM_API_KEY=your-key-here
MAIN_LLM_MODEL=mimo-v2.5-pro

# Replicate (shared: vision + image gen)
REPLICATE_API_TOKEN=your-replicate-token
REPLICATE_VISION_MODEL=lucataco/moondream2
REPLICATE_IMAGEGEN_MODEL=black-forest-labs/flux-2-pro

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=findmycut
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Auth
JWT_SECRET=your-jwt-secret-min-32-chars

# DOKU Payment
DOKU_CLIENT_ID=your-doku-client-id
DOKU_SECRET_KEY=your-doku-secret-key
DOKU_WEBHOOK_URL=https://your-domain.com/api/payment/webhook

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

---

## 📡 API Contract

### Auth
```
POST /api/auth/register  → { token, user }
POST /api/auth/login     → { token, user }
```

### Analysis
```
POST /api/analyze        → { jobId, status }  (multipart: photos[])
GET  /api/status/:id     → { status, currentStep, progress[] }
GET  /api/result/:id     → { features, recommendations }
```

### Payment
```
POST /api/payment/create → { paymentUrl, invoiceNumber }
POST /api/payment/webhook → DOKU notification (server-to-server)
```

### Tier Access
```
Free:  POST /api/analyze { photos: [front] }
Pro:   POST /api/analyze { photos: [front, back, left, right] }

Free:  GET /api/result → recommendations[0] unlocked, rest locked
Pro:   GET /api/result → all unlocked

Free:  generated images = front only
Pro:   generated images = all angles
```

---

## ⏰ Timeline

| Waktu | Task |
|-------|------|
| 13.00-13.30 | Setup: bun init, drizzle, neon, .env |
| 13.30-14.30 | Backend: auth + schema + db |
| 14.30-15.30 | Agent: runner + pipeline + types |
| 15.30-17.00 | Agent 1 (Vision) + Agent 2 (Knowledge) |
| 17.00-18.00 | Agent 3 (Ranker) |
| 18.00-18.30 | Break |
| 18.30-19.30 | Agent 4 (Image Gen) + R2 integration |
| 19.30-20.00 | DOKU payment integration |
| 20.00-21.00 | Integration + testing |
| 21.00-22.00 | Demo video + pitch deck |
| 22.00-23.00 | Submit Devpost |

---

*Last updated: 15 Mei 2026, 12:58 WIB*
