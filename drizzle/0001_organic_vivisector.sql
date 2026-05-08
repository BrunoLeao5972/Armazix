CREATE TABLE "email_auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"code" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'un' NOT NULL,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '',
	"images" jsonb DEFAULT '[]'::jsonb,
	"cost_cents" integer DEFAULT 0,
	"track_stock" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"allow_sell_without_stock" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"on_promotion" boolean DEFAULT false NOT NULL,
	"promotion_price_cents" integer,
	"variations" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "logo_url" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "phones" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "whatsapp" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "address_info" jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "business_hours" jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "delivery" jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "payments" jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "banners" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "categories" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_auth_codes" ADD CONSTRAINT "email_auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_auth_codes_code_hash_idx" ON "email_auth_codes" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "email_auth_codes_user_purpose_idx" ON "email_auth_codes" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "email_auth_codes_email_purpose_idx" ON "email_auth_codes" USING btree ("email","purpose");--> statement-breakpoint
CREATE INDEX "products_store_id_idx" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("store_id","category");