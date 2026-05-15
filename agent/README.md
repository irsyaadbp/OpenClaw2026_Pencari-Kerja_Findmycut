# FindMyCut — Agent Workspace

Multi-agent AI pipeline for haircut recommendation. 5 agents run sequentially, each with **autonomous tool-calling loops** and **self-correction capabilities**. Agent 4 (Image Gen) and Agent 5 (Barbershop Finder) are optional — the pipeline continues even if they fail.

---

## How It Works

```
📸 User Photos → Agent Pipeline → 📊 Recommendations + 📍 Barbershops
```

The pipeline consists of 5 specialized AI agents that communicate via structured JSON. Each agent has its own system prompt, tool definitions, and autonomous reasoning loop with **real-time progress logging**.

---

## Key Features

- **5 Autonomous Agents** — each with independent tool-calling loops
- **LLM-Powered Reasoning** — agents think, decide, and explain using AI
- **Self-Validation** — Ranker Agent validates its own recommendations before finalizing
- **Hybrid Knowledge** — DB-first queries with JSON fallback
- **Real-time Logging** — every thought, tool call, and result logged to `agent_logs` table
- **Error Recovery** — agents retry with different approaches on failure
- **Personalized Explanations** — LLM generates unique, personal reasons for each user

---

## Agent Pipeline Flow

```
Photo URLs (1-4)
      ↓
┌─────────────────────────────────────┐
│  🔍 Agent 1: Vision Analyzer        │
│  API: Replicate moondream2          │
│  Tools: analyze_image, merge        │
│  Output: FaceFeatures JSON          │
│  Iterations: 2-6                    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  🎨 Agent 2: Style Matcher          │
│  API: MiMo (OpenAI-compatible)      │
│  Tools: query_face_shape,           │
│         query_compatibility,        │
│         get_style_details,          │
│         list_all_styles             │
│  Data: DB (hairstyle_embeddings)    │
│        + JSON fallback              │
│  Output: StyleCandidate[]           │
│  Iterations: 8-15                   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  ⭐ Agent 3: Ranker & Explainer     │
│  API: MiMo (OpenAI-compatible)      │
│  4-Phase Autonomous Workflow:       │
│    Phase 1: Score (calculate_score) │
│    Phase 2: Explain (LLM-generated) │
│    Phase 3: Validate (self-check)   │
│    Phase 4: Final ranked output     │
│  Tools: calculate_match_score,      │
│         generate_explanation,       │
│         validate_recommendation     │
│  Output: Recommendation[]           │
│  Iterations: 12-20                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  🖼️ Agent 4: Image Generator        │  ← optional
│  API: Replicate FLUX-2-pro          │
│  Tools: generate_hairstyle_image    │
│  Output: image URLs → R2            │
│  Iterations: 3-12                   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  📍 Agent 5: Barbershop Finder      │  ← optional, pro-only
│  API: MiMo (tool calling)           │
│  Tools: search_nearby,              │
│         get_details,                │
│         calculate_distance          │
│  Data: DB cache → Google Maps API   │
│        → JSON fallback              │
│  Output: top 3 barbershops nearby   │
│  Iterations: 3-6                    │
└─────────────────────────────────────┘
```

**Total tool calls per pipeline: ~30-50** (demonstrates strong autonomous agent behavior)

---

## Agent Details

### Agent 1: Vision Analyzer

**Purpose:** Analyze user photos and extract facial/hair features as structured data.

**API:** Replicate `lucataco/moondream2` (vision language model)

**Tools:**

| Tool | Input | Output |
|------|-------|--------|
| `analyze_image` | `{ image_url, angle }` | Face shape, hair thickness, texture, hairline, jawline, etc. |
| `merge_analyses` | `{ analyses[] }` | Merged FaceFeatures using majority vote |

**Autonomous Loop:**
```
Iteration 1: Call analyze_image(photo_1, "depan")
Iteration 2: Call analyze_image(photo_2, "kanan")   [pro only]
Iteration 3: Call analyze_image(photo_3, "kiri")    [pro only]
Iteration 4: Call analyze_image(photo_4, "belakang") [pro only]
Iteration 5: Call merge_analyses(all_results)
→ Return FaceFeatures JSON
```

---

### Agent 2: Style Matcher (Hybrid Knowledge)

**Purpose:** Match user features to compatible hairstyles from the knowledge base.

**API:** MiMo (OpenAI-compatible, tool calling)

**Tools:**

| Tool | Input | Output |
|------|-------|--------|
| `query_face_shape_guide` | `{ face_shape }` | Recommended styles, avoid list, notes |
| `query_hair_compatibility` | `{ style_name, hair_texture, hair_thickness }` | `{ compatible: bool, reason }` |
| `get_style_details` | `{ style_name }` | Full style details (description, tips, barber instruction) |
| `list_all_styles` | `{}` | All available styles (DB + JSON merged) |

**Hybrid Data Strategy:**
1. Query `hairstyle_embeddings` table in Neon DB first
2. Fallback to local JSON files if DB is empty or unavailable
3. DB takes priority for duplicates (allows adding styles without redeploy)

---

### Agent 3: Ranker & Explainer (4-Phase Autonomous Workflow)

**Purpose:** Score each candidate, generate personalized AI explanations, and self-validate.

**API:** MiMo (OpenAI-compatible, tool calling)

**4-Phase Workflow:**

```
PHASE 1 — SCORING
  For each candidate → calculate_match_score()
  Weighted: face 25% + hair 15% + thickness 10% + base 50%
      ↓
PHASE 2 — EXPLANATION (LLM-Generated)
  For top candidates → generate_explanation()
  Uses LLM to write personal, conversational reasons in Indonesian
      ↓
PHASE 3 — VALIDATION (Self-Check)
  For each recommendation → validate_recommendation()
  Checks: score consistency, feature matching, logical coherence
  Removes invalid recommendations automatically
      ↓
PHASE 4 — FINAL OUTPUT
  Sorted by match_percentage, validated, with reasoning
```

**Tools:**

| Tool | Input | Output | AI-Powered? |
|------|-------|--------|-------------|
| `calculate_match_score` | features + style | `{ overall, breakdown, reasons, confidence }` | Weighted algorithm |
| `generate_explanation` | style + features + score | `{ main_reason, detail_reasons[], styling_tips, maintenance_tips }` | **Yes — LLM generates personal explanation** |
| `validate_recommendation` | recommendation data | `{ valid, issues[], suggestion, confidence }` | Logic-based self-check |

**Why This Matters for Judging:**
- Agent autonomously decides the workflow order
- LLM generates unique explanations per user (not templates)
- Self-validation shows agent can check its own work
- 12-20 iterations demonstrate genuine autonomous behavior

---

### Agent 4: Image Generator (optional)

**Purpose:** Generate reference hairstyle images. Pipeline continues if this agent fails.

**API:** Replicate `black-forest-labs/flux-2-pro`

| Tool | Input | Output |
|------|-------|--------|
| `generate_hairstyle_image` | `{ style_name, description, angle }` | `{ style_name, angle, image_url }` |

---

### Agent 5: Barbershop Finder (optional, pro-only, hybrid)

**Purpose:** Find nearby barbershops matching recommended styles.

**API:** MiMo (OpenAI-compatible, tool calling)

**Hybrid Data Strategy:**
1. Check `barbershop_cache` table (TTL: 7 days)
2. If cache miss → Google Maps Places API (if `GOOGLE_MAPS_API_KEY` set)
3. Cache results to DB for future requests
4. Fallback to local `barbershops.json` if all else fails

| Tool | Input | Output |
|------|-------|--------|
| `search_nearby_barbershops` | `{ latitude, longitude, radius_km, style_name }` | `{ count, source, barbershops[] }` |
| `get_barbershop_details` | `{ barbershop_id }` | Full barbershop info |
| `calculate_distance` | `{ lat1, lng1, lat2, lng2 }` | `{ distance_km }` |

---

## Core Engine: Agent Runner

Each agent runs through `runAgent()` in `src/runner.ts`:

```typescript
while (iterations < maxIterations) {
  // 1. LLM thinks and decides next action
  const response = await chatCompletion(messages, tools)

  // 2. Extract reasoning (logged for observability)
  if (response.content) {
    emit({ type: "thinking", message: response.content })
  }

  // 3. If LLM wants to call tools:
  if (response.tool_calls) {
    for (const toolCall of response.tool_calls) {
      emit({ type: "tool_call", message: `Calling ${toolCall.name}` })
      const result = await tool.execute(toolCall.params)
      emit({ type: "tool_result", message: summarize(result) })
      messages.push({ role: "tool", content: result })
    }
    continue  // Let LLM process results and decide next step
  }

  // 4. No tool calls = agent is done
  return parseOutput(response.content)
}

// 5. Error recovery: if LLM errors, add context and retry
messages.push({ role: "user", content: "Error occurred, try different approach" })
```

**Key Autonomous Behaviors:**
- LLM decides which tools to call and in what order
- LLM processes tool results and reasons about next steps
- Error recovery: on failure, agent gets context and retries
- Reasoning is logged at every step for full observability

---

## Real-time Progress Logging

Every agent step is logged to the `agent_logs` table with rich detail:

```
[vision]     thinking    "💭 Analyzing front photo for face shape..."
[vision]     tool_call   "🔧 Memanggil analyze_image(angle="depan")"
[vision]     tool_result "✅ analyze_image → face_shape: oval (87%)"
[vision]     complete    "✅ Vision Agent selesai (5 iterasi)"

[knowledge]  thinking    "💭 User has oval face, checking compatible styles..."
[knowledge]  tool_call   "🔧 Memanggil query_face_shape_guide(face_shape="oval")"
[knowledge]  tool_result "✅ query_face_shape_guide → 6 styles"

[ranking]    thinking    "💭 Scoring Textured Crop for oval face..."
[ranking]    tool_call   "🔧 Memanggil calculate_match_score(style_name="Textured Crop")"
[ranking]    tool_result "✅ calculate_match_score → score: 91%"
[ranking]    tool_call   "🔧 Memanggil generate_explanation(style_name="Textured Crop")"
[ranking]    tool_result "✅ generate_explanation → Textured Crop cocok karena..."
[ranking]    tool_call   "🔧 Memanggil validate_recommendation(score=91)"
[ranking]    tool_result "✅ validate_recommendation → ✓ valid"
```

This is visible in the demo via `GET /api/v1/analyses/:id/status` → `progress[]` array.

---

## File Structure

```
agent/src/
├── index.ts                   # Export runPipeline
├── pipeline.ts                # Orchestrate 5 agents sequentially
├── runner.ts                  # Core autonomous loop engine (with reasoning logging)
├── types.ts                   # TypeScript interfaces
├── agents/
│   ├── vision.ts              # Agent 1: Vision Analyzer
│   ├── knowledge.ts           # Agent 2: Style Matcher (hybrid DB + JSON)
│   ├── ranker.ts              # Agent 3: Ranker (4-phase, LLM explanations)
│   ├── imagegen.ts            # Agent 4: Image Generator
│   └── barbershop.ts          # Agent 5: Barbershop Finder (hybrid)
├── tools/
│   ├── vision-tools.ts        # 2 tools: analyze_image, merge_analyses
│   ├── knowledge-tools.ts     # 4 tools: face_shape, compatibility, details, list_all
│   ├── ranker-tools.ts        # 3 tools: score, explanation (LLM), validate
│   ├── imagegen-tools.ts      # 1 tool: generate_image
│   └── barbershop-tools.ts    # 3 tools: search_nearby, get_details, distance
├── knowledge/
│   ├── face-shapes.json       # 6 face shapes mapping
│   ├── hair-types.json        # 4 textures × 3 thicknesses
│   ├── styles.json            # 6 hairstyle definitions
│   └── barbershops.json       # Curated barbershops (Indonesia)
└── lib/
    ├── llm.ts                 # OpenAI SDK wrapper (MiMo)
    └── replicate.ts           # Replicate API wrapper (Vision + ImageGen)
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAIN_LLM_BASE_URL` | **Yes** | MiMo API endpoint |
| `MAIN_LLM_API_KEY` | **Yes** | MiMo API key |
| `MAIN_LLM_MODEL` | **Yes** | Model name (default: mimo-v2.5-pro) |
| `REPLICATE_API_TOKEN` | **Yes** | Replicate API token |
| `REPLICATE_VISION_MODEL` | No | Vision model (default: lucataco/moondream2) |
| `REPLICATE_IMAGEGEN_MODEL` | No | Image gen model (default: black-forest-labs/flux-2-pro) |
| `DATABASE_URL` | No | Neon PostgreSQL (enables hybrid DB queries) |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key (Agent 5 hybrid) |
| `GOOGLE_MAPS_RADIUS` | No | Search radius in meters (default: 5000) |

---

## Usage

```typescript
import { runPipeline } from "./src/pipeline";

const result = await runPipeline(
  ["https://r2.dev/photo-front.webp"],
  {
    onProgress: (agent, step, message) => {
      console.log(`[${agent}] ${step}: ${message}`);
    },
  },
  {
    userLatitude: -7.2906,     // optional: enables Agent 5
    userLongitude: 112.7344,   // optional: enables Agent 5
    tier: "pro",               // optional: defaults to "free"
  }
);

console.log(result.features);        // FaceFeatures
console.log(result.recommendations); // Recommendation[]
console.log(result.barbershops);     // BarbershopMatchResult | undefined
```

---

## AI Models & Tools Used

| Component | Model/Service | Purpose |
|-----------|---------------|---------|
| Vision Analysis | Replicate `lucataco/moondream2` | Face/hair feature extraction |
| Style Matching | MiMo (custom LLM) | Knowledge retrieval + reasoning |
| Ranking & Explanation | MiMo (custom LLM) | Scoring + personalized AI explanations |
| Image Generation | Replicate `black-forest-labs/flux-2-pro` | Hairstyle reference images |
| Barbershop Matching | MiMo (custom LLM) | Location-based recommendation |
| Barbershop Data | Google Maps Places API | Real-world barbershop discovery |
