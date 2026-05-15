# FindMyCut — AI Agent Pipeline

> **Hackathon:** OpenClaw Agenthon Indonesia 2026 | **Team:** Pencari Kerja

Multi-agent AI system that analyzes face photos and recommends personalized hairstyles. 5 autonomous agents run sequentially, each with independent tool-calling loops, self-validation, and real-time progress logging.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Vision AI | Z.AI GLM-5-Turbo (Anthropic SDK) |
| Reasoning LLM | Z.AI GLM-5-Turbo (tool calling) |
| Image Generation | Replicate flux-2-pro |
| Runtime | Bun + TypeScript |
| Knowledge Base | JSON files + Neon PostgreSQL (hybrid) |

---

## How It Works

```
📸 User Photo → 5 AI Agents → 📊 Recommendations + 🖼️ Generated Images
```

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT PIPELINE                            │
│                                                             │
│  📸 Photo ──→ 🔍 Vision ──→ 🎨 Knowledge ──→ ⭐ Ranker     │
│                                                   ↓         │
│              📍 Barbershop ←── 🖼️ ImageGen ←─────┘         │
│                                                             │
│  Output: FaceFeatures + Recommendations + Images + Shops    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5 Agents

### Agent 1: 🔍 Vision Analyzer
| | |
|---|---|
| **Model** | Z.AI GLM-5-Turbo (multimodal) |
| **Input** | User selfie photo URL |
| **Output** | Face shape, hair texture, thickness, jawline, hairline |
| **Tools** | `analyze_image`, `merge_analyses` |

Analyzes the photo and extracts structured facial/hair features as JSON.

---

### Agent 2: 🎨 Style Matcher (Knowledge)
| | |
|---|---|
| **Model** | Z.AI GLM-5-Turbo (tool calling) |
| **Input** | FaceFeatures from Agent 1 |
| **Output** | 3-6 compatible hairstyle candidates |
| **Tools** | `query_face_shape_guide`, `query_hair_compatibility`, `get_style_details`, `list_all_styles` |
| **Data** | Hybrid: PostgreSQL DB → JSON fallback |

Matches user features against hairstyle knowledge base. Always returns candidates (fallback guarantee).

---

### Agent 3: ⭐ Ranker & Explainer
| | |
|---|---|
| **Model** | Z.AI GLM-5-Turbo (tool calling) |
| **Input** | FaceFeatures + StyleCandidates |
| **Output** | Top 3 ranked recommendations with personalized explanations |
| **Tools** | `calculate_match_score`, `generate_explanation` (LLM-powered), `validate_recommendation` |

Scores each candidate, generates personal AI explanations in Indonesian, and self-validates consistency.

---

### Agent 4: 🖼️ Image Generator
| | |
|---|---|
| **Model** | Replicate black-forest-labs/flux-2-pro |
| **Input** | Top recommendation style name |
| **Output** | Generated hairstyle reference image → R2 |
| **Tools** | `generate_hairstyle_image` |

Generates a photorealistic reference image for the top recommendation.

---

### Agent 5: 📍 Barbershop Finder (optional)
| | |
|---|---|
| **Model** | Z.AI GLM-5-Turbo (tool calling) |
| **Input** | Recommendations + user lat/lng |
| **Output** | Top 3 nearby barbershops |
| **Tools** | `search_nearby_barbershops`, `get_barbershop_details`, `calculate_distance` |
| **Data** | Hybrid: DB cache → Google Maps API → JSON fallback |

Finds nearby barbershops matching recommended styles. Skipped if no location provided.

---

## Autonomous Behavior (for Judges)

Each agent demonstrates genuine autonomous AI behavior:

1. **Independent Decision Making** — LLM decides which tools to call and in what order
2. **Multi-turn Reasoning** — Agent processes tool results and reasons about next steps
3. **Self-Validation** — Ranker checks its own recommendations for logical consistency
4. **Error Recovery** — On failure, agent retries with different approach
5. **Personalized Output** — LLM generates unique explanations per user (not templates)

**Total tool calls per pipeline run: ~15-25** (demonstrates strong agentic behavior)

---

## Real-time Progress (visible in demo)

Every step is logged to `agent_logs` table and visible via `GET /analyses/:id/status`:

```
[vision]     🔧 Memanggil analyze_image(angle="depan")
[vision]     ✅ analyze_image → face_shape: oval (85%)
[knowledge]  🔧 Memanggil query_face_shape_guide(face_shape="oval")
[knowledge]  ✅ query_face_shape_guide → 6 styles
[ranking]    🔧 Memanggil calculate_match_score(style="Textured Crop")
[ranking]    ✅ calculate_match_score → score: 85%
[ranking]    🔧 Memanggil generate_explanation(...)
[ranking]    ✅ generate_explanation → "Textured Crop cocok karena..."
[ranking]    🔧 Memanggil validate_recommendation(...)
[ranking]    ✅ validate_recommendation → ✓ valid
[imagegen]   🔧 Memanggil generate_hairstyle_image(style="Textured Crop")
[imagegen]   ✅ generate_hairstyle_image → image saved to R2
[barbershop] skip: Lokasi tidak tersedia
```

---

## File Structure

```
agent/src/
├── index.ts              # Export runPipeline
├── pipeline.ts           # Orchestrate 5 agents sequentially
├── runner.ts             # Core autonomous loop (Anthropic SDK)
├── types.ts              # TypeScript interfaces
├── agents/
│   ├── vision.ts         # Agent 1: Photo analysis
│   ├── knowledge.ts      # Agent 2: Style matching (hybrid DB+JSON)
│   ├── ranker.ts         # Agent 3: Scoring + LLM explanations
│   ├── imagegen.ts       # Agent 4: Image generation
│   └── barbershop.ts     # Agent 5: Location-based search
├── tools/
│   ├── vision-tools.ts   # 2 tools
│   ├── knowledge-tools.ts # 4 tools (hybrid DB queries)
│   ├── ranker-tools.ts   # 3 tools (incl. LLM-powered explanation)
│   ├── imagegen-tools.ts # 1 tool
│   └── barbershop-tools.ts # 3 tools (hybrid Google Maps)
├── knowledge/
│   ├── face-shapes.json  # 6 face shapes → recommended styles
│   ├── hair-types.json   # 4 textures × 3 thicknesses
│   ├── styles.json       # 6 hairstyle definitions
│   └── barbershops.json  # Curated barbershops (Indonesia)
└── lib/
    ├── llm.ts            # Anthropic SDK client (Z.AI GLM-5-Turbo)
    └── replicate.ts      # Vision (Anthropic) + Image Gen (Replicate)
```

---

## AI Models Used

| Agent | Model | Provider | Purpose |
|-------|-------|----------|---------|
| Vision | GLM-5-Turbo | Z.AI (Anthropic API) | Multimodal face/hair analysis |
| Knowledge | GLM-5-Turbo | Z.AI (Anthropic API) | Tool calling + reasoning |
| Ranker | GLM-5-Turbo | Z.AI (Anthropic API) | Scoring + personalized explanations |
| ImageGen | flux-2-pro | Replicate | Photorealistic hairstyle generation |
| Barbershop | GLM-5-Turbo | Z.AI (Anthropic API) | Location matching + reasoning |

---

## Guarantees

- ✅ **Always returns recommendations** (fallback to JSON if LLM fails)
- ✅ **Always generates at least 1 image** (top recommendation)
- ✅ **Always reaches "completed" status** (graceful error handling)
- ✅ **No visible errors in FE** (LLM errors suppressed from progress logs)
- ✅ **Pipeline never blocks** (async, non-blocking execution)
