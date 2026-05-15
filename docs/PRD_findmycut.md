# PRD — findmycut

## Product Name
# findmycut

### Tagline
> Find the haircut that actually fits your face.

---

# 1. Overview

**findmycut** adalah AI-powered haircut recommendation platform yang membantu user menemukan model rambut yang cocok berdasarkan wajah, tipe rambut, dan desired style.

Platform menghasilkan:
- Hairstyle recommendations dengan preview images personalized
- Barber instructions yang jelas dan actionable
- Hair compatibility guidance
- Styling & maintenance recommendations

**Tujuan utama:**
> Menghilangkan ketidakpastian saat ingin potong rambut dan memberikan user kepercayaan diri dengan instruksi spesifik ke barber.

---

# 2. Problem

Banyak orang:
- Bingung model rambut yang cocok dengan bentuk wajah mereka
- Tidak tahu istilah barber yang tepat
- Takut hasil potong tidak sesuai ekspektasi
- Sulit menjelaskan haircut ke barber dengan kata-kata
- Hanya mengandalkan referensi random dari TikTok/Pinterest

**Pain point utama:**
> "Saya ingin potongan yang cocok, tapi tidak tahu harus bilang apa ke barber dan bagaimana harusnya terlihat di wajah saya."

---

# 3. Target Audience

## Primary
- Male 16–35
- Gen Z & millennials
- Aktif di TikTok/Instagram
- Peduli appearance & grooming

## Secondary
- First jobbers
- College students
- Dating app users
- Grooming enthusiasts

---

# 4. Core Value Proposition

## Functional
- Personalized haircut recommendations berdasarkan face shape
- AI-generated preview images (lihat langsung di wajah user)
- Clear barber instructions (copy-paste siap ke barber)
- Reduce bad haircut risk dengan confidence score

## Emotional
- Increase confidence saat ke barber
- Improve appearance & glow up
- Feel "more attractive" dan yakin dengan pilihan

## Social
- Shareable result cards
- Trend-driven hairstyles
- Viral potential untuk grooming niche

---

# 5. MVP Scope

## Included in MVP

### A. Face Upload
User upload selfie dengan requirements:
- Front-facing
- Good lighting
- No hat/accessories covering face
- Min 400×400px, max 10MB
- JPG, PNG, WEBP format

### B. Face Analysis (Gemini 2.5 Flash)
System analyzes:
- Face shape (oval, round, square, oblong, diamond, heart)
- Jawline definition
- Forehead ratio
- Hair density estimate
- Hair texture estimate

### C. Hairstyle Recommendation (3 options)
Generate:
- 3 recommended haircuts berdasarkan face shape
- Style name (e.g., "Textured Crop", "Mid Fade", "Messy Fringe")
- Confidence score (70-95%)
- Hair compatibility info
- Maintenance difficulty (Easy/Medium/Hard)

### D. AI Barber Instructions
Example output:
```
Style: Textured Crop
Sides: #1.5 blended to #3
Top: Leave 6–7 cm, add texture
Finish: Natural, avoid hard lines
Maintenance: Trim every 4–5 weeks
Styling: Clay for texture, blow dry upward
```

### E. Generated Preview Images
FAL.ai generate personalized preview:
- 1 clear preview per hairstyle (user lihat langsung di wajahnya)
- Image resolution: 512×512 or 1024×1024
- Generated real-time saat checkout/purchase

### F. Hair Compatibility
Info untuk:
- Straight, wavy, curly hair
- Thick, thin hair
- Best hair types untuk tiap style

### G. Styling & Maintenance
Suggest:
- Styling products (clay, pomade, sea salt spray)
- Blow dry technique
- Trimming frequency
- Recut timeline (e.g., "Best maintained every 4–5 weeks")

---

# 6. Pricing Model

## Three-Tier System

### Free (Rp0)
**Per session (one-time use)**
- 1 hairstyle recommendation
- 1 clear preview image (FAL.ai personalized)
- 5 blurred static placeholder previews (hook mechanism — visual hook tanpa cost)
- Hair compatibility info (text)
- NO barber instructions
- NO styling tips

**Paywall trigger:** User lihat 6 preview boxes (1 jelas, 5 blur) → hook untuk beli

### Pro (Rp15.000)
**Per session (one-time use)**
- 3 hairstyle recommendations
- 3 clear preview images (FAL.ai personalized, tidak blur)
- Barber instructions untuk semua 3 gaya
- Hair compatibility untuk semua 3 gaya
- Styling & maintenance tips untuk semua 3 gaya
- Confidence scores untuk tiap recommendation
- Share result card (with watermark)

### Platinum (Rp25.000)
**Subscription-style (recurring saldo)**
- Up to 10 hairstyle recommendations per session
- 10 clear preview images (FAL.ai personalized)
- Barber instructions untuk semua 10 gaya
- Hair compatibility untuk semua 10 gaya
- Styling & maintenance tips lengkap
- **Unlimited regenerate saldo (10x)**
  - Contoh: hari ini pakai 3x, besok pakai 7x — total tetap 10x
  - Saldo tidak expire, bisa pakai kapan saja selamanya
  - Tiap regenerate = 1 session dengan up to 10 recommendations
- Share result card (no watermark)
- Priority support

---

# 7. User Flow

## 7.1 High-Level Flow

```
Landing Page
    ↓
"Try Free" button
    ↓
Upload Selfie
    ↓
Client-side validation (lighting, face detect, dimensions)
    ↓
AI Analysis (Gemini 2.5 Flash)
    ↓
Recommendation Results Screen
  - Show 6 preview boxes (1 clear, 5 blurred)
  - Show style names + confidence scores
  - Show 1 barber instruction (teaser, locked)
    ↓
Paywall: "Unlock all previews + instructions"
    ↓
Choose tier: Pro (Rp15k) or Platinum (Rp25k)
    ↓
Payment → Success
    ↓
Full Results Page
  - All previews clear
  - All barber instructions visible
  - Styling tips visible
  - Save & Share options
```

## 7.2 Detailed Swimlane Diagram

**See the swimlane diagram below showing all actors and interactions:**

**Swimlanes represent:**
- **User** — user actions (click, upload, choose tier)
- **Browser** — client-side validation, UI display
- **API (Hono)** — backend endpoints handling requests
- **Services** — external API calls (Gemini, FAL.ai, R2, D1)

**Flow stages:**

**1. Landing:** User clicks "Try Free" → Browser shows upload modal

**2. Upload:** User selects selfie → Browser validates (face detect, dimensions, format) → API receives upload → Saves to R2 → Returns URL

**3. Analysis:** Browser sends image URL → API calls Gemini → Generates 1 FAL.ai preview → Saves analysis to D1 → Returns 3 recommendations + 1 preview image

**4. Paywall:** Browser displays 6 preview boxes (1 clear, 5 blurred) + 1 barber instruction (locked) → User sees "Unlock all previews + instructions for Rp15k or Rp25k"

**5. Payment:** User chooses Pro or Platinum tier → Browser sends checkout request → API processes payment → Generates 2 more FAL.ai previews → Updates D1 with new tier

**6. Results:** Browser displays full results page → All 3 previews clear (not blurred) → All barber instructions visible → All styling tips visible → Share & save options enabled

The swimlane ensures clear separation of concerns: the user's interactions are separate from the browser's logic, which is separate from the backend API, which is separate from external service calls.

---

# 8. Viral & Engagement Hooks

### Built-in Shareability
Users share:
- Before/after recommendation card
- "Which haircut fits me best?" poll
- Style confidence score
- Barber instructions (as text card)

### FOMO Hook (Free Tier)
- 1 clear preview + 5 blurred previews = visual abundance
- User curious: "what's hidden in those 5?"
- Low barrier to upgrade (Rp15k = 1 coffee)

### Regenerate Saldo (Platinum)
- "You have 7x regenerate left"
- Encourages repeat usage
- Long-term retention (saldo doesn't expire)

---

# 9. Technical Architecture

## Frontend
- React 18+ (Vite)
- Tailwind CSS
- Framer Motion (animations)
- TypeScript
- pnpm (package manager)

## Backend
- Hono (Cloudflare Workers)
- pnpm (package manager)
- Cloudflare D1 (SQLite)
- Drizzle ORM
- TypeScript

## AI/APIs
- Gemini 2.5 Flash (face analysis + recommendations)
- FAL.ai FLUX.1 Kontext Pro (image generation)

## Infrastructure
- Cloudflare Workers (backend) — free tier
- Cloudflare Pages (frontend) — free tier
- Cloudflare R2 (storage) — free tier
- Cloudflare D1 (database) — free tier
- Upstash Redis (cache) — free tier
- Domain: findmycut (~Rp7.5k/bulan)

## Testing
- Vitest (unit + integration tests)
- TDD approach (write tests before features)

## Deployment
- GitHub Actions (CI/CD)
- Automatic deployment to Cloudflare Workers on push to main

---

# 10. Database Models

## User
```
id: UUID (primary key)
email: string (unique)
created_at: timestamp
last_upload_at: timestamp
total_analyses: integer
tier: enum (free, pro, platinum)
platinum_regenerate_saldo: integer (default 0)
```

## Analysis
```
id: UUID (primary key)
user_id: UUID (foreign key)
original_image_url: string (R2 bucket)
face_shape: string
hair_density: string
hair_texture: string
created_at: timestamp
```

## Recommendation
```
id: UUID (primary key)
analysis_id: UUID (foreign key)
style_name: string
confidence_score: float (0-100)
barber_instructions: text
hair_compatibility: json
styling_tips: text
maintenance_frequency: string
preview_image_urls: json (array of R2 URLs)
created_at: timestamp
```

## Payment
```
id: UUID (primary key)
user_id: UUID (foreign key)
amount: integer (in IDR)
tier: enum (pro, platinum)
payment_method: string
status: enum (pending, success, failed)
transaction_id: string (payment gateway)
created_at: timestamp
completed_at: timestamp
```

---

# 11. Success Metrics (MVP)

## Acquisition
- **CTA click rate:** % dari landing page visitors → "Try Free" click
- **Target:** >40%

## Activation
- **Upload completion rate:** % dari "Try Free" clicks → valid photo uploaded
- **Target:** >70%
- **Analysis completion rate:** % dari uploads → recommendations shown
- **Target:** >95%

## Monetization
- **Paywall view rate:** % dari analyses → paywall shown
- **Target:** >80%
- **Conversion rate:** % dari paywall views → payment completed
- **Target:** 5–10%

## Retention
- **Repeat visit (30d):** % dari users → return dalam 30 hari
- **Target:** >15%
- **Platinum regenerate usage:** avg % dari saldo digunakan per bulan
- **Target:** >30%

## Viral/Sharing
- **Share rate:** % dari users → share result card
- **Target:** >20%

## Technical Health
- **Photo error rate:** % dari uploads → rejected due to quality
- **Target:** <10%
- **API error rate (generation):** % dari generation requests → failed
- **Target:** <2%

---

# 12. Future Features (V2+)

### V2
- Beard recommendations & styling
- Hairstyle trend feed (seasonal trends)
- Barber marketplace (find barbers near user)
- Save hairstyle collections/wishlist
- Compare 2 hairstyles side-by-side

### V3
- Live AR try-on (augmented reality preview)
- Barber booking integration
- Grooming subscription (tips + reminders)
- AI glow-up advisor (overall appearance suggestions)
- Community ratings (rate hairstyles from other users)

---

# 13. Risk & Mitigation

## Risk 1: AI Preview Unrealistic
**Mitigation:**
- Set expectations clearly in UI ("This is an AI preview, results may vary")
- Prioritize recommendation quality first (barber instructions more important)
- Pre-launch quality spike: test 50 photos, only launch if >80% satisfied

## Risk 2: Users Upload Bad Photos
**Mitigation:**
- Real-time face detection feedback (show green/red indicator)
- Clear upload guidelines with good/bad examples
- Auto-reject low-quality photos with helpful error message

## Risk 3: Low Conversion Rate
**Mitigation:**
- Hook mechanism (1 clear preview + 5 blurred) = visual FOMO
- Low price (Rp15k = 1 coffee)
- A/B test paywall copy if needed

## Risk 4: Low Retention
**Mitigation:**
- Platinum regenerate saldo (long-term engagement)
- Seasonal trends (new recommendations)
- Social sharing (viral loop)

---

# 14. Core Positioning

**findmycut is NOT:**
- An AI image generator tool
- A hairstyle photo gallery

**findmycut IS:**
> A confidence tool that helps people know exactly what haircut to get, see how it looks on them, and know exactly what to tell their barber.

---

# 15. Success Criteria for MVP Launch

✅ Face upload + validation working  
✅ Gemini API integration (analysis)  
✅ FAL.ai integration (1 preview per analysis)  
✅ Free tier with hook mechanism (1 clear + 5 blurred)  
✅ Pro tier checkout (Rp15k)  
✅ Platinum tier checkout (Rp25k) with saldo tracking  
✅ Barber instructions readable + copyable  
✅ Share result card functionality  
✅ Vitest unit + integration tests (>80% coverage)  
✅ GitHub Actions CI/CD setup  
✅ Zero infrastructure cost (100% free tier CF)  
✅ Domain findmycut live  

---

**Version:** 1.0  
**Last Updated:** May 2026  
**Status:** Ready for Engineering Handoff
