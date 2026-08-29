-- P01我的卡呼 v13：Function 架構與搶答分數升級 SQL
-- 執行目的：
-- 1. 新增搶答分數欄位 Score / TotalScore。
-- 2. 增加同一位玩家同一題只能作答一次的唯一索引。
-- 3. 前端寫入改由 Edge Functions 使用 service_role 寫入；前端仍可保留非敏感 SELECT。

-- 一、搶答分數欄位
alter table public."TblP01Attempt"
add column if not exists "Score" integer not null default 0;

comment on column public."TblP01Attempt"."Score" is
'P01搶答分數：答對時計入剩餘秒數；答錯或逾時為0。';

alter table public."TblP01GamePlayer"
add column if not exists "TotalScore" integer not null default 0;

comment on column public."TblP01GamePlayer"."TotalScore" is
'P01整場競賽總分，累計每題答對時的剩餘秒數。';

update public."TblP01Attempt"
set "Score" = 0
where "Score" is null;

update public."TblP01GamePlayer"
set "TotalScore" = 0
where "TotalScore" is null;

-- 二、避免重複送出：同一 GameID + UserID + QID 只能有一筆作答紀錄
create unique index if not exists "P01_TblP01Attempt_unique_game_user_qid"
on public."TblP01Attempt" ("GameID", "UserID", "QID");

-- 三、RLS 建議
-- 本版 insert/update 已改由 Edge Function 透過 service_role 執行。
-- 因此前端不需要再擁有 TblP01Attempt / TblP01GamePlayer / TblP01GameSession 的 INSERT 或 UPDATE 權限。
-- 但前端目前仍會 SELECT 題目、場次、玩家、作答分布與排行榜，因此若您啟用 RLS，請保留必要 SELECT policy。

-- 四、部署後檢查
-- 確認以下 Edge Functions 均已部署：
-- P01_create_game
-- P01_join_game
-- P01_set_question
-- P01_submit_answer
-- P01_end_game
