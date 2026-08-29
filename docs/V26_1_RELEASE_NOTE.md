# P01 V26.1 Release Note

- 保留 v25 三畫面 UI 與既有遊戲流程。
- 延續 V26 的具體題庫載入錯誤訊息。
- 將已確認的 `anon SELECT` 授權納入 P-SDS `07_GrantPermissions.sql`。
- 新增 `GitHub_Deploy_Only`，降低誤執行 SQL、誤部署 Edge Functions或覆蓋 `config.js` 的風險。
- 本版不改變 Supabase schema、Edge Function 名稱或計分邏輯。
