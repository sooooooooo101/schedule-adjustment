import "server-only";
import postgres, { type Sql } from "postgres";
import { env } from "./env";

let client: Sql | null = null;

// サーバー専用。Neon の接続プール（-pooler 付きの URL）経由で接続する。
export function sql(): Sql {
  if (client) return client;
  client = postgres(env().DATABASE_URL, {
    // サーバーレスでは関数ごとに接続が増えやすいため、1 インスタンスあたりの接続数を絞る
    max: 1,
    idle_timeout: 20,
    // 接続プール（トランザクションモード）経由では名前付きプリペアドステートメントを使わない
    prepare: false,
  });
  return client;
}
