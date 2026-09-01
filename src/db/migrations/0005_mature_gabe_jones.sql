CREATE TYPE "public"."error_source" AS ENUM('server', 'client');--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "error_source" NOT NULL,
	"digest" text,
	"message" text NOT NULL,
	"path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "error_log_created_idx" ON "error_log" USING btree ("created_at");