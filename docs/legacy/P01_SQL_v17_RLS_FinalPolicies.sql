-- P01我的卡呼 v17：RLS 最終建議政策
-- 目的：搭配 Dashboard 單檔 Edge Functions 使用。
-- 原則：前端 anon 只讀取必要資料；所有 insert/update/delete 均由 P01_xxx Edge Functions 使用 SUPABASE_SERVICE_ROLE_KEY 執行。

-- 1. 啟用 RLS，但不要啟用 FORCE RLS
alter table public."TblP01Question" enable row level security;
alter table public."TblP01GameSession" enable row level security;
alter table public."TblP01GamePlayer" enable row level security;
alter table public."TblP01Attempt" enable row level security;

alter table public."TblP01Question" no force row level security;
alter table public."TblP01GameSession" no force row level security;
alter table public."TblP01GamePlayer" no force row level security;
alter table public."TblP01Attempt" no force row level security;

-- 2. 角色權限
revoke insert, update, delete on table public."TblP01GameSession" from anon;
revoke insert, update, delete on table public."TblP01GamePlayer" from anon;
revoke insert, update, delete on table public."TblP01Attempt" from anon;

grant select on table public."TblP01Question" to anon;
grant select on table public."TblP01GameSession" to anon;
grant select on table public."TblP01GamePlayer" to anon;
grant select on table public."TblP01Attempt" to anon;

grant all on table public."TblP01Question" to service_role;
grant all on table public."TblP01GameSession" to service_role;
grant all on table public."TblP01GamePlayer" to service_role;
grant all on table public."TblP01Attempt" to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 3. 重建 anon SELECT policies
-- 注意：不建立 anon INSERT / UPDATE / DELETE policy。
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

-- 4. Secret 檢查提醒
-- 若 Function 出現：new row violates row-level security policy
-- 請到 Supabase Dashboard → Edge Functions → Secrets 確認是否有：
-- SUPABASE_URL
-- SUPABASE_SERVICE_ROLE_KEY
-- 若沒有 SUPABASE_SERVICE_ROLE_KEY，請從 Project Settings → API 複製 service_role key 新增為 Secret。
