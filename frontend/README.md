# FindMyCut — Frontend

> **Hackathon:** OpenClaw Agenthon Indonesia 2026 | **Team:** Pencari Kerja

## What is this folder?

This is the **user-facing web application** for FindMyCut — a mobile-first PWA where users upload selfie photos, watch AI agents analyze their face in real-time, and receive personalized hairstyle recommendations with generated reference images.

Built as a single-page React app with a custom dark design system inspired by xAI's aesthetic: near-black canvas, white outline pills, aggressive negative letter-spacing, and zero shadows.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Language | TypeScript |
| Auth Client | Better Auth React SDK |
| Image Export | html2canvas |
| PWA | vite-plugin-pwa + Workbox |
| Design System | Custom CSS (xAI-inspired dark theme) |
| Camera | Web MediaDevices API (getUserMedia) |

---

## Quick Start

```bash
bun install
bun run dev    # http://localhost:5173
```

---

## Features

### 📸 Multi-Angle Photo Capture
- **Camera capture** with front-facing mirror mode
- **Multi-angle flow**: depan → kanan → kiri → belakang (Pro tier)
- **Gallery upload** from device photos
- Auto-converts captured frames to base64 for API upload

### 🔍 Real-time AI Scanning
- Animated scanning overlay while AI processes photo
- Live progress polling from backend (`GET /analyses/:id/status`)
- Shows agent steps: "Analyzing face...", "Finding styles...", "Generating image..."

### 📊 Hairstyle Recommendations
- **6 style cards** with confidence scores (match %)
- **Lock/unlock mechanism** — free tier sees 1 clear + 5 locked
- **Detail popup** with 4-angle views (front, left, right, back)
- **Barber instructions** — copy-to-clipboard for barbershop visit

### 🖼️ AI-Generated Reference Images
- Displays generated hairstyle images from the AI pipeline
- Stored in Cloudflare R2, served via public URL

### 💳 Payment Integration (DOKU)
- "Upgrade to Pro" flow triggers DOKU checkout
- Payment success screen with transaction details
- Auto-unlocks all recommendations after payment

### 📍 Barbershop Finder
- Location permission popup
- Shows nearby barbershops with ratings, specialties, distance
- Google Maps link for navigation
- Sponsored barbershop placement

### 🔐 Authentication
- **Google OAuth** via Better Auth client SDK
- **Anonymous sessions** for instant access without signup
- Session persists via cookie (auto-managed by Better Auth)

### 📤 Export & Share
- Export recommendation card as PNG (html2canvas)
- Copy barber instructions to clipboard
- Generated filename: `findmycut-textured-crop.png`

### 📱 PWA Support
- Installable as mobile app (Add to Home Screen)
- Service worker for offline caching
- App icons (192x192, 512x512) + Apple Touch Icon

---

## User Flow (Stage Machine)

The app uses a finite state machine to manage navigation:

```
┌───────────────────────────────────────────────────────────────┐
│                      USER FLOW                                │
│                                                               │
│  ┌─────────┐  start   ┌────────┐  face_selected  ┌──────┐     │
│  │ Landing │ ───────→ │ Upload │ ──────────────→ │ Scan │     │
│  │         │          │        │                 │      │     │
│  │ "Try    │          │ Camera │                 │ AI   │     │
│  │  Free"  │          │ or     │                 │ Pro- │     │
│  │ button  │          │ Gallery│                 │ cess │     │
│  └─────────┘          └────────┘                 └──┬───┘     │
│       ↑                                             │         │
│       │ reset                          scan_complete│         │
│       │                                             ↓         │
│  ┌────┴────────────────────────────────────────────────┐      │
│  │                    Results                          │      │
│  │                                                     │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                │      │
│  │  │ Style 1 │ │ Style 2 │ │ Style 3 │ ...            |      │
│  │  │ 94%  🔓 │ │ 88%  🔒 │ │ 85%  🔒 │                |      │
│  │  └─────────┘ └─────────┘ └─────────┘                │      │
│  │                                                     │      │
│  │  Click locked → Payment checkout                    │      │
│  │  Click unlocked → Detail popup (4 angles)           │      │
│  └──────────────────────────────────┬──────────────────┘      │
│                                     │ payment_complete        │
│                                     ↓                         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              Payment Success                         │     │
│  │  "DoitPay Verified" → All styles unlocked            │     │
│  │  view_results → back to Results (all clear)          │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

States: `landing` → `upload` → `scan` → `results` → `payment_success`

---

## Design System

Custom dark theme inspired by **xAI's design language** (documented in `DESIGN.md`):

| Element | Style |
|---------|-------|
| Background | Near-black `#0a0a0a` |
| Text | Pure white `#ffffff` |
| Buttons | White outline pills (border-radius: 9999px) |
| Cards | `#191919` with 1px hairline border |
| Typography | Inter/Geist weight 400, negative letter-spacing on headlines |
| Elevation | No shadows — hairline borders only |
| Accent | Sunset orange `#ff7a17` (rare, for highlights) |

**Key principles:**
- Dark-only (no light mode)
- Weight 400 everywhere (never bold)
- Pill shape for all interactive elements
- Hairline borders instead of shadows

---

## API Integration

The frontend communicates with the backend at `http://localhost:3000`:

| Action | API Call |
|--------|---------|
| Login (Google) | `POST /api/auth/sign-in/social` → redirect to Google |
| Login (Anonymous) | `POST /api/auth/sign-in/anonymous` |
| Get session | `GET /api/auth/get-session` |
| Upload photo | `POST /api/v1/uploads` (multipart or base64) |
| Start analysis | `POST /api/v1/analyses` |
| Poll progress | `GET /api/v1/analyses/:id/status` (every 2-3s) |
| Get results | `GET /api/v1/analyses/:id/recommendations` |
| Pay for Pro | `POST /api/v1/payments/checkout` → redirect to DOKU |

---

## File Structure

```
frontend/
├── public/
│   ├── favicon.svg              # App icon
│   ├── icons.svg                # UI icon sprites
│   ├── pwa-192x192.png          # PWA icon (small)
│   ├── pwa-512x512.png          # PWA icon (large)
│   └── apple-touch-icon.png     # iOS home screen icon
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Main app component (all stages)
│   ├── App.css                  # Component-specific styles
│   ├── index.css                # Global styles + design tokens + animations
│   ├── data/
│   │   ├── previews.ts          # Hairstyle preview data (6 styles)
│   │   ├── demo-faces.ts        # Demo face photos for testing
│   │   └── barbershops.ts       # Barbershop data + Google Maps links
│   └── lib/
│       ├── auth-client.ts       # Better Auth React client
│       ├── stage-machine.ts     # Finite state machine (5 stages)
│       ├── capture-flow.ts      # Multi-angle camera flow logic
│       ├── payment.ts           # Tier pricing + lock logic
│       ├── format-instructions.ts # Barber instruction formatter
│       └── export.ts            # PNG export filename generator
├── DESIGN.md                    # Full design system documentation
├── index.html                   # HTML entry (Vite)
├── vite.config.ts               # Vite + PWA plugin config
├── package.json
└── tsconfig.json
```

---

## Key Implementation Details

### Camera Capture
```typescript
// Mirror mode for selfie camera
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: { facingMode: "user" } 
});
// Canvas mirrors the video before capture
context.translate(canvas.width, 0);
context.scale(-1, 1);
context.drawImage(video, 0, 0);
```

### State Machine
```typescript
// Deterministic stage transitions
function getNextStage(current: Stage, event: StageEvent): Stage {
  if (current === "upload" && event === "face_selected") return "scan";
  if (current === "scan" && event === "scan_complete") return "results";
  // ...
}
```

### Auth Client (Better Auth)
```typescript
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
});
// Usage: authClient.signIn.social({ provider: "google", callbackURL: "/" })
```

### Export to PNG
```typescript
const canvas = await html2canvas(exportRef.current, {
  scale: 2,
  backgroundColor: "#0a0a0a",
  useCORS: true,
});
// Download as findmycut-textured-crop.png
```

---

## Environment Variables

```env
VITE_API_URL=http://localhost:3000   # Backend API URL
```

---

## Scripts

```bash
bun run dev      # Development server (hot reload)
bun run build    # Production build (TypeScript check + Vite build)
bun run lint     # ESLint check
bun run preview  # Preview production build locally
```
