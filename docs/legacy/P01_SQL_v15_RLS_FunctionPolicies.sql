-- P01我的卡呼 v15：RLS 政策修正版（Function 架構）
-- 適用情境：前端只做非敏感 SELECT；INSERT / UPDATE / DELETE 皆由 Supabase Edge Functions 使用 service_role 執行。
-- 執行順序建議：
-- 1. 先確認 v13/v14 的欄位升級與 Functions 已完成。
-- 2. 再執行本檔。
-- 3. 最後測試：建立競賽、加入競賽、開始第一題、作答、排行榜。

-- 一、啟用 RLS
alter table public."TblP01Question" enable row level security;
alter table public."TblP01GameSession" enable row level security;
alter table public."TblP01GamePlayer" enable row level security;
alter table public."TblP01Attempt" enable row level security;

-- 二、移除舊的同名 SELECT policy，避免重複建立失敗
drop policy if exists "p01_question_select_all" on public."TblP01Question";
drop policy if exists "p01_gamesession_select_all" on public."TblP01GameSession";
drop policy if exists "p01_gameplayer_select_all" on public."TblP01GamePlayer";
drop policy if exists "p01_attempt_select_all" on public."TblP01Attempt";

-- 三、允許前端 anon key 讀取必要資料
-- 題庫類別與目前題目需要讀取 TblP01Question。
create policy "p01_question_select_all"
on public."TblP01Question"
for select
using (true);

-- 遊戲畫面需要輪詢目前場次狀態，例如 waiting / playing / ended、CurrentQID、StartedAt。
create policy "p01_gamesession_select_all"
on public."TblP01GameSession"
for select
using (true);

-- 遊戲畫面需要讀取目前玩家數與排行榜。
create policy "p01_gameplayer_select_all"
on public."TblP01GamePlayer"
for select
using (true);

-- 遊戲畫面需要讀取本題作答統計、是否已作答、得分分布。
create policy "p01_attempt_select_all"
on public."TblP01Attempt"
for select
using (true);

-- 四、重要說明
-- 本檔刻意不建立 INSERT / UPDATE / DELETE policy。
-- 建立競賽、加入競賽、切換題目、送出答案、結束競賽，應由以下 Edge Functions 處理：
-- P01_create_game
-- P01_join_game
-- P01_set_question
-- P01_submit_answer
-- P01_end_game
-- 這些 Functions 使用 SUPABASE_SERVICE_ROLE_KEY，因此可在 RLS 開啟時執行必要寫入。
