drop policy if exists "p01_question_select_all" on public."TblP01Question";
drop policy if exists "p01_gamesession_select_all" on public."TblP01GameSession";
drop policy if exists "p01_gameplayer_select_all" on public."TblP01GamePlayer";
drop policy if exists "p01_attempt_select_all" on public."TblP01Attempt";

-- 前端必須讀取題庫，以建立類別板及抽題。
create policy "p01_question_select_all" on public."TblP01Question"
for select to anon using ("IsActive" = true);

-- v20 之後主要透過 P01_get_game_state 讀取遊戲狀態；以下保留相容性。
create policy "p01_gamesession_select_all" on public."TblP01GameSession"
for select to anon using (true);
create policy "p01_gameplayer_select_all" on public."TblP01GamePlayer"
for select to anon using (true);
create policy "p01_attempt_select_all" on public."TblP01Attempt"
for select to anon using (true);
