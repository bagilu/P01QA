-- P01我的卡呼 v12：搶答分數升級 SQL
-- 目的：保留原本答對/答錯與答對率統計，新增「分數」功能。
-- 計分規則：每題 30 秒內答對者，以「剩餘秒數」作為得分；答錯或逾時為 0 分。
-- 建議：先備份資料，再執行本 SQL。

-- 1. 每一筆作答紀錄新增 Score 欄位，記錄該題得分。
alter table public."TblP01Attempt"
add column if not exists "Score" integer not null default 0;

comment on column public."TblP01Attempt"."Score" is
'P01搶答分數：答對時計入剩餘秒數；答錯或逾時為0。';

-- 2. 每一位玩家新增 TotalScore 欄位，記錄整場競賽總分。
alter table public."TblP01GamePlayer"
add column if not exists "TotalScore" integer not null default 0;

comment on column public."TblP01GamePlayer"."TotalScore" is
'P01整場競賽總分，累計每題答對時的剩餘秒數。';

-- 3. 若資料表已有舊資料，先補 0，避免 null 造成前端計算錯誤。
update public."TblP01Attempt"
set "Score" = 0
where "Score" is null;

update public."TblP01GamePlayer"
set "TotalScore" = 0
where "TotalScore" is null;

-- 4. 若您希望用既有舊作答資料重建分數，可使用以下語法。
-- 注意：舊資料若 ResponseTime 不準確，重建分數也會不準確。
-- update public."TblP01Attempt"
-- set "Score" = case
--   when "IsCorrect" = true then greatest(0, 30 - coalesce("ResponseTime", 30))
--   else 0
-- end;
--
-- update public."TblP01GamePlayer" p
-- set "TotalScore" = coalesce(s.total_score, 0)
-- from (
--   select "GameID", "UserID", sum("Score") as total_score
--   from public."TblP01Attempt"
--   group by "GameID", "UserID"
-- ) s
-- where p."GameID" = s."GameID"
--   and p."UserID" = s."UserID";

-- 5. RLS 提醒：
-- 前端需要能對 TblP01Attempt 讀取 Score，並能對 TblP01GamePlayer 讀取/更新 TotalScore。
-- 若您目前已經因教學競賽用途開放 SELECT/INSERT/UPDATE，通常不需另外調整。
