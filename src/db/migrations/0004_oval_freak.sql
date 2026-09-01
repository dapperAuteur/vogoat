CREATE TYPE "public"."claim_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "cashapp_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"cash_app_name" text NOT NULL,
	"status" "claim_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cashapp_claim" ADD CONSTRAINT "cashapp_claim_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;