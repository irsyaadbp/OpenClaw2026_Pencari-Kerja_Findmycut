import {
  pgTable, uuid, varchar, text, integer,
  boolean, jsonb, timestamp, serial, real
} from "drizzle-orm/pg-core";

// NOTE: "user" table is managed by Better Auth (auto-created).
// Do NOT define it here. Better Auth also creates "session" and "account" tables.
// To add custom fields (like tier), use user.additionalFields in lib/auth.ts.

// ============ PAYMENTS ============
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 64 }).unique().notNull(),
  amount: integer("amount").notNull(),
  tier: varchar("tier", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  dokuSessionId: varchar("doku_session_id", { length: 255 }),
  dokuTokenId: varchar("doku_token_id", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ ANALYSES ============
export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  imageUrl: text("image_url").notNull(),
  faceShape: varchar("face_shape", { length: 20 }),
  faceConfidence: real("face_confidence"),
  hairDensity: varchar("hair_density", { length: 20 }),
  hairTexture: varchar("hair_texture", { length: 20 }),
  status: varchar("status", { length: 20 }).default("processing").notNull(),
  currentAgent: varchar("current_agent", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ AGENT LOGS ============
export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  analysisId: uuid("analysis_id").references(() => analyses.id),
  agentName: varchar("agent_name", { length: 50 }),
  step: varchar("step", { length: 100 }),
  message: text("message"),
  toolCall: varchar("tool_call", { length: 100 }),
  toolInput: jsonb("tool_input"),
  toolOutput: jsonb("tool_output"),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ RECOMMENDATIONS ============
export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").references(() => analyses.id),
  styleName: varchar("style_name", { length: 100 }).notNull(),
  matchScore: real("match_score").notNull(),
  barberInstruction: text("barber_instruction"),
  maintenance: text("maintenance"),
  stylingTips: text("styling_tips"),
  imageUrls: jsonb("image_urls"),
  barbershop: jsonb("barbershop"),
  isLocked: boolean("is_locked").default(true),
  rank: integer("rank").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ HAIRSTYLE EMBEDDINGS ============
export const hairstyleEmbeddings = pgTable("hairstyle_embeddings", {
  id: serial("id").primaryKey(),
  styleName: varchar("style_name", { length: 100 }).unique().notNull(),
  description: text("description"),
  suitableFaceShapes: jsonb("suitable_face_shapes"),
  suitableHairTypes: jsonb("suitable_hair_types"),
  suitableThickness: jsonb("suitable_thickness"),
  maintenanceLevel: varchar("maintenance_level", { length: 20 }),
  referenceImageUrl: text("reference_image_url"),
  stylingTips: text("styling_tips"),
  barberInstruction: text("barber_instruction"),
});
