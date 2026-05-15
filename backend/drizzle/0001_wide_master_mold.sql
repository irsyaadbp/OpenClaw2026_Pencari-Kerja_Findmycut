CREATE TABLE "barbershop_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_place_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"address" text,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"rating" real,
	"phone" varchar(50),
	"city" varchar(100),
	"specialties" jsonb,
	"price_range" varchar(50),
	"image_url" text,
	"area_key" varchar(20) NOT NULL,
	"source" varchar(20) DEFAULT 'json' NOT NULL,
	"fetched_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "barbershop_cache_google_place_id_unique" UNIQUE("google_place_id")
);
