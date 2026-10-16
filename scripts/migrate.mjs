// db/migrations/*.sql を番号順に適用する。適用済みのものは schema_migrations に記録して飛ばす。
// 使い方: npm run db:migrate（.env.local の DATABASE_URL を使う）
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

// ビルド時（npm run build）にも実行する。プレビュー環境も本番と同じ DB を使うため、
// マージ前の変更が本番 DB に入らないよう、Vercel では本番デプロイのときだけ適用する。
const onVercel = Boolean(process.env.VERCEL);
if (onVercel && process.env.VERCEL_ENV !== "production") {
  console.log(`マイグレーションを省略します（Vercel の ${process.env.VERCEL_ENV} 環境）`);
  process.exit(0);
}

// DDL は接続プールを通さない直接接続で流す（Neon 連携で DATABASE_URL_UNPOOLED が入る）
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (!onVercel && process.env.npm_lifecycle_event === "build") {
    console.log("DATABASE_URL がないため、マイグレーションを省略します（手元でのビルド）");
    process.exit(0);
  }
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
