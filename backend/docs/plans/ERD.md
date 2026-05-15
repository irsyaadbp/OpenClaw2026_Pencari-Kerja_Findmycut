# FindMyCut — Entity Relationship Diagram (ERD)

> **Last updated:** 15 Mei 2026, 13:20 WIB

---

## ERD (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌──────────────────┐          ┌──────────────────┐                        │
│   │      users       │          │    payments      │                        │
│   ├──────────────────┤          ├──────────────────┤                        │
│   │ id (PK, UUID)    │────┐     │ id (PK, UUID)    │                        │
│   │ username (UQ)    │    │     │ user_id (FK) ────│──→ users.id             │
│   │ email (UQ)       │    │     │ invoice_number   │                        │
│   │ password_hash    │    │     │ amount           │                        │
│   │ google_id        │    │     │ tier             │                        │
│   │ device_id        │    │     │ status           │                        │
│   │ tier             │    │     │ doku_session_id  │                        │
│   │ created_at       │    │     │ doku_token_id    │                        │
│   └──────────────────┘    │     │ payment_method   │                        │
│          │                │     │ paid_at          │                        │
│          │                │     │ created_at       │                        │
│          │                │     └──────────────────┘                        │
│          │                │                                                  │
│          │                │     ┌──────────────────┐                        │
│          │                ├────→│    analyses      │                        │
│          │                │     ├──────────────────┤                        │
│          │                │     │ id (PK, UUID)    │                        │
│          │                │     │ user_id (FK) ────│──→ users.id             │
│          │                │     │ image_url        │                        │
│          │                │     │ face_shape       │                        │
│          │                │     │ face_confidence  │                        │
│          │                │     │ hair_density     │                        │
│          │                │     │ hair_texture     │                        │
│          │                │     │ status           │                        │
│          │                │     │ current_agent    │                        │
│          │                │     │ created_at       │                        │
│          │                │     └──────────────────┘                        │
│          │                │            │                                     │
│          │                │            │ 1:N                                 │
│          │                │            ↓                                     │
│          │                │     ┌──────────────────┐                        │
│          │                │     │   agent_logs     │                        │
│          │                │     ├──────────────────┤                        │
│          │                │     │ id (PK, SERIAL)  │                        │
│          │                │     │ analysis_id (FK) │──→ analyses.id          │
│          │                │     │ agent_name       │                        │
│          │                │     │ step             │                        │
│          │                │     │ message          │                        │
│          │                │     │ tool_call        │                        │
│          │                │     │ tool_input       │                        │
│          │                │     │ tool_output      │                        │
│          │                │     │ reasoning        │                        │
│          │                │     │ created_at       │                        │
│          │                │     └──────────────────┘                        │
│          │                │                                                  │
│          │                │     ┌──────────────────────┐                    │
│          │                └────→│  recommendations     │                    │
│          │                      ├──────────────────────┤                    │
│          │                      │ id (PK, UUID)        │                    │
│          │                      │ analysis_id (FK, UQ) │──→ analyses.id      │
│          │                      │ style_name           │                    │
│          │                      │ match_score          │                    │
│          │                      │ barber_instruction   │                    │
│          │                      │ maintenance          │                    │
│          │                      │ styling_tips         │                    │
│          │                      │ image_urls (JSONB)   │                    │
│          │                      │ barbershop (JSONB)   │                    │
│          │                      │ is_locked            │                    │
│          │                      │ created_at           │                    │
│          │                      └──────────────────────┘                    │
│          │                                                                   │
│          │                      ┌──────────────────────────┐                │
│          └─────────────────────→│  hairstyle_embeddings    │                │
│                                 ├──────────────────────────┤                │
│                                 │ id (PK, SERIAL)          │                │
│                                 │ style_name (UQ)          │                │
│                                 │ description              │                │
│                                 │ suitable_face_shapes     │                │
│                                 │ suitable_hair_types      │                │
│                                 │ suitable_thickness       │                │
│                                 │ maintenance_level        │                │
│                                 │ reference_image_url      │                │
│                                 │ styling_tips             │                │
│                                 │ barber_instruction       │                │
│                                 │ embedding (VECTOR 1536)  │                │
│                                 └──────────────────────────┘                │
│                                                                             │
│                                 ┌──────────────────────────┐                │
│                                 │   barbershop_cache       │                │
│                                 ├──────────────────────────┤                │
│                                 │ id (PK, UUID)            │                │
│                                 │ google_place_id (UQ)     │                │
│                                 │ name                     │                │
│                                 │ address                  │                │
│                                 │ lat (FLOAT)              │                │
│                                 │ lng (FLOAT)              │                │
│                                 │ rating (FLOAT)           │                │
│                                 │ phone                    │                │
│                                 │ city                     │                │
│                                 │ specialties (JSONB)      │                │
│                                 │ price_range              │                │
│                                 │ image_url                │                │
│                                 │ area_key                 │                │
│                                 │ source                   │                │
│                                 │ fetched_at               │                │
│                                 │ created_at               │                │
│                                 └──────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### users
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| username | VARCHAR(50) | UNIQUE, nullable | For registered users |
| email | VARCHAR(255) | UNIQUE, nullable | For Google OAuth |
| password_hash | VARCHAR(255) | nullable | bcrypt, nullable for OAuth/anonymous |
| google_id | VARCHAR(255) | UNIQUE, nullable | Google OAuth ID |
| device_id | VARCHAR(255) | UNIQUE, nullable | Anonymous session |
| tier | VARCHAR(10) | DEFAULT 'free' | 'free' or 'pro' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Auth methods:**
- Anonymous: `device_id` set, `username/password/email/google_id` null
- Username-password: `username + password_hash` set
- Google: `email + google_id` set

### payments
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| user_id | UUID | FK → users.id | |
| invoice_number | VARCHAR(64) | UNIQUE, NOT NULL | INV-{timestamp}-{random} |
| amount | INTEGER | NOT NULL | IDR (e.g., 15000) |
| tier | VARCHAR(10) | NOT NULL | 'pro' |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/paid/failed/expired |
| doku_session_id | VARCHAR(255) | | DOKU order session |
| doku_token_id | VARCHAR(255) | | DOKU checkout token |
| payment_method | VARCHAR(50) | | QRIS/VA_BCA/CC/OVO/etc |
| paid_at | TIMESTAMPTZ | | When payment confirmed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### analyses
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| user_id | UUID | FK → users.id | |
| image_url | TEXT | NOT NULL | R2 URL of uploaded photo |
| face_shape | VARCHAR(20) | | oval/round/square/heart/oblong/diamond |
| face_confidence | FLOAT | | 0.0-1.0 |
| hair_density | VARCHAR(20) | | thin/medium/thick |
| hair_texture | VARCHAR(20) | | straight/wavy/curly/coily |
| status | VARCHAR(20) | DEFAULT 'processing' | processing/completed/failed |
| current_agent | VARCHAR(50) | | vision/knowledge/ranker/imagegen/done |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### agent_logs
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | SERIAL | PK | |
| analysis_id | UUID | FK → analyses.id | |
| agent_name | VARCHAR(50) | | vision/knowledge/ranker/imagegen |
| step | VARCHAR(100) | | start/tool_call/tool_result/complete |
| message | TEXT | | Human-readable progress |
| tool_call | VARCHAR(100) | | Tool name |
| tool_input | JSONB | | Tool input params |
| tool_output | JSONB | | Tool output (truncated) |
| reasoning | TEXT | | Agent reasoning |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### recommendations
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| analysis_id | UUID | FK → analyses.id, UNIQUE | One set per analysis |
| style_name | VARCHAR(100) | NOT NULL | "Textured Crop" |
| match_score | FLOAT | NOT NULL | 0-100 |
| barber_instruction | TEXT | | Full barber instructions |
| maintenance | TEXT | | Maintenance tips |
| styling_tips | TEXT | | Styling product suggestions |
| image_urls | JSONB | | `{ front, left, right, back, top }` |
| barbershop | JSONB | | `{ instruction, location }` or null |
| is_locked | BOOLEAN | DEFAULT true | true for free tier locked items |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### hairstyle_embeddings
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | SERIAL | PK | |
| style_name | VARCHAR(100) | UNIQUE, NOT NULL | |
| description | TEXT | | |
| suitable_face_shapes | JSONB | | ["oval", "round", ...] |
| suitable_hair_types | JSONB | | ["straight", "wavy", ...] |
| suitable_thickness | JSONB | | ["thin", "medium", "thick"] |
| maintenance_level | VARCHAR(20) | | low/medium/high |
| reference_image_url | TEXT | | Pre-generated or null |
| styling_tips | TEXT | | |
| barber_instruction | TEXT | | |
| embedding | VECTOR(1536) | | pgvector for semantic search |

### barbershop_cache
| Column | Type | Constraint | Notes |
|--------|------|-----------|-------|
| id | UUID | PK, default random | |
| google_place_id | VARCHAR(255) | UNIQUE, nullable | Google Places API ID |
| name | VARCHAR(255) | NOT NULL | Nama barbershop |
| address | TEXT | | Alamat lengkap |
| lat | FLOAT | NOT NULL | Latitude |
| lng | FLOAT | NOT NULL | Longitude |
| rating | FLOAT | | Rating (1.0-5.0) |
| phone | VARCHAR(50) | | Nomor telepon |
| city | VARCHAR(100) | | Kota |
| specialties | JSONB | | ["textured crop", "fade", ...] |
| price_range | VARCHAR(50) | | "Rp50.000 - Rp100.000" |
| image_url | TEXT | | URL foto barbershop |
| area_key | VARCHAR(20) | NOT NULL | lat/lng dibulatkan 2 desimal, e.g. "-7.29_112.73" |
| source | VARCHAR(20) | DEFAULT 'json' | "json" atau "google_maps" |
| fetched_at | TIMESTAMPTZ | DEFAULT NOW() | Kapan data di-fetch (untuk TTL) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Hybrid Strategy:**
- `source = "json"` → data dari seed barbershops.json (gratis)
- `source = "google_maps"` → data dari Google Maps Places API (berbayar)
- `area_key` → cache key per area (~1km²), cegah hit API berulang
- TTL: data `google_maps` expired setelah 7 hari → re-fetch jika user request lagi

---

## JSONB Schemas

### recommendations.image_urls
```json
{
  "front": "https://r2.dev/.../style-front.webp",
  "left": "https://r2.dev/.../style-left.webp",
  "right": "https://r2.dev/.../style-right.webp",
  "back": "https://r2.dev/.../style-back.webp",
  "top": "https://r2.dev/.../style-top.webp"
}
```

### recommendations.barbershop
```json
{
  "instruction": "Sides: #1.5 blended to #3. Top: Leave 6-7cm, add texture. Finish: Natural.",
  "maintenance": "Trim every 4-5 weeks. Styling: Clay for texture, blow dry upward.",
  "location": {
    "id": "1",
    "name": "Barbershop XYZ",
    "address": "Jl. Raya Darmo No. 10",
    "phone": "08123456789",
    "latitude": "-7.2756",
    "longitude": "112.7341",
    "image": "https://example.com/barbershop.jpg"
  }
}
```

---

## Tier Access Matrix

| Feature | Free | Pro (Rp15k) |
|---------|------|-------------|
| Photo angles | depan only | depan, kanan, kiri, belakang |
| Agent pipeline | full (4 agents) | full (4 agents) |
| Recommendations shown | 1 clear + 5 locked | all 6 clear |
| Generated images | front only | all angles |
| Barber instructions | locked | unlocked |
| Styling tips | locked | unlocked |
| Location/barbershop | locked | unlocked |
| Sort order | lowest match first | highest match first |

---

## DOKU Payment Flow

```
1. User klik "Upgrade to Pro"
2. FE → POST /api/v1/payments/checkout { user_id, tier: "pro", analysis_id }
3. Backend:
   a. Create payment record (status: pending)
   b. Generate invoice_number
   c. Hit DOKU Checkout API
   d. DOKU return: { payment.url, token_id }
   e. Save doku_token_id ke DB
   f. Return { checkout_url, transaction_id }
4. FE redirect user ke checkout_url (DOKU page)
5. User pilih payment method, bayar
6. DOKU webhook → POST /api/v1/payments/webhook
   Backend:
   a. Verify signature
   b. Update payment status → 'paid'
   c. Update user tier → 'pro'
   d. Unlock recommendations (is_locked → false)
7. User redirect balik ke app
8. FE refetch recommendations → all unlocked
```

---

*Last updated: 15 Mei 2026, 13:20 WIB*
