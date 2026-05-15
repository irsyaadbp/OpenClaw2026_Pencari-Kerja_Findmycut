CREATE TABLE "agent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"analysis_id" uuid,
	"agent_name" varchar(50),
	"step" varchar(100),
	"message" text,
	"tool_call" varchar(100),
	"tool_input" jsonb,
	"tool_output" jsonb,
	"reasoning" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"image_url" text NOT NULL,
	"face_shape" varchar(20),
	"face_confidence" real,
	"hair_density" varchar(20),
	"hair_texture" varchar(20),
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"current_agent" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hairstyle_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"style_name" varchar(100) NOT NULL,
	"description" text,
	"suitable_face_shapes" jsonb,
	"suitable_hair_types" jsonb,
	"suitable_thickness" jsonb,
	"maintenance_level" varchar(20),
	"reference_image_url" text,
	"styling_tips" text,
	"barber_instruction" text,
	CONSTRAINT "hairstyle_embeddings_style_name_unique" UNIQUE("style_name")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"invoice_number" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"tier" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"doku_session_id" varchar(255),
	"doku_token_id" varchar(255),
	"payment_method" varchar(50),
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid,
	"style_name" varchar(100) NOT NULL,
	"match_score" real NOT NULL,
	"barber_instruction" text,
	"maintenance" text,
	"styling_tips" text,
	"image_urls" jsonb,
	"barbershop" jsonb,
	"is_locked" boolean DEFAULT true,
	"rank" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE no action ON UPDATE no action;