// db/migrations/*.sql を番号順に適用する。適用済みのものは schema_migrations に記録して飛ばす。
// 使い方: npm run db:migrate（.env.local の DATABASE_URL を使う）
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL が設定されていません");
  process.exit(1);
}

const dir = join(import.meta.dirname, "..", "db", "migrations");
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`適用しました: ${file}`);
  }
  console.log("マイグレーションは最新です");
} finally {
  await sql.end();
}
