-- P01我的卡呼：兩層類別 + 等待開始模式
-- 建議先備份資料，再執行以下語法。

-- 1. 題目表新增第一層大類別欄位
alter table public."TblP01Question"
add column if not exists "QCatMain" text;

-- 若舊資料尚未分類，可先暫時填入「未分類」
update public."TblP01Question"
set "QCatMain" = coalesce(nullif(trim("QCatMain"), ''), '未分類')
where "QCatMain" is null or trim("QCatMain") = '';

-- 2. 競賽表新增複選用的小類別清單欄位
alter table public."TblP01GameSession"
add column if not exists "SelectedQCats" text;

-- 3. 將既有資料補成可相容的 waiting / playing / ended 狀態
-- 若 Status 原本不存在，請先自行確認表結構；此專案先前版本通常已存在 Status。
update public."TblP01GameSession"
set "Status" = coalesce(nullif(trim("Status"), ''), 'waiting')
where "Status" is null or trim("Status") = '';

-- 4. 將既有單一 QCat 轉成 JSON 陣列字串，方便新版本繼續使用
update public."TblP01GameSession"
set "SelectedQCats" =
  case
    when "SelectedQCats" is not null and trim("SelectedQCats") <> '' then "SelectedQCats"
    when "QCat" is not null and trim("QCat") <> '' then '["' || replace(trim("QCat"), '"', '\"') || '"]'
    else '[]'
  end
where "SelectedQCats" is null or trim("SelectedQCats") = '';

-- 5. （可選）若您希望建立競賽預設就是 waiting
alter table public."TblP01GameSession"
alter column "Status" set default 'waiting';

-- 6. （可選）若您希望一場遊戲中同一位玩家同一題只能有一筆作答
-- 請先確認既有資料沒有重複，再執行。
-- create unique index if not exists idx_tblp01attempt_game_user_qid
-- on public."TblP01Attempt" ("GameID", "UserID", "QID");

-- 7. RLS 提醒：若本題統計要正常顯示，TblP01Attempt 需要有 SELECT 權限
-- 以下是教學用最小可行版本；正式上線可再收緊條件。
-- alter table public."TblP01Attempt" enable row level security;
-- drop policy if exists "p01_attempt_select_all" on public."TblP01Attempt";
-- create policy "p01_attempt_select_all"
-- on public."TblP01Attempt"
-- for select
-- using (true);
