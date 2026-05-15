# FindMyCut — Agent Workspace

Multi-agent AI pipeline for haircut recommendation. 5 agents run sequentially, each with autonomous tool-calling loops. Agent 4 (Image Gen) and Agent 5 (Barbershop Finder) are optional — the pipeline continues even if they fail.

---

## How It Works

```
📸 User Photos → Agent Pipeline → 📊 Recommendations + 📍 Barbershops
```

The pipeline consists of 5 specialized AI agents that communicate via structured JSON. Each agent has its own system prompt, tool definitions, and autonomous reasoning loop.

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
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  🎨 Agent 2: Style Matcher          │
│  API: MiMo (OpenAI-compatible)      │
│  Tools: query_face_shape,           │
│         query_compatibility,        │
│         get_style_details           │
│  Output: StyleCandidate[]           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  ⭐ Agent 3: Ranker & Explainer     │
│  API: MiMo (OpenAI-compatible)      │
│  Tools: calculate_score,            │
│         generate_explanation        │
│  Output: Recommendation[]           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  🖼️ Agent 4: Image Generator        │  ← optional
│  API: Replicate FLUX-2-pro          │
│  Tools: generate_hairstyle_image    │
│  Output: image URLs → R2            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  📍 Agent 5: Barbershop Finder      │  ← optional, pro-only
│  API: MiMo (tool calling)           │
│  Tools: search_nearby,              │
│         get_details,                │
│         calculate_distance          │
│  Data: curated JSON + Haversine     │
│  Output: top 3 barbershops nearby   │
└─────────────────────────────────────┘
```

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

**Output Schema (FaceFeatures):**
```json
{
  "face_shape": "oval|round|square|heart|oblong|diamond",
  "face_confidence": 0.87,
  "hair_thickness": "thin|medium|thick",
  "hair_texture": "straight|wavy|curly|coily",
  "hairline": "high|medium|low|receding",
  "forehead_size": "small|medium|large",
  "jawline": "soft|angular|strong",
  "current_hairstyle": "medium length, slightly wavy",
  "photos_analyzed": 1,
  "notes": "Rambut tebal, garis rambut tinggi"
}
```

---

### Agent 2: Style Matcher

**Purpose:** Match user features to compatible hairstyles from the knowledge base.

**API:** MiMo (OpenAI-compatible, tool calling)

**Tools:**

| Tool | Input | Output |
|------|-------|--------|
| `query_face_shape_guide` | `{ face_shape }` | Recommended styles, avoid list, notes |
| `query_hair_compatibility` | `{ style_name, hair_texture, hair_thickness }` | `{ compatible: bool, reason }` |
| `get_style_details` | `{ style_name }` | Full style details (description, tips, barber instruction) |

**Knowledge Base:** Local JSON files in `src/knowledge/`
- `face-shapes.json` — 6 face shapes → recommended/avoided styles
- `hair-types.json` — 4 textures × 3 thicknesses → compatibility matrix
- `styles.json` — 6 hairstyle definitions with full details

---

### Agent 3: Ranker & Explainer

**Purpose:** Score each candidate and generate personalized explanations.

**API:** MiMo (OpenAI-compatible, tool calling)

**Tools:**

| Tool | Input | Output |
|------|-------|--------|
| `calculate_match_score` | `{ face_shape, hair_texture, hair_thickness, style_name }` | `{ overall: 0-100, reasons[] }` |
| `generate_explanation` | `{ style_name, face_shape, hair_texture, score }` | `{ main_reason, detail_reasons[], styling_tips }` |

**Scoring Algorithm:**
- Face shape match: +25 points
- Hair type compatibility: +15 points
- Thickness compatibility: +10 points
- Base score: 50 points
- Max: 98 points

---

### Agent 4: Image Generator (optional)

**Purpose:** Generate reference hairstyle images for each recommendation. Pipeline continues if this agent fails.

**API:** Replicate `black-forest-labs/flux-2-pro`

**Tools:**

| Tool | Input | Output |
|------|-------|--------|
| `generate_hairstyle_image` | `{ style_name, description, angle }` | `{ style_name, angle, image_url }` |

---

### Agent 5: Barbershop Finder (optional, pro-only)

**Purpose:** Find nearby barbershops that match recommended hairstyles. Uses Haversine distance calculation on a curated dataset. Gracefully skips if no user location is provided.

**API:** MiMo (OpenAI-compatible, tool calling)

**Tools:**

| Tool | Input | Output |
|------|-------|--------|
| `search_nearby_barbershops` | `{ latitude, longitude, radius_km, style_name }` | `{ count, barbershops[] }` |
| `get_barbershop_details` | `{ barbershop_id }` | Full barbershop info |
| `calculate_distance` | `{ lat1, lng1, lat2, lng2 }` | `{ distance_km }` |

**Data Source:** `src/knowledge/barbershops.json` — curated barbershops in Indonesia (Surabaya, Sidoarjo, Jakarta, Bandung). Google Places API integration ready (set `GOOGLE_MAPS_API_KEY` to enable).

**Matching Logic:**
1. Filter barbershops within radius (default 10km)
2. Match specialties with recommended styles
3. Rank by: style match > distance > rating
4. Return top 3

---

## Core Engine: Agent Runner

Each agent runs through the same `runAgent()` function in `src/runner.ts`:

```typescript
while (iterations < maxIterations) {
  // 1. Send messages + tools to LLM
  const response = await chatCompletion(messages, tools)

  // 2. If LLM wants to call tools:
  if (response.tool_calls) {
    for (const toolCall of response.tool_calls) {
      const result = await tool.execute(toolCall.params)  // Execute tool
      messages.push({ role: "tool", content: result })    // Feed result back
    }
    continue  // Let LLM process tool results
  }

  // 3. If no tool calls = final answer
  return parseOutput(response.content)
}
```

This creates an **autonomous reasoning loop**: the LLM decides which tools to call, processes the results, and reasons again until it has enough information to produce a final answer.

---

## File Structure

```
agent/src/
├── index.ts                   # Export runPipeline
├── pipeline.ts                # Orchestrate 5 agents sequentially
├── runner.ts                  # Core autonomous loop engine
├── types.ts                   # TypeScript interfaces
├── agents/
│   ├── vision.ts              # Agent 1: Vision Analyzer
│   ├── knowledge.ts           # Agent 2: Style Matcher
│   ├── ranker.ts              # Agent 3: Ranker & Explainer
│   ├── imagegen.ts            # Agent 4: Image Generator
│   └── barbershop.ts          # Agent 5: Barbershop Finder
├── tools/
│   ├── vision-tools.ts        # 2 tools: analyze_image, merge_analyses
│   ├── knowledge-tools.ts     # 3 tools: face_shape, compatibility, details
│   ├── ranker-tools.ts        # 2 tools: score, explanation
│   ├── imagegen-tools.ts      # 1 tool: generate_image
│   └── barbershop-tools.ts    # 3 tools: search_nearby, get_details, distance
├── knowledge/
│   ├── face-shapes.json       # 6 face shapes mapping
│   ├── hair-types.json        # 4 textures × 3 thicknesses
│   ├── styles.json            # 6 hairstyle definitions
│   └── barbershops.json       # Curated barbershops (Indonesia)
└── lib/
    ├── llm.ts                 # OpenAI SDK wrapper
    └── replicate.ts           # Replicate API wrapper
```

---

## Environment Variables

See `.env.example` in the backend folder. The agent reads the same `.env` file.

| Variable | Required | Description |
|----------|----------|-------------|
| `MAIN_LLM_BASE_URL` | **Yes** | MiMo API endpoint |
| `MAIN_LLM_API_KEY` | **Yes** | MiMo API key |
| `MAIN_LLM_MODEL` | **Yes** | Model name (default: mimo-v2.5-pro) |
| `REPLICATE_API_TOKEN` | **Yes** | Replicate API token |
| `REPLICATE_VISION_MODEL` | No | Vision model (default: lucataco/moondream2) |
| `REPLICATE_IMAGEGEN_MODEL` | No | Image gen model (default: black-forest-labs/flux-2-pro) |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key (Agent 5, optional) |

---

## Usage

```typescript
import { runPipeline } from "./src/pipeline";

const result = await runPipeline(
  ["https://r2.dev/photo-front.webp", "https://r2.dev/photo-side.webp"],
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
