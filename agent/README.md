# FindMyCut — AI Agent Pipeline

> **Hackathon:** OpenClaw Agenthon Indonesia 2026 | **Team:** Pencari Kerja

## What is this folder?

This folder contains the **AI brain** of FindMyCut — a multi-agent system that takes a user's selfie photo and autonomously determines the best hairstyle recommendations. It runs as a pipeline of 5 specialized AI agents, each with its own reasoning loop, tools, and decision-making capabilities.

The agent pipeline is **imported and executed by the backend** (`/backend/src/services/agent-runner.service.ts`) as an async background process. It is NOT a standalone server — it's a library that the backend calls.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Vision AI | Z.AI GLM-5-Turbo via Anthropic SDK (multimodal image understanding) |
| Reasoning LLM | Z.AI GLM-5-Turbo via Anthropic SDK (tool calling + reasoning) |
| Image Generation | Replicate `black-forest-labs/flux-2-pro` |
| Runtime | Bun + TypeScript |
| Agent Framework | Custom-built autonomous loop (`runner.ts`) |
| Knowledge Base | Local JSON files + Neon PostgreSQL (hybrid strategy) |

---

## How It Works — Detailed Flow

When a user uploads a selfie and triggers analysis, the backend calls `runPipeline()` from this folder. Here's exactly what happens:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FULL PIPELINE FLOW                               │
│                                                                         │
│  INPUT: Photo URL(s) from Cloudflare R2                                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AGENT 1: Vision Analyzer                                        │    │
│  │                                                                 │    │
│  │ 1. Receives photo URL                                           │    │
│  │ 2. LLM decides to call analyze_image tool                      │    │
│  │ 3. Tool sends photo to GLM-5-Turbo multimodal endpoint         │    │
│  │ 4. GLM-5-Turbo "sees" the photo and returns structured JSON:   │    │
│  │    { face_shape: "oval", hair_texture: "straight", ... }       │    │
│  │ 5. If multiple photos: LLM calls merge_analyses to combine     │    │
│  │ 6. Returns final FaceFeatures                                   │    │
│  │                                                                 │    │
│  │ Output: { face_shape, face_confidence, hair_thickness,          │    │
│  │           hair_texture, hairline, jawline, forehead_size }      │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AGENT 2: Knowledge / Style Matcher                              │    │
│  │                                                                 │    │
│  │ 1. Receives FaceFeatures from Agent 1                           │    │
│  │ 2. LLM calls query_face_shape_guide("oval")                    │    │
│  │    → Returns recommended styles for oval face                   │    │
│  │ 3. For each style, LLM calls query_hair_compatibility          │    │
│  │    → Checks if style works with user's hair type               │    │
│  │ 4. For compatible styles, LLM calls get_style_details           │    │
│  │    → Gets full barber instructions, styling tips                │    │
│  │ 5. Returns list of compatible candidates                        │    │
│  │                                                                 │    │
│  │ Data sources (hybrid):                                          │    │
│  │   - Primary: PostgreSQL hairstyle_embeddings table              │    │
│  │   - Fallback: Local JSON (face-shapes.json, styles.json)        │    │
│  │                                                                 │    │
│  │ Guarantee: If LLM fails, fallback returns 3-6 candidates        │    │
│  │                                                                 │    │
│  │ Output: StyleCandidate[] (3-6 hairstyles with full details)     │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AGENT 3: Ranker & Explainer                                     │    │
│  │                                                                 │    │
│  │ 1. Receives FaceFeatures + StyleCandidates                      │    │
│  │ 2. For each candidate, LLM calls calculate_match_score          │    │
│  │    → Weighted scoring: face 25% + hair 15% + thickness 10%     │    │
│  │ 3. Sorts by score, picks top 3                                  │    │
│  │ 4. For top 3, LLM calls generate_explanation                    │    │
│  │    → This tool INTERNALLY calls LLM again to write a personal   │    │
│  │      explanation in Indonesian (not a template!)                 │    │
│  │ 5. For top 3, LLM calls validate_recommendation                 │    │
│  │    → Self-checks: is score consistent with features?            │    │
│  │    → Removes any that fail validation                           │    │
│  │ 6. Returns final ranked JSON                                    │    │
│  │                                                                 │    │
│  │ Guarantee: If LLM parse fails, builds recommendations from      │    │
│  │            candidates directly (never returns 0)                 │    │
│  │                                                                 │    │
│  │ Output: Recommendation[] (top 3 with scores + explanations)     │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AGENT 4: Image Generator                                        │    │
│  │                                                                 │    │
│  │ 1. Receives top 1 recommendation                                │    │
│  │ 2. LLM calls generate_hairstyle_image tool                     │    │
│  │ 3. Tool builds prompt: "Professional photo of man with          │    │
│  │    [style name] haircut, studio lighting, front view"           │    │
│  │ 4. Calls Replicate flux-2-pro API → generates image            │    │
│  │ 5. Returns image URL (replicate.delivery/...)                   │    │
│  │ 6. URL is captured and mapped back to recommendation            │    │
│  │                                                                 │    │
│  │ After pipeline: Backend downloads image → converts to WebP      │    │
│  │                 → uploads to Cloudflare R2 (permanent URL)      │    │
│  │                                                                 │    │
│  │ Output: recommendation.image_urls.front = R2 URL                │    │
│  └──────────────────────────────┬──────────────────────────────────┘    │
│                                 ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AGENT 5: Barbershop Finder (optional — needs user location)     │    │
│  │                                                                 │    │
│  │ Skipped if no lat/lng provided.                                 │    │
│  │                                                                 │    │
│  │ 1. Receives recommendations + user coordinates                  │    │
│  │ 2. LLM calls search_nearby_barbershops(lat, lng, radius)       │    │
│  │    → Hybrid: DB cache → Google Maps API → JSON fallback         │    │
│  │    → Calculates Haversine distance to each barbershop           │    │
│  │ 3. LLM matches barbershop specialties with recommended styles   │    │
│  │ 4. Returns top 3 barbershops with match reasoning               │    │
│  │                                                                 │    │
│  │ Output: BarbershopMatchResult (top 3 nearby shops)              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  FINAL OUTPUT: { features, recommendations, barbershops }               │
│                                                                         │
│  Backend then:                                                          │
│  1. Saves features to analyses table                                    │
│  2. Downloads generated images → R2 (permanent URLs)                    │
│  3. Saves recommendations to DB                                         │
│  4. Sets status = "completed"                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Agent Runner Engine (`runner.ts`)

Every agent (except Vision's image analysis) uses the same autonomous loop:

```
┌─────────────────────────────────────────────────┐
│            AUTONOMOUS AGENT LOOP                 │
│                                                  │
│  1. Send system prompt + user message to LLM     │
│                    ↓                             │
│  2. LLM responds with:                           │
│     ├── tool_use blocks → execute tools          │
│     │   ├── Run tool function                    │
│     │   ├── Get result                           │
│     │   └── Feed result back to LLM             │
│     │        ↓                                   │
│     │   (loop back to step 2)                    │
│     │                                            │
│     └── text only → agent is done                │
│         └── Parse JSON from text → return        │
│                                                  │
│  Max iterations: 8-15 (varies per agent)         │
│  Error recovery: retry with context on failure   │
└─────────────────────────────────────────────────┘
```

The LLM **autonomously decides**:
- Which tool to call next
- What parameters to pass
- When it has enough information to stop
- How to handle unexpected results

This is genuine agentic behavior — not scripted function calls.

---

## Autonomous Behavior (for Judges)

| Behavior | How It's Demonstrated |
|----------|----------------------|
| **Independent Decision Making** | LLM chooses which tools to call and in what order — not hardcoded |
| **Multi-turn Reasoning** | Agent processes tool results, reasons about them, then decides next action |
| **Self-Validation** | Ranker Agent calls `validate_recommendation` to check its own output |
| **LLM-Powered Explanations** | `generate_explanation` tool internally calls LLM to write personal reasons (not templates) |
| **Error Recovery** | On LLM failure, agent gets error context and retries with different approach |
| **Graceful Degradation** | If any agent fails, pipeline continues with fallback data |
| **Hybrid Data Access** | Agents query DB first, fall back to JSON — adapts to data availability |

**Total tool calls per pipeline run: ~15-25**

---

## 13 Tools Across 5 Agents

| Agent | Tool | What It Does |
|-------|------|-------------|
| Vision | `analyze_image` | Sends photo to GLM-5-Turbo multimodal → extracts face/hair features |
| Vision | `merge_analyses` | Combines multiple angle analyses via majority vote |
| Knowledge | `query_face_shape_guide` | Gets recommended styles for a face shape (DB → JSON) |
| Knowledge | `query_hair_compatibility` | Checks if style works with hair type/thickness |
| Knowledge | `get_style_details` | Gets full style info (barber instructions, tips) |
| Knowledge | `list_all_styles` | Lists all available styles from DB + JSON |
| Ranker | `calculate_match_score` | Weighted scoring algorithm (face 25%, hair 15%, thickness 10%) |
| Ranker | `generate_explanation` | **LLM call** — writes personal explanation in Indonesian |
| Ranker | `validate_recommendation` | Self-check: is score consistent with features? |
| ImageGen | `generate_hairstyle_image` | Calls Replicate flux-2-pro → generates reference photo |
| Barbershop | `search_nearby_barbershops` | Hybrid search: DB cache → Google Maps → JSON |
| Barbershop | `get_barbershop_details` | Gets full barbershop info by ID |
| Barbershop | `calculate_distance` | Haversine distance between two coordinates |

---

## Real-time Progress Logging

Every agent step is logged to `agent_logs` table in real-time. The frontend polls `GET /analyses/:id/status` to show live progress:

```
[vision]     start: Memulai analisis foto...
[vision]     💭 I'll start by analyzing the front-facing photo...
[vision]     🔧 Memanggil analyze_image(angle="depan")
[vision]     ✅ analyze_image → face_shape: oval (85%)
[vision]     complete: Analisis selesai: oval (85%), rambut straight thick

[knowledge]  start: Mencari gaya rambut yang cocok...
[knowledge]  🔧 Memanggil query_face_shape_guide(face_shape="oval")
[knowledge]  ✅ query_face_shape_guide → 6 styles
[knowledge]  complete: 6 kandidat gaya rambut ditemukan

[ranking]    start: Menghitung skor dan ranking...
[ranking]    🔧 Memanggil calculate_match_score(style="Textured Crop")
[ranking]    ✅ calculate_match_score → score: 85%
[ranking]    🔧 Memanggil generate_explanation(style="Textured Crop")
[ranking]    ✅ generate_explanation → "Textured Crop cocok karena wajah oval..."
[ranking]    🔧 Memanggil validate_recommendation(score=85)
[ranking]    ✅ validate_recommendation → ✓ valid
[ranking]    complete: Top 3 rekomendasi siap!

[imagegen]   start: Generate gambar referensi...
[imagegen]   🔧 Memanggil generate_hairstyle_image(style="Textured Crop")
[imagegen]   ✅ generate_hairstyle_image → image saved to R2
[imagegen]   complete: Gambar referensi siap!

[barbershop] skip: Lokasi tidak tersedia — barbershop finder dilewati
```

---

## File Structure

```
agent/src/
├── index.ts              # Export: runPipeline (entry point for backend)
├── pipeline.ts           # Orchestrates 5 agents sequentially
├── runner.ts             # Core autonomous loop engine (Anthropic SDK)
├── types.ts              # TypeScript interfaces (FaceFeatures, Recommendation, etc.)
├── agents/
│   ├── vision.ts         # Agent 1: Multimodal photo analysis
│   ├── knowledge.ts      # Agent 2: Style matching with fallback guarantee
│   ├── ranker.ts         # Agent 3: Scoring + LLM explanations + self-validation
│   ├── imagegen.ts       # Agent 4: Replicate image generation
│   └── barbershop.ts     # Agent 5: Location-based barbershop search
├── tools/
│   ├── vision-tools.ts   # analyze_image, merge_analyses
│   ├── knowledge-tools.ts # query_face_shape_guide, query_hair_compatibility, get_style_details, list_all_styles
│   ├── ranker-tools.ts   # calculate_match_score, generate_explanation (LLM), validate_recommendation
│   ├── imagegen-tools.ts # generate_hairstyle_image
│   └── barbershop-tools.ts # search_nearby_barbershops, get_barbershop_details, calculate_distance
├── knowledge/            # Local knowledge base (JSON)
│   ├── face-shapes.json  # 6 face shapes → recommended/avoided styles
│   ├── hair-types.json   # 4 textures × 3 thicknesses → compatibility matrix
│   ├── styles.json       # 6 hairstyle definitions with barber instructions
│   └── barbershops.json  # 5 curated barbershops in Indonesia
└── lib/
    ├── llm.ts            # Anthropic SDK client (Z.AI GLM-5-Turbo)
    └── replicate.ts      # Vision analysis (Anthropic) + Image generation (Replicate)
```

---

## AI Models Used

| Agent | Model | Provider | Cost | Purpose |
|-------|-------|----------|------|---------|
| Vision | GLM-5-Turbo | Z.AI (Anthropic-compatible) | Included in plan | See photo → extract face/hair features |
| Knowledge | GLM-5-Turbo | Z.AI (Anthropic-compatible) | Included in plan | Reason about style compatibility |
| Ranker | GLM-5-Turbo | Z.AI (Anthropic-compatible) | Included in plan | Score, explain, validate |
| ImageGen | flux-2-pro | Replicate | ~$0.05/image | Generate photorealistic hairstyle reference |
| Barbershop | GLM-5-Turbo | Z.AI (Anthropic-compatible) | Included in plan | Match shops to styles |

---

## Guarantees

- ✅ **Always returns recommendations** — fallback to JSON knowledge base if LLM fails
- ✅ **Always generates at least 1 image** — top recommendation always gets an image
- ✅ **Always reaches "completed" status** — graceful error handling at every stage
- ✅ **No visible errors in frontend** — LLM errors suppressed from progress logs
- ✅ **Pipeline never blocks the server** — runs async in background
- ✅ **Deterministic fallback** — even if all LLM calls fail, user gets recommendations from local JSON
