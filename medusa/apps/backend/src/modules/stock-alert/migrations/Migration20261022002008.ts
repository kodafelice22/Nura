import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022002008 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "stock_alert_subscription" drop constraint if exists "stock_alert_subscription_email_variant_id_unique";`);
    this.addSql(`create table if not exists "stock_alert_subscription" ("id" text not null, "email" text not null, "variant_id" text not null, "product_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_alert_subscription_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_alert_variant_id" ON "stock_alert_subscription" ("variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_deleted_at" ON "stock_alert_subscription" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_alert_subscription_email_variant_id_unique" ON "stock_alert_subscription" ("email", "variant_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_alert_subscription" cascade;`);
  }

}
