-- 在 Supabase SQL Editor 執行。本檔只讀取系統目錄，不修改資料。
select to_regclass('public."TblP01Question"') as question_table,
       to_regclass('public."TblP01GameSession"') as session_table,
       to_regclass('public."TblP01GamePlayer"') as player_table,
       to_regclass('public."TblP01Attempt"') as attempt_table;

select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
  and table_name like 'TblP01%'
order by table_name, privilege_type;

select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public' and tablename like 'TblP01%'
order by tablename, policyname;

select "QCatMain", "QCat", count(*) as question_count
from public."TblP01Question"
group by "QCatMain", "QCat"
order by "QCatMain", "QCat";

-- 5. 以前端 anon 角色驗證實際讀取權限。
-- 若此段出現 permission denied，執行 07_GrantPermissions.sql 中的 SELECT grants。
begin;
set local role anon;
select "QCatMain", "QCat"
from public."TblP01Question"
limit 20;
rollback;
