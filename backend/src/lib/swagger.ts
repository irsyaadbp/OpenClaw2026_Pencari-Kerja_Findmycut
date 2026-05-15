/**
 * OpenAPI 3.0 Specification for FindMyCut API
 * Separated from routes for clean architecture.
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "FindMyCut API",
    description: "AI-powered haircut recommendation via multi-agent system. Upload foto → AI analisis → Top rekomendasi potongan rambut.",
    version: "1.0.0",
    contact: {
      name: "Team Pencari Kerja",
    },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local Development" },
  ],
  tags: [
    { name: "Health", description: "Server health check" },
    { name: "Auth", description: "Authentication (Better Auth)" },
    { name: "Users", description: "User management" },
    { name: "Uploads", description: "Image upload to R2" },
    { name: "Analyses", description: "AI analysis pipeline" },
    { name: "Recommendations", description: "Hairstyle recommendations" },
    { name: "Payments", description: "DOKU payment integration" },
  ],
  paths: {
    // ============ HEALTH ============
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is running",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } },
          },
        },
      },
    },

    // ============ AUTH ============
    "/api/auth/sign-in/anonymous": {
      post: {
        tags: ["Auth"],
        summary: "Create anonymous session",
        description: "Creates an anonymous user session. No credentials needed. Returns session token + user. Useful for free tier users who don't want to register.",
        responses: {
          "200": {
            description: "Anonymous session created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } } },
          },
        },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        tags: ["Auth"],
        summary: "Register with email + password",
        description: "Create a new user account with email and password. Optionally include username.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignUpRequest" },
              example: { name: "Aldo", email: "aldo@example.com", password: "password123", username: "aldo" },
            },
          },
        },
        responses: {
          "200": { description: "User registered", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } } } },
          "400": { description: "Validation error (email taken, password too short)" },
          "422": { description: "Invalid input" },
        },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Auth"],
        summary: "Login with email + password",
        description: "Authenticate with email and password. Returns session token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignInRequest" },
              example: { email: "aldo@example.com", password: "password123" },
            },
          },
        },
        responses: {
          "200": { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } } } },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/sign-in/username": {
      post: {
        tags: ["Auth"],
        summary: "Login with username + password",
        description: "Authenticate with username (instead of email) and password. Requires username plugin.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "aldo" },
                  password: { type: "string", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } } } },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/sign-in/social/google": {
      get: {
        tags: ["Auth"],
        summary: "Login with Google OAuth",
        description: "Redirects user to Google consent screen. After approval, Google redirects to /api/auth/callback/google which creates/links the user and sets session cookie. Use callbackURL to specify where to redirect after success.",
        parameters: [
          { name: "callbackURL", in: "query", required: false, schema: { type: "string", format: "uri" }, description: "Frontend URL to redirect after successful login (e.g. http://localhost:5173/)" },
        ],
        responses: {
          "302": { description: "Redirect to Google consent screen" },
        },
      },
    },
    "/api/auth/callback/google": {
      get: {
        tags: ["Auth"],
        summary: "Google OAuth callback (auto-handled)",
        description: "Google redirects here after user approves. Better Auth automatically creates/links user, sets session cookie, and redirects to callbackURL. Do NOT call this manually.",
        parameters: [
          { name: "code", in: "query", required: true, schema: { type: "string" }, description: "Authorization code from Google" },
          { name: "state", in: "query", required: false, schema: { type: "string" }, description: "CSRF state parameter" },
        ],
        responses: {
          "302": { description: "Redirect to app with session cookie set" },
          "400": { description: "Invalid code or state" },
        },
      },
    },
    "/api/auth/get-session": {
      get: {
        tags: ["Auth"],
        summary: "Get current session",
        description: "Returns current user session info including user ID, name, email, tier. Requires valid session cookie or Authorization bearer token.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": { description: "Session info", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionResponse" } } } },
          "401": { description: "Not authenticated (no valid session)" },
        },
      },
    },
    "/api/auth/sign-out": {
      post: {
        tags: ["Auth"],
        summary: "Logout / destroy session",
        description: "Invalidates the current session. Clears session cookie.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": { description: "Session destroyed" },
        },
      },
    },
    "/api/auth/user/update": {
      post: {
        tags: ["Auth"],
        summary: "Update user profile",
        description: "Update current user's name or image. Cannot update email or tier from client.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Aldo Updated" },
                  image: { type: "string", format: "uri", example: "https://r2.dev/avatar.webp" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "User updated", content: { "application/json": { schema: { $ref: "#/components/schemas/UserProfile" } } } },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/api/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password",
        description: "Change current user's password. Requires current password for verification.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password changed" },
          "400": { description: "Current password incorrect" },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/api/auth/list-sessions": {
      get: {
        tags: ["Auth"],
        summary: "List active sessions",
        description: "Returns all active sessions for the current user (useful for multi-device management).",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": {
            description: "List of active sessions",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      token: { type: "string" },
                      expiresAt: { type: "string", format: "date-time" },
                      ipAddress: { type: "string" },
                      userAgent: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
        },
      },
    },

    // ============ USERS ============
    "/api/v1/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          "200": { description: "User profile", content: { "application/json": { schema: { $ref: "#/components/schemas/UserProfile" } } } },
          "401": { description: "Not authenticated" },
        },
      },
    },

    // ============ UPLOADS ============
    "/api/v1/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Upload selfie photo",
        description: "Upload image via multipart/form-data OR base64 JSON. Image is converted to WebP and stored in R2.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary", description: "Image file (JPG/PNG/WEBP)" },
                },
                required: ["file"],
              },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/UploadBase64Request" },
              example: { image_base64: "data:image/jpeg;base64,/9j/4AAQ..." },
            },
          },
        },
        responses: {
          "200": { description: "Upload successful", content: { "application/json": { schema: { $ref: "#/components/schemas/UploadResponse" } } } },
          "400": { description: "No file provided" },
        },
      },
    },

    // ============ ANALYSES ============
    "/api/v1/analyses": {
      post: {
        tags: ["Analyses"],
        summary: "Trigger AI analysis",
        description: "Starts the 5-agent AI pipeline. Returns immediately with analysis_id. Poll status via GET /analyses/:id/status.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnalysisRequest" },
              examples: {
                with_url: {
                  summary: "With pre-uploaded image URL",
                  value: { user_id: "uuid-here", image_url: "https://r2.dev/photos/abc.webp" },
                },
                with_base64: {
                  summary: "With base64 image (auto-uploads to R2)",
                  value: { user_id: "uuid-here", image_base64: "data:image/jpeg;base64,/9j/4AAQ..." },
                },
                with_multiple: {
                  summary: "With multiple images (Pro tier)",
                  value: { user_id: "uuid-here", image_urls: ["url1", "url2", "url3", "url4"], latitude: -7.2906, longitude: 112.7344, tier: "pro" },
                },
              },
            },
          },
        },
        responses: {
          "202": { description: "Analysis started", content: { "application/json": { schema: { $ref: "#/components/schemas/AnalysisCreatedResponse" } } } },
          "400": { description: "Missing user_id or image" },
        },
      },
    },
    "/api/v1/analyses/{id}/status": {
      get: {
        tags: ["Analyses"],
        summary: "Poll analysis status",
        description: "Returns current status and agent progress logs. Poll this until status = 'completed' or 'failed'.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Analysis ID" },
        ],
        responses: {
          "200": { description: "Analysis status", content: { "application/json": { schema: { $ref: "#/components/schemas/AnalysisStatusResponse" } } } },
          "404": { description: "Analysis not found" },
        },
      },
    },

    // ============ RECOMMENDATIONS ============
    "/api/v1/analyses/{id}/recommendations": {
      get: {
        tags: ["Recommendations"],
        summary: "Get recommendations (tier-filtered)",
        description: "Returns hairstyle recommendations. Free tier: 1 clear + rest locked, sorted lowest first. Pro tier: all clear, sorted highest first.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Analysis ID" },
        ],
        responses: {
          "200": {
            description: "Recommendations",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RecommendationsResponse" },
              },
            },
          },
          "404": { description: "Analysis not found" },
        },
      },
    },

    // ============ PAYMENTS ============
    "/api/v1/payments/checkout": {
      post: {
        tags: ["Payments"],
        summary: "Create DOKU checkout session",
        description: "Generates a DOKU payment link (Rp15.000 for Pro tier). Redirect user to checkout_url.",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CheckoutRequest" },
              example: { user_id: "uuid-here", analysis_id: "uuid-optional" },
            },
          },
        },
        responses: {
          "200": { description: "Checkout session created", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckoutResponse" } } } },
          "400": { description: "Missing user_id" },
        },
      },
    },
    "/api/v1/payments/webhook": {
      post: {
        tags: ["Payments"],
        summary: "DOKU webhook callback",
        description: "Called by DOKU when payment status changes. Verifies signature, updates user tier to 'pro'.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", description: "DOKU webhook payload" },
            },
          },
        },
        responses: {
          "200": { description: "Webhook processed", content: { "application/json": { schema: { $ref: "#/components/schemas/WebhookResponse" } } } },
          "400": { description: "Invalid signature" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Better Auth session token",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Better Auth session cookie (auto-set after login)",
      },
    },
    schemas: {
      // ---- Health ----
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string", example: "findmycut-api" },
        },
      },

      // ---- Auth ----
      SignUpRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Aldo" },
          email: { type: "string", format: "email", example: "aldo@example.com" },
          password: { type: "string", minLength: 8, example: "password123" },
          username: { type: "string", example: "aldo" },
        },
      },
      SignInRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      SessionResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string", nullable: true },
              image: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              tier: { type: "string", enum: ["free", "pro"], default: "free" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          session: {
            type: "object",
            properties: {
              id: { type: "string" },
              expiresAt: { type: "string", format: "date-time" },
              token: { type: "string", description: "Use as Bearer token in Authorization header" },
            },
          },
        },
      },

      // ---- Users ----
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", nullable: true },
          image: { type: "string", nullable: true },
        },
      },

      // ---- Uploads ----
      UploadBase64Request: {
        type: "object",
        required: ["image_base64"],
        properties: {
          image_base64: { type: "string", description: "Base64 encoded image (with or without data:image prefix)" },
        },
      },
      UploadResponse: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string", format: "uri" },
          width: { type: "integer" },
          height: { type: "integer" },
          size_bytes: { type: "integer" },
        },
      },

      // ---- Analyses ----
      AnalysisRequest: {
        type: "object",
        required: ["user_id"],
        properties: {
          user_id: { type: "string", format: "uuid" },
          image_url: { type: "string", format: "uri", description: "Single pre-uploaded image URL" },
          image_urls: { type: "array", items: { type: "string", format: "uri" }, description: "Multiple image URLs (Pro: 4 angles)" },
          image_base64: { type: "string", description: "Single base64 image (auto-uploads to R2)" },
          images_base64: { type: "array", items: { type: "string" }, description: "Multiple base64 images" },
          latitude: { type: "number", description: "User latitude (for barbershop finder)" },
          longitude: { type: "number", description: "User longitude (for barbershop finder)" },
          tier: { type: "string", enum: ["free", "pro"], default: "free" },
        },
      },
      AnalysisCreatedResponse: {
        type: "object",
        properties: {
          analysis_id: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["processing"], example: "processing" },
        },
      },
      AnalysisStatusResponse: {
        type: "object",
        properties: {
          analysis_id: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["processing", "completed", "failed"] },
          current_agent: { type: "string", enum: ["vision", "knowledge", "ranking", "imagegen", "barbershop", "done"], nullable: true },
          progress: {
            type: "array",
            items: {
              type: "object",
              properties: {
                agent: { type: "string" },
                step: { type: "string" },
                message: { type: "string" },
                tool_call: { type: "string", nullable: true },
                timestamp: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },

      // ---- Recommendations ----
      RecommendationsResponse: {
        type: "object",
        properties: {
          tier: { type: "string", enum: ["free", "pro"] },
          analysis: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              status: { type: "string" },
              face_shape: { type: "string", enum: ["oval", "round", "square", "heart", "oblong", "diamond"] },
              face_confidence: { type: "number", minimum: 0, maximum: 1 },
              hair_density: { type: "string", enum: ["thin", "medium", "thick"] },
              hair_texture: { type: "string", enum: ["straight", "wavy", "curly", "coily"] },
            },
          },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/RecommendationItem" },
          },
        },
      },
      RecommendationItem: {
        type: "object",
        properties: {
          name: { type: "string", example: "Textured Crop" },
          match: { type: "number", example: 94 },
          image: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["Front", "Side", "Back", "Top"] },
                url: { type: "string", format: "uri" },
              },
            },
          },
          barbershop: { type: "object", nullable: true },
          barber_instruction: { type: "string", nullable: true },
          styling_tips: { type: "string", nullable: true },
          maintenance: { type: "string", nullable: true },
          is_locked: { type: "boolean" },
        },
      },

      // ---- Payments ----
      CheckoutRequest: {
        type: "object",
        required: ["user_id"],
        properties: {
          user_id: { type: "string", format: "uuid" },
          analysis_id: { type: "string", format: "uuid", description: "Optional — link payment to specific analysis" },
        },
      },
      CheckoutResponse: {
        type: "object",
        properties: {
          checkout_url: { type: "string", format: "uri", description: "Redirect user to this DOKU checkout page" },
          transaction_id: { type: "string", description: "Invoice number for tracking" },
        },
      },
      WebhookResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "success" },
        },
      },
    },
  },
};
