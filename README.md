# P01 我的卡呼 V26.1（GitHub-only Deploy Baseline）

本版以已恢復運作的 P01 v25/v26 為基準，完成 P-SDS 檔案整理，並明確區分：

- `GitHub_Deploy_Only/`：本次實際上傳 GitHub Pages 的前端檔案。
- `Database/`：完整 SQL 部署與診斷腳本，僅保存，本次不要執行。
- `EdgeFunctions/`：既有六支 Supabase Edge Functions，僅保存，本次不要重新部署。
- `docs/`：故障排除與舊版本紀錄。

## 本次已確認的故障根因

首頁「載入失敗」是因為 `anon` 缺少 `public."TblP01Question"` 的 `SELECT` 權限。現有 Supabase 已經人工修復；對應授權已納入：

`Database/07_GrantPermissions.sql`

## 本次部署方式

只上傳 `GitHub_Deploy_Only/` 裡面的內容，覆蓋網站 repository 根目錄的同名檔案。

務必保留 GitHub 上目前可正常使用的 `config.js`。本 ZIP 不提供真正的 `config.js`，避免誤覆蓋 Supabase URL 與 anon key。

## 不需執行的項目

本次不要執行 SQL，不要重新部署 Edge Functions，也不要重建資料表。這些檔案只是建立最新、可追溯的專案基準。

## 驗證

部署完成後：

1. 開啟首頁並以 `Ctrl+F5` 強制重新整理。
2. 題目類別應正常載入。
3. 測試建立競賽、加入等待室、開始題目、提交答案與排行榜。
4. 若出現錯誤，查看瀏覽器開發者工具 Console 的第一個紅色訊息。

## V26.2 Image Question Support
V26.2 adds safe image rendering inside the existing question field without changing the database schema.
Example: `請問紅色的國家是？<br><img src="images/questions/Q0001.jpg" alt="題目圖片">`.
Question images are persistent GitHub assets under `images/questions/`.
