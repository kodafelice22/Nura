import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261022012742 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "routine" ("id" text not null, "handle" text not null, "title" text not null, "intro" text null, "is_active" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "routine_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_routine_deleted_at" ON "routine" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_routine_handle" ON "routine" ("handle") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "routine_step" ("id" text not null, "product_id" text not null, "step_order" integer not null, "instruction" text null, "routine_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "routine_step_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_routine_step_routine_id" ON "routine_step" ("routine_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_routine_step_deleted_at" ON "routine_step" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_routine_step_product" ON "routine_step" ("product_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "routine_step" add constraint "routine_step_routine_id_foreign" foreign key ("routine_id") references "routine" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "routine_step" drop constraint if exists "routine_step_routine_id_foreign";`);

    this.addSql(`drop table if exists "routine" cascade;`);

    this.addSql(`drop table if exists "routine_step" cascade;`);
  }

}
