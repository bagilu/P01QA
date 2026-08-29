# P01 Database Deployment

新專案依序執行 `01` 至 `08`。既有專案若只是修復首頁「載入失敗」，先執行 `09_Diagnose_LoadFailure.sql`，再視結果執行 `05`、`06`、`07`。

最常見故障：
1. `config.js` 不存在或 URL／anon key 錯誤。
2. `anon` 沒有 `TblP01Question` 的 `SELECT` grant。
3. RLS 已啟用，但 `p01_question_select_all` policy 不存在。
4. `QCatMain` 欄位不存在。
5. 題庫為空，或 `IsActive` 全為 false。
