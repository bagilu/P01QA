alter table public."TblP01Question" enable row level security;
alter table public."TblP01GameSession" enable row level security;
alter table public."TblP01GamePlayer" enable row level security;
alter table public."TblP01Attempt" enable row level security;

alter table public."TblP01Question" no force row level security;
alter table public."TblP01GameSession" no force row level security;
alter table public."TblP01GamePlayer" no force row level security;
alter table public."TblP01Attempt" no force row level security;
