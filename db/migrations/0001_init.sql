-- 日程調整アプリの初期スキーマ（Neon / PostgreSQL）。
-- DB にはサーバーからのみ接続する。ブラウザに接続情報を渡すことはない。

create table google_accounts (
  email text primary key,
  google_sub text not null unique,
  refresh_token_enc text not null,
  scopes text[] not null default '{}',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id text primary key,                       -- 共有リンクに使う推測困難な ID
  title text not null,
  duration_min integer not null check (duration_min > 0),
  status text not null default 'open' check (status in ('open', 'confirmed')),
  meet_enabled boolean not null default true,
  confirmed_slot_id bigint,
  calendar_account_email text references google_accounts (email),
  gcal_event_id text,
  meet_url text,
  created_at timestamptz not null default now()
);

create table slots (
  id bigint generated always as identity primary key,
  event_id text not null references events (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at)
);
create index slots_event_id_idx on slots (event_id);

alter table events
  add constraint events_confirmed_slot_fk foreign key (confirmed_slot_id) references slots (id);

create table responses (
  id bigint generated always as identity primary key,
  event_id text not null references events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  email text,
  comment text,
  created_at timestamptz not null default now()
);
create index responses_event_id_idx on responses (event_id);

create table answers (
  response_id bigint not null references responses (id) on delete cascade,
  slot_id bigint not null references slots (id) on delete cascade,
  value text not null check (value in ('yes', 'maybe', 'no')),
  primary key (response_id, slot_id)
);
