# FindMyCut — Entity Relationship Diagram (ERD)

> **Last updated:** 15 Mei 2026, 12:58 WIB

---

## ERD (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ┌──────────────┐         ┌──────────────────┐                         │
│   │    users     │         │    payments      │                         │
│   ├──────────────┤         ├──────────────────┤                         │
│   │ id (PK)      │───┐     │ id (PK)          │                         │
│   │ username      │   │     │ user_id (FK) ────│──→ users.id             │
│   │ password_hash │   │     │ invoice_number   │                         │
│   │ tier          │   │     │ amount           │                         │
│   │ created_at    │   │     │ status           │                         │
│   └──────────────┘   │     │ doku_session_id  │                         │
│         │             │     │ doku_token_id    │                         │
│         │             │     │ payment_method   │                         │
│         │             │     │ paid_at          │                         │
│         │             │     │ created_at       │                         │
│         │             │     └──────────────────┘                         │
│         │             │                                                  │
│         │             │     ┌──────────────────┐                         │
│         │             ├────→│      jobs        │                         │
│         │             │     ├──────────────────┤                         │
│         │             │     │ id (PK)          │                         │
│         │             │     │ user_id (FK) ────│──→ users.id             │
│         │             │     │ status           │                         │
│         │             │     │ current_step     │                         │
│         │             │     │ photos (JSONB)   │                         │
│         │             │     │ photo_angles     │                         │
│         │             │     │ tier_snapshot    │                         │
│         │             │     │ created_at       │                         │
│         │             │     │ completed_at     │                         │
│         │             │     └──────────────────┘                         │
│         │             │            │                                     │
│         │             │            │ 1:N                                 │
│         │             │            ↓                                     │
│         │             │     ┌──────────────────┐                         │
│         │             │     │   agent_logs     │                         │
│         │             │     ├──────────────────┤                         │
│         │             │     │ id (PK)          │                         │
│         │             │     │ job_id (FK) ─────│──→ jobs.id              │
│         │             │     │ agent_name       │                         │
│         │             │     │ step             │                         │
│         │             │     │ message          │                         │
│         │             │     │ tool_call        │                         │
│         │             │     │ tool_input (JSON)│                         │
│         │             │     │ tool_output(JSON)│                         │
│         │             │     │ reasoning        │                         │
│         │             │     │ created_at       │                         │
│         │             │     └──────────────────┘                         │
│         │             │                                                  │
│         │             │     ┌──────────────────┐                         │
│         │             └────→│    results       │                         │
│         │                   ├──────────────────┤                         │
│         │                   │ id (PK)          │                         │
│         │                   │ job_id (FK, UQ) ─│──→ jobs.id              │
│         │                   │ features (JSONB) │                         │
│         │                   │ recommendations  │                         │
│         │                   │ tier_snapshot    │                         │
│         │                   │ created_at       │                         │
│         │                   └──────────────────┘                         │
│         │                                                                │
│         │                   ┌──────────────────────────┐                 │
│         └──────────────────→│  hairstyle_embeddings    │                 │
│                             ├──────────────────────────┤                 │
│                             │ id (PK)                  │                 │
│                             │ style_name (UQ)          │                 │
│                             │ description              │                 │
│                             │ suitable_face_shapes     │                 │
│                             │ suitable_hair_types      │                 │
│                             │ suitable_thickness       │                 │
│                             │ maintenance_level        │                 │
│                             │ reference_image_url      │                 │
│                             │ styling_tips             │                 │
│                             │ barber_instructions      │                 │
│                             │ embedding (VECTOR 1536)  │                 │
│                             └──────────────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions (Drizzle Schema)

### users
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| username | VARCHAR(50) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| tier | VARCHAR(10) | DEFAULT 'free' | 'free' or 'pro' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### payments
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| user_id | UUID | FK → users.id | |
| invoice_number | VARCHAR(64) | UNIQUE, NOT NULL | INV-{timestamp}-{random} |
| amount | INTEGER | NOT NULL | IDR, no decimal |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/paid/failed/expired |
| doku_session_id | VARCHAR(255) | | DOKU order session_id |
| doku_token_id | VARCHAR(255) | | DOKU checkout token |
| payment_method | VARCHAR(50) | | QRIS/VA_BCA/CC/etc |
| paid_at | TIMESTAMPTZ | | When payment confirmed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### jobs
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| user_id | UUID | FK → users.id | |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/processing/completed/failed |
| current_step | VARCHAR(50) | | vision/knowledge/ranking/imagegen/done |
| photos | JSONB | | Array of R2 URLs |
| photo_angles | JSONB | | ["front"] or ["front","back","left","right"] |
| tier_snapshot | VARCHAR(10) | | Tier at time of job (free/pro) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| completed_at | TIMESTAMPTZ | | |

### agent_logs
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | INTEGER | PK, auto-increment | |
| job_id | UUID | FK → jobs.id | |
| agent_name | VARCHAR(50) | | vision/knowledge/ranker/imagegen |
| step | VARCHAR(100) | | start/tool_call/tool_result/complete |
| message | TEXT | | Human-readable progress |
| tool_call | VARCHAR(100) | | Tool name if applicable |
| tool_input | JSONB | | Tool input params |
| tool_output | JSONB | | Tool output (truncated) |
| reasoning | TEXT | | Agent's reasoning |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### results
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| job_id | UUID | FK → jobs.id, UNIQUE | One result per job |
| features | JSONB | | FaceFeatures output |
| recommendations | JSONB | | Top 3 (tier-filtered) |
| tier_snapshot | VARCHAR(10) | | Tier at time of result |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### hairstyle_embeddings
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | INTEGER | PK, auto-increment | |
| style_name | VARCHAR(100) | UNIQUE, NOT NULL | |
| description | TEXT | | |
| suitable_face_shapes | JSONB | | ["oval", "round", ...] |
| suitable_hair_types | JSONB | | ["straight", "wavy", ...] |
| suitable_thickness | JSONB | | ["thin", "medium", "thick"] |
| maintenance_level | VARCHAR(20) | | low/medium/high |
| reference_image_url | TEXT | | Pre-generated or null |
| styling_tips | TEXT | | |
| barber_instructions | TEXT | | Locked for free tier |
| embedding | VECTOR(1536) | | pgvector for semantic search |

---

## JSONB Schema Definitions

### jobs.photos
```json
["https://r2.dev/user123/job456/front.webp", "..."]
```

### jobs.photo_angles
```json
["front"]                    // free tier
["front", "back", "left", "right"]  // pro tier
```

### results.features (FaceFeatures)
```json
{
  "face_shape": "oval",
  "face_confidence": 0.87,
  "hair_thickness": "thick",
  "hair_texture": "straight",
  "hairline": "high",
  "forehead_size": "medium",
  "jawline": "angular",
  "current_hairstyle": "medium length, slightly wavy",
  "photos_analyzed": 1,
  "notes": "Rambut tebal, garis rambut tinggi"
}
```

### results.recommendations (Tier-filtered)
```json
[
  {
    "rank": 1,
    "style_name": "Textured Crop",
    "match_percentage": 94,
    "why_match": ["Bentuk wajah oval ideal", "Rambut tebal cocok"],
    "styling_tips": "Gunakan matte clay...",
    "maintenance_tips": "Potong setiap 4-6 minggu",
    "barber_instructions": "Ask for textured crop, 2-3 inches on top...",  // PRO ONLY
    "reference_images": {
      "front": "https://r2.dev/.../textured-crop-front.webp",
      "left": null,   // locked for free
      "right": null,  // locked for free
      "back": null    // locked for free
    },
    "is_locked": false  // rank 1 always unlocked
  },
  {
    "rank": 2,
    "style_name": "Side Part",
    "match_percentage": 89,
    "is_locked": true,  // locked for free
    "locked_message": "Upgrade ke Pro untuk lihat semua rekomendasi"
  },
  {
    "rank": 3,
    "style_name": "French Crop",
    "match_percentage": 85,
    "is_locked": true,
    "locked_message": "Upgrade ke Pro untuk lihat semua rekomendasi"
  }
]
```

---

## Tier Access Control Matrix

| Feature | Free | Pro |
|---------|------|-----|
| Photo upload angles | front only (1) | all 4 (front, back, left, right) |
| Agent pipeline runs | full (all 4 agents) | full (all 4 agents) |
| Recommendations shown | 1 unlocked | all unlocked |
| Generated images | front only | all angles |
| Barber instructions | locked | unlocked |
| Location/barbershop | locked | unlocked |
| Agent progress logs | visible | visible |

---

## DOKU Payment Flow (Detail)

```
1. User klik "Upgrade to Pro" di FE
2. FE → POST /api/payment/create (Bearer JWT)
3. Backend:
   a. Create payment record (status: pending)
   b. Generate invoice_number: INV-{timestamp}-{random}
   c. Hit DOKU API:
      POST https://sandbox.doku.com/checkout/v1/payment
      Headers: Client-Id, Request-Id, Request-Timestamp, Signature
      Body: { order: { amount, invoice_number }, payment: { ... } }
   d. DOKU return: { payment.url, token_id, session_id }
   e. Save doku_session_id, doku_token_id ke DB
   f. Return { paymentUrl, invoiceNumber }
4. FE redirect user ke paymentUrl (DOKU Checkout page)
5. User pilih payment method, bayar
6. DOKU send webhook ke Backend:
      POST /api/payment/webhook
      Body: { order: { invoice_number, status }, ... }
   Backend:
   a. Verify signature
   b. Update payment status → 'paid'
   c. Update user tier → 'pro'
7. User redirect balik ke app (callback_url)
8. FE check user tier → unlock all features
```

---

*Last updated: 15 Mei 2026, 12:58 WIB*
