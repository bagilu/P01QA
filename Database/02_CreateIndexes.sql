create unique index if not exists "P01_GameCode_unique" on public."TblP01GameSession" ("GameCode");
create unique index if not exists "P01_Player_unique_game_user" on public."TblP01GamePlayer" ("GameID", "UserID");
create unique index if not exists "P01_Attempt_unique_game_user_qid" on public."TblP01Attempt" ("GameID", "UserID", "QID");
create index if not exists "P01_Question_category" on public."TblP01Question" ("QCatMain", "QCat");
create index if not exists "P01_Player_game" on public."TblP01GamePlayer" ("GameID");
create index if not exists "P01_Attempt_game_qid" on public."TblP01Attempt" ("GameID", "QID");
