# P01 v17 修正說明

## 本版修正

1. **RLS + Function 架構確認**
   - RLS 可以保持 enable。
   - 前端 anon 只允許 SELECT。
   - 建立競賽、加入競賽、切題、送出答案、結束競賽仍由 Edge Function 使用 `SUPABASE_SERVICE_ROLE_KEY` 寫入。

2. **Supabase Secret 檢查**
   - Dashboard 手動貼上 Function 時，請確認 Edge Function Secrets 裡有：
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - 若沒有 `SUPABASE_SERVICE_ROLE_KEY`，Function 會退回使用不到 service role，寫入就可能被 RLS 擋住。

3. **倒數秒數立即歸零修正**
   - 前端已修正 `StartedAt` 時區判讀。
   - 原因通常是資料庫欄位回傳沒有 `Z` 或 `+00:00` 的時間字串，瀏覽器會誤用台灣本地時間解讀，導致題目一出現就被判定超過 30 秒。

4. **作答完成畫面**
   - 全體作答完成或時間到後，畫面會切換為「只有排行榜」模式。
   - 顯示三種排行榜：
     1. 搶答分數
     2. 答對率
     3. 答對數
   - 主持人會在排行榜上方看到「下一題」按鈕。

## 建議更新步驟

1. 執行 `P01_SQL_v17_RLS_FinalPolicies.sql`。
2. 重新覆蓋 GitHub Pages 前端檔案：
   - `index.html`
   - `game.html`
   - `app.js`
   - `styles.css`
3. 若 v16 的五支 Function 已成功，不一定要重貼；但若仍遇到 RLS 寫入錯誤，請重新貼上本 ZIP 內五支 Function。
4. 檢查 Supabase Dashboard → Edge Functions → Secrets 是否有 `SUPABASE_SERVICE_ROLE_KEY`。

## 本版仍維持的實驗室規則

- Function 採 Dashboard 可直接貼上版。
- 每支 Function 都是單一 `index.ts`。
- 不使用 `_shared` 資料夾。
- Function 名稱保留 `P01_` 前綴。
