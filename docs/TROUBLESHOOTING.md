# 首頁「載入失敗」排查

1. 瀏覽器按 F12 → Console，重新整理頁面。
2. 若看到 `config.js 404`：由 `config.example.js` 複製成 `config.js` 並填入 Supabase URL 與 anon key。
3. 若看到 `permission denied for table TblP01Question`：執行 Database/05、06、07。
4. 若看到 `column TblP01Question.QCatMain does not exist`：先備份，再執行 Database/01 中相應 ALTER，或使用舊版 `P01_SQL_Upgrade.sql`。
5. 若請求回傳 401：檢查 anon key 是否屬於目前 Supabase project。
6. 若類別正常但建立／加入競賽失敗：檢查六支 Edge Functions 與 Secrets：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`。
