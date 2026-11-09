ALTER TABLE "accounts" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "brand_color" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "default_template" text;--> statement-breakpoint
ALTER TABLE "piece_versions" ADD COLUMN "template" text;--> statement-breakpoint
ALTER TABLE "piece_versions" ADD COLUMN "creative" jsonb;