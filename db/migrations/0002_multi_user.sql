-- 複数ユーザー対応。誰でも Google でログインして作成者になれるようにする。
-- 1 ユーザーが複数の Google アカウント（Gmail と Workspace など）を連携でき、
-- 1 つの Google アカウントは 1 ユーザーにだけ属する。

create table users (
  id bigint generated always as identity primary key,
  email text not null unique,              -- 最初にログインした Google アカウント
  created_at timestamptz not null default now()
);

alter table google_accounts add column user_id bigint references users (id) on delete cascade;

-- 単一作成者時代のデータがあれば、メインのアカウントを持ち主のユーザーにする
insert into users (email) select email from google_accounts where is_primary order by created_at limit 1;
update google_accounts set user_id = (select min(id) from users);

alter table google_accounts alter column user_id set not null;
create index google_accounts_user_id_idx on google_accounts (user_id);

-- メインのアカウントはユーザーごとに 1 つ
create unique index google_accounts_one_primary_per_user on google_accounts (user_id) where is_primary;

-- 調整の持ち主（まだ調整を作る機能はないため既存行はない前提）
alter table events add column owner_user_id bigint not null references users (id) on delete cascade;
create index events_owner_user_id_idx on events (owner_user_id);
