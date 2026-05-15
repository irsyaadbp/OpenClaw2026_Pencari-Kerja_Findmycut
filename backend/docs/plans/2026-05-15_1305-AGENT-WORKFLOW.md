# FindMyCut — Agent Workflow & Looping Detail

> **Last updated:** 15 Mei 2026, 13:05 WIB
> **Purpose:** Detail lengkap bagaimana setiap agent bekerja, tool calling, autonomous loop, dan inter-agent communication.

---

## 🔄 Pipeline Overview

```
User Upload → Backend → Agent Pipeline → Result → Backend → FE

Pipeline = 4 agents sequentially, each with autonomous tool-calling loop
```

---

## Agent 1: 🔍 Vision Analyzer

**Purpose:** Analisis foto user → extract fitur wajah/rambut sebagai structured JSON.

**API:** Replicate `lucataco/moondream2`

**System Prompt:**
```
You are a professional hair and face analysis AI agent.
Analyze photos of a person's head and extract detailed features
about their face shape, hair properties, and head proportions.

You have tools to analyze images. Use them to extract features.
Always return structured JSON output.
```

**Tools:**

### Tool 1: `analyze_image`
```
Input:  { image_url: string, angle: "front"|"back"|"left"|"right" }
Process:
  1. Kirim foto ke Replicate moondream2 API
  2. Prompt: "Analyze this {angle} photo. Detect face shape,
     hair thickness, hair texture, hairline, forehead size,
     jawline. Return as JSON."
  3. Parse response → structured output
Output: {
  face_shape: "oval"|"round"|"square"|"heart"|"oblong"|"diamond",
  face_confidence: 0.0-1.0,
  hair_thickness: "thin"|"medium"|"thick",
  hair_texture: "straight"|"wavy"|"curly"|"coily",
  hairline: "high"|"medium"|"low"|"receding",
  forehead_size: "small"|"medium"|"large",
  jawline: "soft"|"angular"|"strong",
  current_hairstyle: "description",
  notes: "observations"
}
```

### Tool 2: `merge_analyses`
```
Input:  { analyses: FeatureAnalysis[] }
Process:
  1. Majority vote untuk categorical fields (face_shape, dll)
  2. Average untuk numeric fields (confidence)
  3. Combine notes dari semua angle
  4. Pick most detailed hairstyle description
Output: merged FaceFeatures
```

**Autonomous Loop:**
```
Iteration 1: Agent decides to call analyze_image(front_photo)
Iteration 2: Agent decides to call analyze_image(back_photo) [if pro]
Iteration 3: Agent decides to call analyze_image(left_photo) [if pro]
Iteration 4: Agent decides to call analyze_image(right_photo) [if pro]
Iteration 5: Agent decides to call merge_analyses(all_results)
Iteration 6: Agent returns final FaceFeatures JSON
```

**Free vs Pro:**
- Free: 1 foto → 2 iterasi (analyze + merge)
- Pro: 4 foto → 5 iterasi (4x analyze + merge)

---

## Agent 2: 🎨 Style Matcher

**Purpose:** Match fitur wajah → list gaya rambut yg cocok.

**API:** MiMo (tool calling)

**System Prompt:**
```
You are a hairstyle knowledge specialist AI agent.
Given a person's face and hair features, find hairstyles
that would suit them best.

Use your tools to search the hairstyle knowledge base.
Filter by face shape compatibility, hair type, and thickness.
Return 5-7 best matching candidates.

IMPORTANT: Always use your tools. Do NOT guess.
```

**Tools:**

### Tool 1: `query_face_shape_guide`
```
Input:  { face_shape: "oval" }
Process:
  1. Read face-shapes.json
  2. Get recommended styles for this face shape
  3. Query pgvector for semantic matches (optional)
Output: {
  recommended: ["Textured Crop", "Side Part", ...],
  avoid: ["Buzz Cut", ...],
  notes: "Most versatile face shape..."
}
```

### Tool 2: `query_hair_compatibility`
```
Input:  { style_name: "Textured Crop", hair_texture: "straight", hair_thickness: "thick" }
Process:
  1. Read hair-types.json
  2. Check if style works with this texture + thickness
Output: {
  compatible: true,
  reason: "Straight thick hair works great with textured styles",
  score_modifier: 1.0
}
```

### Tool 3: `get_style_details`
```
Input:  { style_name: "Textured Crop" }
Process:
  1. Read styles.json for hardcoded details
  2. Query pgvector for additional info (if available)
  3. Search for reference image URL
Output: {
  name: "Textured Crop",
  description: "Pendek di sisi, bertekstur di atas...",
  suitable_face_shapes: ["oval", "round", "square"],
  suitable_hair_types: ["straight", "wavy"],
  suitable_thickness: ["medium", "thick"],
  maintenance_level: "low",
  trending: true,
  styling_tips: "Gunakan matte clay...",
  barber_instructions: "Ask for textured crop, scissor cut on top...",
  reference_image_url: "https://..."
}
```

**Autonomous Loop:**
```
Iteration 1: Agent calls query_face_shape_guide(face_shape)
  → Gets list of recommended styles (e.g., 6 styles)

Iteration 2: Agent calls query_hair_compatibility(style_1, texture, thickness)
Iteration 3: Agent calls query_hair_compatibility(style_2, texture, thickness)
  ... (for each recommended style)

Iteration N: Agent filters out incompatible styles
  → e.g., 4 compatible, 2 filtered out

Iteration N+1: Agent calls get_style_details(compatible_style_1)
Iteration N+2: Agent calls get_style_details(compatible_style_2)
  ... (for each compatible style)

Iteration N+M: Agent returns final candidate list (5-7 styles with details)
```

**Expected: ~8-15 iterations** (depends on how many styles to check)

---

## Agent 3: ⭐ Ranker & Explainer

**Purpose:** Score kandidat → Top 3 + generate penjelasan personal.

**API:** MiMo (tool calling)

**System Prompt:**
```
You are a personal hairstyle advisor AI agent.
Given a person's features and hairstyle candidates, rank the
top 3 best matches and explain WHY each suits them personally.

Be specific — reference their actual features in explanations.
Make it feel personal, not generic.
```

**Tools:**

### Tool 1: `calculate_match_score`
```
Input:  { features: FaceFeatures, style: StyleCandidate }
Process:
  1. face_shape_score: 40% weight (exact match = 1.0, partial = 0.7)
  2. hair_type_score: 25% weight
  3. thickness_score: 20% weight
  4. maintenance_score: 10% weight (preference-based)
  5. trending_bonus: 5% weight
  6. Generate reasons array
Output: {
  overall: 0.94,
  face_shape: 1.0,
  hair_type: 0.9,
  thickness: 0.85,
  reasons: [
    "Bentuk wajah oval ideal untuk potongan ini",
    "Rambut tebal kamu cocok untuk textured styles"
  ]
}
```

### Tool 2: `generate_explanation`
```
Input:  { features: FaceFeatures, style: StyleCandidate, scores: MatchScores }
Process:
  1. Build context: user features + style details + scores
  2. Call MiMo LLM: "Generate personal explanation for why
     {style} suits someone with {features}"
  3. Parse response
Output: {
  main_reason: "Textured Crop adalah pilihan terbaik untuk wajah oval kamu",
  detail_reasons: [
    "Bentuk wajah oval kamu proporsional, cocok dengan potongan ini",
    "Rambut tebal kamu bisa bikin tekstur di atas terlihat natural",
    "Low maintenance, cocok buat daily routine"
  ],
  styling_tips: "Gunakan matte clay, blow dry ke atas sambil diacak",
  maintenance_tips: "Potong setiap 4-6 minggu"
}
```

**Autonomous Loop:**
```
Iteration 1: Agent decides to calculate match score for candidate 1
Iteration 2: Agent decides to calculate match score for candidate 2
  ... (for all 5-7 candidates)

Iteration N: Agent sorts by overall score, picks top 3

Iteration N+1: Agent calls generate_explanation for rank 1
Iteration N+2: Agent calls generate_explanation for rank 2
Iteration N+3: Agent calls generate_explanation for rank 3

Iteration N+4: Agent returns final Top 3 with explanations
```

**Expected: ~8-12 iterations**

---

## Agent 4: 🖼️ Image Generator (Optional)

**Purpose:** Generate referensi hairstyle images untuk setiap Top 3 recommendation.

**API:** Replicate `black-forest-labs/flux-2-pro`

**System Prompt:**
```
You are a hairstyle image generation agent.
Generate reference images for recommended hairstyles.
Upload results to cloud storage and return URLs.
```

**Tools:**

### Tool 1: `generate_hairstyle_image`
```
Input:  { style_name: "Textured Crop", description: "...", angle: "front" }
Process:
  1. Build prompt: "Professional photo of a man with {style_name} haircut,
     {description}, studio lighting, clean background, {angle} view"
  2. Call Replicate FLUX-2-pro API
  3. Get generated image URL
  4. Download image
  5. Convert to webp (sharp library)
  6. Upload to Cloudflare R2
  7. Return R2 public URL
Output: {
  style_name: "Textured Crop",
  angle: "front",
  image_url: "https://r2.dev/findmycut/textured-crop-front.webp"
}
```

**Autonomous Loop:**
```
Iteration 1: Generate front view for rank 1 style
Iteration 2: Generate front view for rank 2 style
Iteration 3: Generate front view for rank 3 style

[If pro tier:]
Iteration 4: Generate left view for rank 1
Iteration 5: Generate right view for rank 1
Iteration 6: Generate back view for rank 1
  ... (for each rank × each angle)
```

**Free vs Pro:**
- Free: 3 iterasi (1 angle × 3 styles = front only)
- Pro: 12 iterasi (4 angles × 3 styles)

---

## 📊 Progress Logging (agent_logs table)

Setiap tool call dan reasoning di-log ke database. FE bisa poll ini buat show real-time progress.

**Log entries per pipeline run:**
```
[vision]     start        "Memulai analisis foto..."
[vision]     tool_call    "Memanggil analyze_image(front)"
[vision]     tool_result  "Face shape: oval (87%)"
[vision]     tool_call    "Memanggil merge_analyses"
[vision]     tool_result  "Merge complete"
[vision]     complete     "Analisis selesai: oval, thick, straight"

[knowledge]  start        "Mencari gaya rambut cocok..."
[knowledge]  tool_call    "Memanggil query_face_shape_guide(oval)"
[knowledge]  tool_result  "6 styles recommended"
[knowledge]  tool_call    "Memanggil query_hair_compatibility(Textured Crop)"
[knowledge]  tool_result  "Compatible: true"
  ... (repeat for each style)
[knowledge]  complete     "5 kandidat ditemukan"

[ranking]    start        "Menghitung skor & ranking..."
[ranking]    tool_call    "Memanggil calculate_match_score(Textured Crop)"
[ranking]    tool_result  "Score: 0.94"
  ... (repeat for each candidate)
[ranking]    tool_call    "Memanggil generate_explanation(Textured Crop)"
[ranking]    tool_result  "Explanation generated"
  ... (repeat for top 3)
[ranking]    complete     "Top 3 rekomendasi siap!"

[imagegen]   start        "Generate gambar referensi..."
[imagegen]   tool_call    "Memanggil generate_hairstyle_image(Textured Crop, front)"
[imagegen]   tool_result  "Image uploaded to R2"
  ... (repeat for each image)
[imagegen]   complete     "Gambar referensi siap!"
```

**Total tool calls per pipeline: ~25-40** (sangat impressive untuk demo!)

---

## 🔗 Inter-Agent Communication

```
Agent 1 output → JSON → Agent 2 input
Agent 2 output → JSON → Agent 3 input
Agent 3 output → JSON → Agent 4 input

Format: typed JSON (FaceFeatures, StyleCandidate[], Recommendation[])
```

**Error handling:**
- Agent timeout → retry once → fail gracefully
- Tool error → log error → continue with fallback
- LLM error → retry with exponential backoff
- Parse error → use raw response as fallback

---

*Last updated: 15 Mei 2026, 13:05 WIB*
