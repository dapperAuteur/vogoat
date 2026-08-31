CREATE TYPE "public"."plan" AS ENUM('free', 'lifetime', 'subscriber');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('player', 'admin');--> statement-breakpoint
CREATE TYPE "public"."daily_status" AS ENUM('draft', 'approved', 'published', 'auto');--> statement-breakpoint
CREATE TYPE "public"."purchase_kind" AS ENUM('lifetime');--> statement-breakpoint
CREATE TYPE "public"."script_status" AS ENUM('candidate', 'use', 'backlog', 'never');--> statement-breakpoint
CREATE TYPE "public"."take_status" AS ENUM('recorded', 'kept', 'submitted', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"role" "role" DEFAULT 'player' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creature" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"base_animal" text NOT NULL,
	"layers" jsonb NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_date" date NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe" jsonb NOT NULL,
	"script_id" uuid NOT NULL,
	"creature_id" uuid NOT NULL,
	"status" "daily_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_day_date_unique" UNIQUE("day_date")
);
--> statement-breakpoint
CREATE TABLE "practice_take" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe" jsonb NOT NULL,
	"blob_url" text,
	"duration_ms" integer,
	"mime" text,
	"size_bytes" integer,
	"peaks" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "purchase_kind" NOT NULL,
	"stripe_checkout_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_stripe_checkout_id_unique" UNIQUE("stripe_checkout_id")
);
--> statement-breakpoint
CREATE TABLE "script" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"status" "script_status" DEFAULT 'candidate' NOT NULL,
	"batch" integer NOT NULL,
	"decided_at" timestamp with time zone,
	"notes" text,
	"used_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "take" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"daily_id" uuid NOT NULL,
	"take_number" integer NOT NULL,
	"status" "take_status" DEFAULT 'recorded' NOT NULL,
	"blob_url" text,
	"duration_ms" integer,
	"mime" text,
	"size_bytes" integer,
	"peaks" jsonb,
	"self_check" jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "take_user_daily_number_uq" UNIQUE("user_id","daily_id","take_number")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"handled_by" text,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"take_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_take_id_unique" UNIQUE("take_id"),
	CONSTRAINT "share_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "literary_device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"definition" text NOT NULL,
	"example_1" text NOT NULL,
	"example_2" text NOT NULL,
	"example_3" text NOT NULL,
	CONSTRAINT "literary_device_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "workshop_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_date" date NOT NULL,
	"device_id" uuid NOT NULL,
	"cycle" integer NOT NULL,
	CONSTRAINT "workshop_daily_day_date_unique" UNIQUE("day_date"),
	CONSTRAINT "workshop_daily_device_cycle_uq" UNIQUE("device_id","cycle")
);
--> statement-breakpoint
CREATE TABLE "workshop_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"day_date" date NOT NULL,
	"device_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_script_candidate" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workshop_entry_user_day_uq" UNIQUE("user_id","day_date")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily" ADD CONSTRAINT "daily_script_id_script_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."script"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily" ADD CONSTRAINT "daily_creature_id_creature_id_fk" FOREIGN KEY ("creature_id") REFERENCES "public"."creature"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_take" ADD CONSTRAINT "practice_take_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "take" ADD CONSTRAINT "take_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "take" ADD CONSTRAINT "take_daily_id_daily_id_fk" FOREIGN KEY ("daily_id") REFERENCES "public"."daily"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_share_id_share_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."share"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share" ADD CONSTRAINT "share_take_id_take_id_fk" FOREIGN KEY ("take_id") REFERENCES "public"."take"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_daily" ADD CONSTRAINT "workshop_daily_device_id_literary_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."literary_device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_entry" ADD CONSTRAINT "workshop_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_entry" ADD CONSTRAINT "workshop_entry_device_id_literary_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."literary_device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_recipe_id_uq" ON "daily" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "daily_status_idx" ON "daily" USING btree ("status");--> statement-breakpoint
CREATE INDEX "practice_take_user_idx" ON "practice_take" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "script_status_idx" ON "script" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "take_one_submission_per_day_uq" ON "take" USING btree ("user_id","daily_id") WHERE "take"."status" = 'submitted';--> statement-breakpoint
CREATE INDEX "take_user_idx" ON "take" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "take_expires_idx" ON "take" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status");--> statement-breakpoint
CREATE INDEX "share_slug_idx" ON "share" USING btree ("slug");