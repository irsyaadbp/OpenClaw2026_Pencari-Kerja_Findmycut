# FindMyCut — Hackathon Blueprint

> **OpenClaw Agenthon Indonesia 2026**
> Team: Aldo (BE) + Frontend Dev
> Stack: Bun + Hono + Hermes Agent
> Deadline: 15 Mei 2026, 23:00 WIB


> **Created:** 15 Mei 2026, 10:41 WIB
> **Blueprint Version:** 1.0
> **Repo:** OpenClaw2026_Pencari-Kerja_Findmycut
---

## 📌 Product Overview

**FindMyCut** — AI-powered haircut recommendation via multi-agent system.

User upload foto kepala (1-4 angle) → Multi-Agent System analyzes → Top 3 haircut recommendations + reasoning.

**Yang dinilai juri:** Bukan UI yg bagus, tapi **bagaimana agent bekerja** — autonomous reasoning, tool calls, workflow processing, information gathering.

---

## 🎯 Judging Criteria Alignment

| Criteria | Weight | FindMyCut Focus |
|----------|--------|-----------------|
| **Creativity & Originality** | 30% | Haircut rec via photo analysis = unique, belum mainstream |
| **Autonomy & Agent Behaviour** | 30% | 3+ agents, autonomous loops, tool calls, reasoning chains |
| Technical Execution | 20% | Clean Bun+Hono, structured output, proper error handling |
| Use Case Clarity | 10% | Universal problem: "potongan rambut apa yg cocok?" |
| Real-World Deployability | 10% | Live deployment, bisa langsung dipake |

---

## 🏗️ Answer: Apakah Perlu BE?

**YA, tapi lightweight.** Alasan:

1. **Auth** — login required (Google / username-password)
2. **Photo Upload** — presigned URL ke Cloudflare R2
3. **Agent Orchestration** — dispatch & track agent pipeline
4. **Job Status** — FE perlu tau progress agent sampai mana
5. **Rate Limiting** — prevent spam

BE bukan "main character" — BE jadi **glue layer** antara FE dan Agent System.

---

## 🧠 Architecture Decision: Hermes vs Inline Agent

### ❌ Approach A: Inline Agent Functions (Too Simple)
```typescript
// Just calling LLM API sequentially
const analysis = await llm.call("Analyze this photo...")
const styles = await llm.call("Match styles for...")
```
**Problem:** Juri bakal liat ini sebagai "chatbot wrapper" — kena penalty.

### ❌ Approach B: Full Hermes Orchestrator (Too Complex)
```
FE → Hono → Hermes CLI → Sub-agents → MCP Tools → Results
```
**Problem:** Over-engineered buat hackathon 12 jam, banyak moving parts.

### ✅ Approach C: Agent-as-Tool Pattern (Recommended)
```
FE → Hono BE → Agent Pipeline (each step = autonomous agent w/ tools)
                    ↓
              Each agent has:
              - Own system prompt (role definition)
              - Tool definitions (what it CAN do)
              - Autonomous loop (reason → act → observe → repeat)
              - Structured output (typed JSON)
```
**Why this works:**
- Judges liat: ada tool calls, autonomous reasoning, multi-agent workflow
- Self-contained di BE, enggak perlu external orchestrator
- Bisa demo: "Agent 1 sedang analyzing... Agent 1 memanggil tool detect_face_shape... Agent 1 selesai, dispatch ke Agent 2..."
- FE tinggal show progress log

---

## 🔧 Tech Stack (Confirmed)

| Layer | Technology | Why |
|-------|-----------|-----|
| **BE Framework** | Bun + Hono | Aldo's stack, fast, TypeScript-native |
| **Database** | Neon PostgreSQL | Serverless, free tier, familiar |
| **Object Storage** | Cloudflare R2 | Free egress, S3-compatible |
| **Vision AI** | Replicate API | Free tier, banyak model |
| **LLM (reasoning)** | OpenAI-compatible API | Tool calling support |
| **Rate Limiting** | In-memory (Map/setTimeout) | Simple, hackathon-appropriate |
| **Auth** | Google OAuth / username-password | Login required |

---

## 🔄 Full Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  1. Login (Google / username-password)                      │
│  2. Upload 1-4 foto (depan, belakang, kiri, kanan)          │
│  3. Submit → dapat jobId                                    │
│  4. Poll GET /api/status/:jobId setiap 2 detik              │
│  5. Show progress log dari agent                            │
│  6. Display Top 3 results + explanations                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Bun + Hono)                     │
│                                                              │
│  POST /api/analyze                                           │
│  ├─ Auth check                                               │
│  ├─ Upload photos → R2 (presigned URL)                       │
│  ├─ Create job in DB (status: pending)                       │
│  ├─ Trigger agent pipeline (async background)                │
│  └─ Return { jobId, status: "processing" }                   │
│                                                              │
│  GET /api/status/:jobId                                      │
│  └─ Return { status, currentStep, progress[], result? }      │
│                                                              │
│  Agent Pipeline (background):                                │
│  ├─ Step 1: Vision Agent → extract features                  │
│  ├─ Step 2: Knowledge Gatherer → find matching styles        │
│  ├─ Step 3: Recommendation Agent → rank + explain            │
│  └─ Step 4: (optional) Location Agent → find barbershops     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    AGENT SYSTEM                              │
│                                                              │
│  Each agent = autonomous function with:                      │
│  - System prompt (role + instructions)                       │
│  - Tool definitions (what it can call)                       │
│  - LLM API call with tool_use                                │
│  - Autonomous loop: reason → call tool → observe → repeat    │
│  - Structured output (JSON)                                  │
│                                                              │
│  Progress updates → save to DB → FE polls                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 Agent Definitions (Detail)

### Agent 1: 🔍 Vision Analyzer

**Role:** Analisis foto user → extract fitur kepala/rambut.

**System Prompt:**
```
You are a professional hair and face analysis AI agent.
Your job is to analyze photos of a person's head and extract
detailed features about their face shape, hair properties,
and head proportions.

You have tools to analyze images. Use them to extract features.
Always return structured JSON output.
Be thorough — analyze from multiple angles if available.
```

**Tools:**
```typescript
// Tool 1: Analyze single image
{
  name: "analyze_image",
  description: "Analyze a single photo to detect face and hair features",
  parameters: {
    image_url: string,
    angle: "front" | "back" | "left" | "right"
  }
}

// Tool 2: Merge multi-angle analysis
{
  name: "merge_features",
  description: "Merge feature analysis from multiple angles into one profile",
  parameters: {
    analyses: FeatureAnalysis[]  // array of per-angle results
  }
}
```

**Autonomous Loop:**
```
1. Receive photo URLs
2. For each photo → call analyze_image tool
3. If multiple photos → call merge_features tool
4. Validate output (all required fields present?)
5. If missing data → try re-analyze with different prompt
6. Return structured features JSON
```

**Output Schema:**
```typescript
interface VisionOutput {
  face_shape: "oval" | "round" | "square" | "heart" | "oblong" | "diamond"
  face_confidence: number  // 0-1
  hair_thickness: "thin" | "medium" | "thick"
  hair_texture: "straight" | "wavy" | "curly" | "coily"
  hairline: "high" | "medium" | "low" | "receding"
  forehead_size: "small" | "medium" | "large"
  jawline: "soft" | "angular" | "strong"
  current_hairstyle: string
  photos_analyzed: number
  notes: string
}
```

**Replicate Model Options (Vision):**
| Model | ID | Good For | Free? |
|-------|-----|----------|-------|
| Llama 3.2 Vision | `meta/llama-3.2-11b-vision-instruct` | General vision, good reasoning | ✅ Free tier |
| Moondream2 | `vikhyatk/moondream2` | Lightweight, fast | ✅ Free |
| Florence-2 | `lucataco/florence-2-large` | Image understanding | ✅ Free |
| InternVL2 | `opencompass/internvl2-8b` | Multi-language vision | ✅ Free |

**Recommended:** `meta/llama-3.2-11b-vision-instruct` — best reasoning for structured extraction.

---

### Agent 2: 📚 Knowledge Gatherer

**Role:** Cari informasi gaya rambut yg cocok berdasarkan fitur dari Agent 1.

**System Prompt:**
```
You are a hairstyle knowledge specialist AI agent.
Given a person's face and hair features, your job is to gather
information about which hairstyles would suit them best.

Use your tools to search for hairstyle recommendations based
on face shape, hair type, and other features.
Collect multiple candidates with detailed reasoning.
```

**Tools:**
```typescript
// Tool 1: Query knowledge base
{
  name: "query_face_shape_guide",
  description: "Get hairstyle recommendations for a specific face shape",
  parameters: {
    face_shape: string,
    gender?: string  // default: male (hackathon scope)
  }
}

// Tool 2: Query hair type compatibility
{
  name: "query_hair_compatibility",
  description: "Check if a hairstyle works with specific hair type/thickness",
  parameters: {
    style_name: string,
    hair_texture: string,
    hair_thickness: string
  }
}

// Tool 3: Get style details
{
  name: "get_style_details",
  description: "Get detailed info about a specific hairstyle",
  parameters: {
    style_name: string
  }
  returns: {
    name: string
    description: string
    suitable_face_shapes: string[]
    suitable_hair_types: string[]
    maintenance_level: "low" | "medium" | "high"
    difficulty: "easy" | "medium" | "hard"
    trending: boolean
    image_search_query: string  // for finding reference images
  }
}

// Tool 4: Web search (optional — if time permits)
{
  name: "search_trending_styles",
  description: "Search for current trending hairstyles",
  parameters: {
    query: string
  }
}
```

**Autonomous Loop:**
```
1. Receive features from Agent 1
2. Call query_face_shape_guide(face_shape) → get recommended styles
3. For each recommended style:
   a. Call query_hair_compatibility(style, texture, thickness)
   b. If compatible → call get_style_details(style)
   c. If NOT compatible → filter out, note reason
4. Sort candidates by compatibility score
5. Return top 5-7 candidates with details
```

**Output Schema:**
```typescript
interface KnowledgeOutput {
  candidates: Array<{
    name: string
    description: string
    match_score: number  // 0-1
    face_shape_match: boolean
    hair_type_match: boolean
    thickness_match: boolean
    maintenance_level: string
    trending: boolean
    image_search_query: string
  }>
  filtered_out: Array<{
    style: string
    reason: string
  }>
}
```

**Knowledge Base Source:**
Build from barber/hairstyle articles. Hardcoded JSON in code:
```
src/knowledge/face-shapes.json    → face shape → recommended styles
src/knowledge/hair-types.json     → hair texture/thickness compatibility
src/knowledge/styles-database.json → style details + metadata
```

---

### Agent 3: ⭐ Recommendation Agent

**Role:** Ranking candidates → Top 3 + generate personal explanations.

**System Prompt:**
```
You are a personal hairstyle advisor AI agent.
Given a person's features and a list of hairstyle candidates,
your job is to rank the top 3 best matches and explain WHY
each style suits them personally.

Be specific — reference their actual features (face shape,
hair type, etc.) in your explanations.
Make it feel personal, not generic.
```

**Tools:**
```typescript
// Tool 1: Calculate match score
{
  name: "calculate_match_score",
  description: "Calculate detailed match score between features and a hairstyle",
  parameters: {
    features: VisionOutput,
    style: StyleCandidate
  }
  returns: {
    overall_score: number
    face_shape_score: number
    hair_type_score: number
    thickness_score: number
    maintenance_score: number
    reasons: string[]
  }
}

// Tool 2: Generate personal explanation
{
  name: "generate_explanation",
  description: "Generate personalized explanation for why a style suits the user",
  parameters: {
    features: VisionOutput,
    style: StyleCandidate,
    scores: MatchScores
  }
  returns: {
    main_reason: string
    detail_reasons: string[]
    styling_tips: string
    maintenance_tips: string
  }
}

// Tool 3: Find reference image
{
  name: "find_reference_image",
  description: "Find a reference image URL for a hairstyle",
  parameters: {
    style_name: string,
    search_query: string
  }
}
```

**Autonomous Loop:**
```
1. Receive features + candidates from Agent 1 & 2
2. For each candidate:
   a. Call calculate_match_score(features, candidate)
   b. Store score + reasons
3. Sort by overall_score descending
4. Take top 3
5. For each top 3:
   a. Call generate_explanation(features, style, scores)
   b. Call find_reference_image(style)
6. Format final output
7. Return ranked recommendations with explanations
```

**Output Schema:**
```typescript
interface RecommendationOutput {
  recommendations: Array<{
    rank: 1 | 2 | 3
    style_name: string
    match_percentage: number  // 0-100
    why_match: string[]       // personal reasons
    styling_tips: string
    maintenance_tips: string
    maintenance_level: string
    reference_image_url: string
    scores: {
      face_shape: number
      hair_type: number
      thickness: number
      overall: number
    }
  }>
  analysis_summary: string  // overall summary of user's features
}
```

---

### Agent 4: 📍 Location Agent (OPTIONAL — if time permits)

**Role:** Cari barbershop terdekat yg bisa ngerjain recommended styles.

**System Prompt:**
```
You are a local barbershop finder AI agent.
Given recommended hairstyles and a user's location,
find barbershops nearby that can perform these styles.
```

**Tools:**
```typescript
{
  name: "search_barbershops",
  description: "Search for barbershops near a location",
  parameters: {
    location: string,       // city name
    style_name: string,     // what style they need
    radius_km?: number
  }
}
```

---

## 🗄️ Database Schema (Neon PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),       -- NULL if Google OAuth
  google_id VARCHAR(255) UNIQUE,    -- NULL if username/password
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table (track each analysis request)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
    -- pending, processing, completed, failed
  current_step VARCHAR(50),
    -- 'vision', 'knowledge', 'ranking', 'location', 'done'
  photos JSONB,                     -- array of R2 URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Agent progress log (THE KEY FOR DEMO)
CREATE TABLE agent_logs (
  id SERIAL PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  agent_name VARCHAR(50),           -- 'vision', 'knowledge', 'ranker'
  step VARCHAR(100),                -- 'analyzing_front_photo', 'calling_tool', etc.
  message TEXT,                     -- human-readable progress
  tool_call VARCHAR(100),           -- which tool was called
  tool_input JSONB,                 -- tool input params
  tool_output JSONB,                -- tool output (abbreviated)
  reasoning TEXT,                   -- agent's reasoning chain
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Results table
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) UNIQUE,
  features JSONB,                   -- VisionOutput
  recommendations JSONB,            -- RecommendationOutput
  location_data JSONB,              -- LocationAgent output (optional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📡 API Endpoints

### Auth
```
POST   /api/auth/register        → Register username/password
POST   /api/auth/login            → Login
GET    /api/auth/google           → Google OAuth redirect
GET    /api/auth/google/callback  → Google OAuth callback
GET    /api/auth/me               → Current user info
```

### Analysis Pipeline
```
POST   /api/analyze
  Auth: required
  Body: { photos: File[] }  (multipart/form-data, max 4 files)
  Response: { jobId: string, status: "processing" }

  Internal:
  1. Upload photos → R2, get public URLs
  2. Create job in DB
  3. Start agent pipeline (async, don't await)
  4. Return jobId immediately

GET    /api/status/:jobId
  Auth: required
  Response: {
    jobId: string,
    status: "processing" | "completed" | "failed",
    currentStep: string,
    progress: [
      { agent: "vision", step: "analyzing_front", message: "Menganalisis foto depan...", timestamp: "..." },
      { agent: "vision", step: "tool_call", message: "Memanggil analyze_image tool...", timestamp: "..." },
      ...
    ],
    result?: RecommendationOutput  // only when completed
  }

GET    /api/result/:jobId
  Auth: required
  Response: {
    features: VisionOutput,
    recommendations: RecommendationOutput,
    location?: LocationOutput
  }
```

---

## 🔌 Agent Implementation Pattern

### Core Agent Runner

```typescript
// src/agents/runner.ts

interface AgentConfig {
  name: string
  systemPrompt: string
  tools: Tool[]
  maxIterations?: number  // safety: prevent infinite loops
}

interface Tool {
  name: string
  description: string
  parameters: Record<string, any>
  execute: (params: any) => Promise<any>
}

async function runAgent(
  config: AgentConfig,
  userMessage: string,
  jobId: string,
  onProgress: (step: string, message: string) => void
): Promise<any> {
  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: userMessage }
  ]

  let iterations = 0
  const maxIter = config.maxIterations ?? 10

  while (iterations < maxIter) {
    iterations++
    onProgress("thinking", `Agent ${config.name} sedang berpikir... (iterasi ${iterations})`)

    // Call LLM with tools
    const response = await callLLM(messages, config.tools)

    // If LLM wants to call a tool
    if (response.tool_calls) {
      for (const toolCall of response.tool_calls) {
        const tool = config.tools.find(t => t.name === toolCall.name)
        if (!tool) continue

        onProgress("tool_call", `Memanggil tool: ${tool.name}(${JSON.stringify(toolCall.arguments).slice(0, 100)}...)`)
        
        // Execute tool
        const result = await tool.execute(toolCall.arguments)
        
        // Log tool call to DB
        await logAgentStep(jobId, config.name, "tool_call", {
          tool: tool.name,
          input: toolCall.arguments,
          output: result,
          reasoning: response.content
        })

        // Add tool result to conversation
        messages.push(
          { role: "assistant", content: null, tool_calls: [toolCall] },
          { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) }
        )
      }
      // Continue loop — let agent process tool results
      continue
    }

    // If LLM returns final answer (no tool calls)
    onProgress("complete", `Agent ${config.name} selesai!`)
    return parseOutput(response.content)
  }

  throw new Error(`Agent ${config.name} exceeded max iterations (${maxIter})`)
}
```

### Vision Agent Setup

```typescript
// src/agents/vision.ts

export const visionAgent: AgentConfig = {
  name: "vision",
  systemPrompt: `You are a professional hair and face analysis AI.
Analyze photos and extract structured features about face shape,
hair properties, and head proportions.

Available photos may include: front, back, left side, right side.
Analyze each photo, then merge results into one comprehensive profile.

Always return your final answer as JSON matching this schema:
{
  "face_shape": "oval|round|square|heart|oblong|diamond",
  "face_confidence": 0.0-1.0,
  "hair_thickness": "thin|medium|thick",
  "hair_texture": "straight|wavy|curly|coily",
  "hairline": "high|medium|low|receding",
  "forehead_size": "small|medium|large",
  "jawline": "soft|angular|strong",
  "current_hairstyle": "description of current hair",
  "photos_analyzed": number,
  "notes": "any additional observations"
}`,

  tools: [
    {
      name: "analyze_image",
      description: "Analyze a single photo to detect face and hair features",
      parameters: {
        type: "object",
        properties: {
          image_url: { type: "string" },
          angle: { type: "string", enum: ["front", "back", "left", "right"] }
        },
        required: ["image_url", "angle"]
      },
      execute: async ({ image_url, angle }) => {
        // Call Replicate vision model
        const result = await replicate.run(
          "meta/llama-3.2-11b-vision-instruct",
          {
            input: {
              image: image_url,
              prompt: `Analyze this ${angle} photo of a person's head. 
Detect and describe:
1. Face shape (oval, round, square, heart, oblong, diamond)
2. Hair thickness (thin, medium, thick)
3. Hair texture (straight, wavy, curly, coily)
4. Hairline position (high, medium, low, receding)
5. Forehead size (small, medium, large)
6. Jawline type (soft, angular, strong)
7. Current hairstyle description
Return as JSON.`
            }
          }
        )
        return parseVisionResult(result)
      }
    },
    {
      name: "merge_analyses",
      description: "Merge multiple angle analyses into one profile",
      parameters: {
        type: "object",
        properties: {
          analyses: { type: "array" }
        },
        required: ["analyses"]
      },
      execute: async ({ analyses }) => {
        // Simple merge: pick most common values, average confidence
        return mergeFeatureAnalyses(analyses)
      }
    }
  ],

  maxIterations: 8
}
```

---

## 📁 File Structure

```
findmycut/
├── be/
│   ├── src/
│   │   ├── index.ts                 # Hono server entry
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.ts              # POST /login, /register, /google
│   │   │   ├── analyze.ts           # POST /analyze (upload + trigger)
│   │   │   └── status.ts            # GET /status/:jobId, /result/:jobId
│   │   │
│   │   ├── agents/
│   │   │   ├── runner.ts            # Core agent execution engine
│   │   │   ├── vision.ts            # Agent 1: Vision Analyzer
│   │   │   ├── knowledge.ts         # Agent 2: Knowledge Gatherer
│   │   │   ├── ranker.ts            # Agent 3: Recommendation Agent
│   │   │   ├── location.ts          # Agent 4: Location (optional)
│   │   │   └── pipeline.ts          # Orchestrate all agents sequentially
│   │   │
│   │   ├── knowledge/
│   │   │   ├── face-shapes.json     # Face shape → recommended styles
│   │   │   ├── hair-types.json      # Hair type compatibility matrix
│   │   │   └── styles.json          # Style database with details
│   │   │
│   │   ├── lib/
│   │   │   ├── replicate.ts         # Replicate API wrapper
│   │   │   ├── llm.ts               # LLM API wrapper (OpenAI-compatible)
│   │   │   ├── r2.ts                # Cloudflare R2 upload
│   │   │   ├── db.ts                # Neon PostgreSQL connection
│   │   │   └── auth.ts              # JWT + session management
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts              # Auth middleware
│   │   │   └── rate-limit.ts        # In-memory rate limiter
│   │   │
│   │   └── types.ts                 # TypeScript types/interfaces
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── fe/                              # Frontend (teammate)
│   └── ...
│
├── README.md                        # Wajib untuk submission
└── HACKATHON.md                     # This file
```

---

## ⏰ Timeline (12 Jam)

| Waktu | Task | Siapa | Notes |
|-------|------|-------|-------|
| 09.45-10.15 | Setup: init project, DB schema, R2 bucket | Berdua | GitHub repo: OpenClaw2026_TeamName_FindMyCut |
| 10.15-11.00 | BE: Auth + file upload + job CRUD | Aldo | Login, R2 presigned URL |
| 10.15-11.00 | FE: Upload page + login page | Teman | Basic UI, enggak perlu cantik |
| 11.00-12.00 | BE: Knowledge base JSON + Agent runner engine | Aldo | Core agent execution loop |
| 12.00-13.30 | BE: Vision Agent (paling kritikal!) | Aldo | Replicate API, tool calls, structured output |
| 13.30-14.00 | Break | - | Makan |
| 14.00-15.00 | BE: Knowledge Gatherer Agent | Aldo | Tool calls ke knowledge base |
| 15.00-16.00 | BE: Recommendation Agent | Aldo | Scoring + explanation generation |
| 16.00-17.00 | BE: Pipeline orchestration + progress logging | Aldo | Connect 3 agents, agent_logs table |
| 17.00-18.00 | Integration: BE ↔ FE | Berdua | API contract, polling, result display |
| 18.00-19.00 | Testing: end-to-end flow | Berdua | Debug, edge cases |
| 19.00-20.00 | (Optional) Agent 4: Location | Aldo | Jika time permit |
| 20.00-21.00 | Polish + deploy | Berdua | Live link ke VPS/Vercel |
| 21.00-22.00 | Demo video + pitch deck | Berdua | Max 2 min video, 5 slide deck |
| 22.00-23.00 | Submit ke Devpost | Berdua | Final check semua field |

---

## 🎬 Demo Video Script (2 Menit)

```
[0:00-0:10] Hook
"FindMyCut — AI Agent yang bantu kamu cari potongan rambut perfect."

[0:10-0:20] Problem
"Tiap ke barbershop, bingung mau potong apa. 
Online search generic, enggak sesuai bentuk wajah kita."

[0:20-0:35] Upload Flow
- Login → Upload 4 foto (depan, belakang, kiri, kanan)
- Submit → "Processing..."

[0:35-1:00] Agent Workflow (INI BAGIAN PALING PENTING)
- Show real-time agent log:
  "🔍 Vision Agent: Menganalisis foto depan..."
  "🔍 Vision Agent: Memanggil analyze_image tool..."
  "🔍 Vision Agent: Face shape detected: oval (confidence: 87%)"
  "📚 Knowledge Agent: Querying face shape guide..."
  "📚 Knowledge Agent: Found 6 compatible styles, filtering..."
  "⭐ Ranker Agent: Calculating match scores..."
  "⭐ Ranker Agent: Generating personal explanations..."

[1:00-1:30] Results
- Show Top 3 recommendations with explanations
- Highlight personal reasoning: "Bentuk wajah oval kamu ideal untuk..."

[1:30-1:50] Architecture Recap
- Diagram: 3 agents, autonomous loop, tool calls
- "Setiap agent berjalan otonom, reasoning sendiri,
   dan berkomunikasi via structured data."

[1:50-2:00] Closing
"FindMyCut — Never have a bad haircut again."
```

---

## 📋 Pitch Deck (5 Slides)

**Slide 1:** Title — FindMyCut, AI-Powered Haircut Recommendation
**Slide 2:** Problem — Universal haircut confusion, no personalized solution
**Slide 3:** Solution + Agent Architecture diagram (3 agents + tools + flow)
**Slide 4:** Tech Stack + Key Features (Bun, Hono, Replicate, Multi-Agent)
**Slide 5:** Impact & Future — barber booking, payment, AR try-on

---

## 📝 Submission Checklist

- [ ] GitHub repo: `OpenClaw2026_TeamName_FindMyCut` (PUBLIC)
- [ ] README.md: install instructions, cara run, tech stack
- [ ] Demo video: YouTube Unlisted, max 2 menit
- [ ] Pitch deck: PDF, max 5 slide
- [ ] AI Tools / Models Used list
- [ ] Live deployment link (optional tapi recommended)
- [ ] Submit via Devpost sebelum 23:00 WIB

---

## 🔗 Links

- Devpost: https://openclawagenthon.devpost.com/
- Guideline: https://docs.google.com/document/d/14HpBg1C7bmUVCFdi7mzv92_VjNWyiRFroEIUZvFziPw
- Replicate: https://replicate.com/
- Neon: https://neon.tech/
- Cloudflare R2: https://www.cloudflare.com/products/r2/

---

*Last updated: 15 May 2026, 10:41 WIB*
