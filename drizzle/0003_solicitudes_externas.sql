ALTER TABLE "pieces" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "brief" jsonb;--> statement-breakpoint
ALTER TABLE "pieces" ADD COLUMN "permalink" text;--> statement-breakpoint
CREATE UNIQUE INDEX "pieces_origin_ref" ON "pieces" USING btree ("origin","external_ref");