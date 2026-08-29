-- P01我的卡呼 v16：RLS + Edge Function service_role 修正版
-- 目的：修正 RLS enable 後，建立競賽 / 加入競賽 / 作答等寫入仍被阻擋的情況。
-- 原則：前端 anon 只允許 SELECT；INSERT / UPDATE / DELETE 仍由 Edge Functions 使用 service_role 執行。

-- 一、確認 RLS 開啟，但不要 FORCE RLS
-- 若曾經不小心啟用 FORCE ROW LEVEL SECURITY，可能造成非預期阻擋。
alter table public."TblP01Question" enable row level security;
alter table public."TblP01GameSession" enable row level security;
alter table public."TblP01GamePlayer" enable row level security;
alter table public."TblP01Attempt" enable row level security;

alter table public."TblP01Question" no force row level security;
alter table public."TblP01GameSession" no force row level security;
alter table public."TblP01GamePlayer" no force row level security;
alter table public."TblP01Attempt" no force row level security;

-- 二、基本權限
-- anon：只開必要 SELECT，讓 GitHub Pages 前端可以讀取題庫、場次、玩家、排行榜、作答統計。
-- service_role：保留完整權限，供 Edge Functions 寫入。
grant select on table public."TblP01Question" to anon;
grant select on table public."TblP01GameSession" to anon;
grant select on table public."TblP01GamePlayer" to anon;
grant select on table public."TblP01Attempt" to anon;

grant all on table public."TblP01Question" to service_role;
grant all on table public."TblP01GameSession" to service_role;
grant all on table public."TblP01GamePlayer" to service_role;
grant all on table public."TblP01Attempt" to service_role;

grant usage, select on all sequences in schema public to service_role;

-- 三、重建 SELECT policies
-- 注意：本檔仍然不建立 anon INSERT / UPDATE / DELETE policy。
drop policy if exists "p01_question_select_all" on public."TblP01Question";
drop policy if exists "p01_gamesession_select_all" on public."TblP01GameSession";
drop policy if exists "p01_gameplayer_select_all" on public."TblP01GamePlayer";
drop policy if exists "p01_attempt_select_all" on public."TblP01Attempt";

create policy "p01_question_select_all"
on public."TblP01Question"
for select
to anon
using (true);

create policy "p01_gamesession_select_all"
on public."TblP01GameSession"
for select
to anon
using (true);

create policy "p01_gameplayer_select_all"
on public."TblP01GamePlayer"
for select
to anon
using (true);

create policy "p01_attempt_select_all"
on public."TblP01Attempt"
for select
to anon
using (true);

-- 四、檢查提醒
-- 如果執行本 SQL 後，建立競賽仍出現：
-- new row violates row-level security policy for table "TblP01GameSession"
-- 代表 Supabase Dashboard 上的 P01_create_game Function 可能仍是舊版，
-- 請重新貼上 v16 ZIP 裡 supabase/functions/P01_create_game/index.ts 的完整內容。
