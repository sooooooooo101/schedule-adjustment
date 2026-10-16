-- 日程の確定（Google カレンダーへの登録）に使う項目
alter table events add column gcal_html_link text;   -- 作成者のカレンダー上の予定へのリンク
alter table events add column confirmed_at timestamptz;
