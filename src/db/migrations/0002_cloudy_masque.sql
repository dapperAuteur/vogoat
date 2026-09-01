CREATE TABLE "animal_verdict" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal" text NOT NULL,
	"status" "script_status" DEFAULT 'candidate' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animal_verdict_animal_unique" UNIQUE("animal")
);
