# findmycut API Contract v1

This document outlines the REST API endpoints for the findmycut application based on the PRD.

## Base URL
`/api/v1`

---

## 1. Users & Auth

### 1.1 Create/Get Session
`POST /users/session`

Create an anonymous session or get existing user details based on device/local storage ID.

**Request:**
```json
{
  "device_id": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "tier": "free", // "free", "pro", "platinum"
  "platinum_regenerate_saldo": 0,
  "created_at": "2026-05-15T10:00:00Z"
}
```

---

## 2. Upload

### 2.1 Upload Selfie
`POST /uploads`

Uploads the user's selfie to R2 storage.

**Request:**
`multipart/form-data`
- `file`: `(binary image file - JPG/PNG/WEBP)`
- `user_id`: `uuid`

**Response (200 OK):**
```json
{
  "id": "uuid",
  "url": "https://r2-bucket-url.com/image.jpg"
}
```

---

## 3. Analysis

### 3.1 Trigger Analysis
`POST /analyses`

Triggers the Gemini 2.5 Flash analysis and FAL.ai preview generation.

**Request:**
```json
{
  "user_id": "uuid",
  "image_url": "https://r2-bucket-url.com/image.jpg"
}
```

**Response (202 Accepted):**
```json
{
  "analysis_id": "uuid",
  "status": "processing"
}
```

### 3.2 Get Analysis Status
`GET /analyses/:analysis_id/status`

Poll for the analysis completion.

**Response (200 OK):**
```json
{
  "analysis_id": "uuid",
  "status": "completed" // "processing", "completed", "failed"
}
```

---

## 4. Recommendations

### 4.1 Get Recommendations
`GET /analyses/:analysis_id/recommendations`

Returns the generated recommendations. The response payload and sorting vary based on the user's tier.
- **Free Tier:** Sorted by lowest match score first (`match` ASC). 1 clear preview, 5 blurred (or empty image arrays for the rest). No barbershop details.
- **Paid Tier (Pro/Platinum):** Sorted by highest match score first (`match` DESC). All previews clear, full barbershop and styling details.

**Response (Free Tier):**
```json
{
  "tier": "free",
  "data": [
    {
      "name": "French Crop",
      "match": 80,
      "image": [
        {
          "type": "Front",
          "url": "https://r2storage/generated-image-front-clear.jpg"
        }
      ],
      "barbershop": null
    },
    {
      "name": "Crew Cut",
      "match": 90,
      "image": []
    },
    {
      "name": "Buzz Cut",
      "match": 100,
      "image": []
    }
  ]
}
```

**Response (Paid Tier - Pro/Platinum):**
```json
{
  "tier": "pro",
  "data": [
    {
      "name": "Buzz Cut",
      "match": 100,
      "image": [
        {
          "type": "Front",
          "url": "https://r2storage/generated-front.jpg"
        },
        {
          "type": "Side",
          "url": "https://r2storage/generated-side.jpg"
        },
        {
          "type": "Back",
          "url": "https://r2stroage/generated-back.jpg"
        },
        {
          "type": "Top",
          "url": "https://r2stroage/generated-top.jpg"
        }
      ],
      "barbershop": {
        "instruction": "Sides: #1.5 blended to #3. Top: Leave 6–7 cm, add texture. Finish: Natural, avoid hard lines.",
        "maintenance": "Trim every 4–5 weeks. Styling: Clay for texture, blow dry upward.",
        "location": {
          "id": "1",
          "latitude": "-6.2088",
          "longitude": "106.8456",
          "name": "Barbershop 1",
          "address": "Jl. Barbershop 1 No. 1",
          "phone": "08123456789",
          "image": "https://example.com/barbershop1.jpg"
        }
      }
    },
    {
      "name": "Crew Cut",
      "match": 90,
      "image": [
        { "type": "Front", "url": "https://r2stroage/generated-front-2.jpg" },
        { "type": "Side", "url": "https://r2stroage/generated-side-2.jpg" },
        { "type": "Back", "url": "https://r2stroage/generated-back-2.jpg" },
        { "type": "Top", "url": "https://r2stroage/generated-top-2.jpg" }
      ],
      "barbershop": {
        "instruction": "Sides: High fade. Top: Leave 3cm. Finish: Clean.",
        "maintenance": "Trim every 3 weeks.",
        "location": {
          "id": "1",
          "latitude": "-6.2088",
          "longitude": "106.8456",
          "name": "Barbershop 1",
          "address": "Jl. Barbershop 1 No. 1",
          "phone": "08123456789",
          "image": "https://example.com/barbershop1.jpg"
        }
      }
    },
    {
      "name": "French Crop",
      "match": 80,
      "image": [
        { "type": "Front", "url": "https://r2stroage/generated-front-3.jpg" },
        { "type": "Side", "url": "https://r2stroage/generated-side-3.jpg" },
        { "type": "Back", "url": "https://r2stroage/generated-back-3.jpg" },
        { "type": "Top", "url": "https://r2stroage/generated-top-3.jpg" }
      ],
      "barbershop": {
        "instruction": "Sides: Skin fade. Top: Textured fringe.",
        "maintenance": "Trim every 2 weeks.",
        "location": {
          "id": "1",
          "latitude": "-6.2088",
          "longitude": "106.8456",
          "name": "Barbershop 1",
          "address": "Jl. Barbershop 1 No. 1",
          "phone": "08123456789",
          "image": "https://example.com/barbershop1.jpg"
        }
      }
    }
  ]
}
```
*Note: The `barbershop.location` object is mocked for MVP and represents a planned V2 feature (Barber Marketplace). It is included here to support frontend UI development.*

---

## 5. Payments

### 5.1 Create Checkout Session
`POST /payments/checkout`

Generates a payment link (via Doku) to upgrade the user's tier.

**Request:**
```json
{
  "user_id": "uuid",
  "tier": "pro", // "pro" or "platinum"
  "analysis_id": "uuid (optional - if paying during the hook phase)"
}
```

**Response (200 OK):**
```json
{
  "checkout_url": "https://sandbox.doku.com/...",
  "transaction_id": "string"
}
```

### 5.2 Payment Webhook (Callback)
`POST /payments/webhook`

Duitku callback endpoint to update payment status and user tier asynchronously.

**Request:**
`application/x-www-form-urlencoded` or `application/json` depending on Duitku config.
Includes `merchantOrderId`, `resultCode`, `signature`, etc.

**Response (200 OK):**
```json
{
  "status": "success"
}
```

---

## 6. Platinum Features

### 6.1 Regenerate Recommendations (Platinum Only)
`POST /analyses/:analysis_id/regenerate`

Uses 1 Platinum saldo to generate more recommendations for an existing analysis.

**Request:**
```json
{
  "user_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "remaining_saldo": 9,
  "new_recommendations": [
    // ... array of new recommendations ...
  ]
}
```
