grant usage on schema public to anon, authenticated, service_role;

grant select on table public."TblP01Question" to anon, authenticated;
grant select on table public."TblP01GameSession" to anon, authenticated;
grant select on table public."TblP01GamePlayer" to anon, authenticated;
grant select on table public."TblP01Attempt" to anon, authenticated;

revoke insert, update, delete on table public."TblP01Question" from anon, authenticated;
revoke insert, update, delete on table public."TblP01GameSession" from anon, authenticated;
revoke insert, update, delete on table public."TblP01GamePlayer" from anon, authenticated;
revoke insert, update, delete on table public."TblP01Attempt" from anon, authenticated;

grant all privileges on table public."TblP01Question" to service_role;
grant all privileges on table public."TblP01GameSession" to service_role;
grant all privileges on table public."TblP01GamePlayer" to service_role;
grant all privileges on table public."TblP01Attempt" to service_role;
grant usage, select on all sequences in schema public to service_role;
