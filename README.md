# P01 v25 三介面架構版

本版以 v24 可用版本為基礎，主要重構前端介面，不變更 SQL 與 Edge Function 邏輯。

## 更新重點

1. 改為三介面流程：
   - Home 首頁：建立競賽或輸入代號加入。
   - Lobby 等待室：顯示 QR Code、6 位數代號、目前加入人數與開始按鈕。
   - Quiz 答題畫面：專注於題目、四個答案、倒數與排行榜。

2. 移除展開／收合邏輯：
   - 不再依靠 details 展開或收合管理 UI。
   - 避免每秒輪詢更新時造成介面狀態被覆蓋。

3. 額外升級：
   - 倒數條動畫。
   - 作答後答案鎖定視覺效果。
   - Lobby 加入等待動畫。
   - 主持人「開始第一題」大型按鈕。
   - 掃描 QR Code 加入時，首頁自動切換為極簡加入畫面。

4. 保留：
   - 原本 Supabase SQL。
   - 原本 P01_ Edge Functions。
   - 原本 config.example.js / config.js 使用方式。
   - 原本 QR Code 加入流程。
   - 主持人也必須作答的邏輯。

## 部署提醒

若您已部署 v24 並可正常使用，本版通常只需要覆蓋 GitHub Pages 前端檔案：

- index.html
- game.html
- app.js
- styles.css

`config.js` 請沿用原本可用版本，不要用 `config.example.js` 覆蓋。


---


## v16 更新重點

- 修正 RLS enable 後，`P01_create_game` 建立競賽可能被 `TblP01GameSession` RLS 阻擋的問題。
- 每支 Function 明確以 `SUPABASE_SERVICE_ROLE_KEY` 作為 `apikey` 與 `Authorization` header。
- 新增 `P01_SQL_v16_RLS_ServiceRoleFix.sql`。
- 新增 `P01_v16_FIX_NOTE.md`。
- Function 仍維持 Dashboard 單檔貼上版，不使用 `_shared`。

# P01 我的卡呼 v13：Function 架構＋搶答分數版

本版以 `P01_kahoot_v12_quick_score` 為基準升級，主要修改為：

1. 保留原本答對／答錯、答對率、答對數統計。
2. 新增「搶答分數」：每題倒數 30 秒，答對者得分等於剩餘秒數；答錯或逾時為 0 分。
3. 新增總分欄位 `TotalScore`，排行榜第一順位改為「搶答分數」。
4. 將所有 insert / update 類操作改為 Edge Function 架構。
5. 前端仍使用 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY` 呼叫 Function 與讀取非敏感資料。

---

## 一、檔案說明

### 前端檔案

- `index.html`：首頁、建立競賽、加入競賽。
- `game.html`：競賽頁面。
- `app.js`：前端主要邏輯；本版寫入操作已改呼叫 Edge Functions。
- `styles.css`：樣式。
- `config.example.js`：設定範例。

本版未附 `config.js`。請保留您原本已經可用的 `config.js`，避免覆蓋 Supabase URL 與 anon key。

### SQL 檔案

- `P01_SQL_v13_FunctionScoreUpgrade.sql`：本版主要升級 SQL。
- `P01_SQL_v12_ScoreUpgrade.sql`：上一版搶答分數升級 SQL，保留供比對。
- `P01_SQL_Upgrade.sql`：原升級 SQL，保留供追蹤。
- `RLS_FIX_SQL.txt`：舊版 RLS 參考資料。

### Edge Functions

位於：`supabase/functions/`

- `P01_create_game`：建立競賽與主持者玩家紀錄。
- `P01_join_game`：加入競賽與建立玩家紀錄。
- `P01_set_question`：主持者開始第一題或切換下一題。
- `P01_submit_answer`：送出答案、由伺服器計算答對與搶答分數、寫入作答紀錄並更新玩家統計。
- `P01_end_game`：主持者結束競賽。

共用檔案：

- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/supabaseAdmin.ts`

---

## 二、部署順序

1. 到 Supabase SQL Editor 執行：`P01_SQL_v13_FunctionScoreUpgrade.sql`
2. 部署 Edge Functions，詳見：`P01_FUNCTION_DEPLOY_STEPS.md`
3. 將前端檔案覆蓋到 GitHub Pages。
4. 保留原本 `config.js`，不要用 `config.example.js` 覆蓋。
5. 開啟網站測試建立競賽、加入競賽、作答與排行榜。

---

## 三、Function 架構說明

本版將敏感寫入集中到 Edge Functions，包含：

- 建立競賽 session。
- 加入玩家。
- 主持者切題。
- 玩家送出答案。
- 更新答對數、作答數、總分。
- 結束競賽。

其中 `P01_submit_answer` 不信任前端傳來的答對與分數，而是在 Function 內重新讀取目前題目、正確答案與題目開始時間，再由伺服器計算：

- `IsCorrect`
- `ResponseTime`
- `Score`

計分規則：

```text
Score = 答對 ? max(0, 30 - ResponseTime) : 0
```

---

## 四、風格選項

目前選擇：**原 P01 競賽卡片風格，維持既有介面，只微調功能，不大改視覺。**

可選風格：

A. 原 P01 競賽卡片風格（目前選擇）  
B. 淡藍科技校園風  
C. 日式清爽文青風  
D. 深色電子競賽風  
E. 活潑教室活動風  

---

## 五、注意事項

- Function 名稱均以 `P01_` 開頭，符合 P 編號管理習慣。
- SQL 檔案均以 `P01_` 開頭。
- 本版沒有更新 `config.js`，只提供 `config.example.js`。
- 若部署後出現 Edge Function returned a non-2xx status code，請先到 Supabase Function logs 查看是哪一支 Function 回傳錯誤。


## v15 更新：Dashboard 可直接貼上版 Functions

本版已移除 `supabase/functions/_shared` 共用資料夾。每一支 Edge Function 的 `index.ts` 都是單檔完整版，已內含：

- CORS headers
- `jsonResponse()` / `errorResponse()`
- `getAdminClient()`
- Supabase service role client 建立邏輯

因此若採用 Supabase Dashboard 手動建立 Function 的方式，只要逐一建立下列 Function 名稱，並貼上各自 `index.ts` 的完整內容即可：

1. `P01_create_game`
2. `P01_join_game`
3. `P01_set_question`
4. `P01_submit_answer`
5. `P01_end_game`

注意：Function 仍需可讀取 Supabase 專案環境變數：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

本版不需要 deploy `_shared`，也不需要上傳 `_shared`。

## 實驗室規則紀錄

後續若目標是讓老師可在任何電腦登入 Supabase Dashboard 手動新增 Function 並貼上程式碼，Edge Function 應優先產出「單檔完整版」，不要使用 `_shared` import 架構，以降低部署混淆。


## v15 更新重點

1. 暱稱欄位會自動帶入上一次使用過的暱稱。
2. 主持人的「結束競賽」按鈕已移到右上角，與「回首頁」放在一起。
3. 新增 `P01_SQL_v15_RLS_FunctionPolicies.sql`，修正啟用 RLS 後 `TblP01GameSession`、`TblP01GamePlayer`、`TblP01Attempt`、`TblP01Question` 前端必要 SELECT 無法通過的問題。
4. Function 維持 Dashboard 可直接貼上版；沒有 `_shared` 資料夾。

## RLS 設定原則

本版採用：前端只讀取非敏感資料，所有寫入由 Edge Function 處理。啟用 RLS 後，請執行：

```sql
P01_SQL_v15_RLS_FunctionPolicies.sql
```

此 SQL 只建立 SELECT policy，不建立 INSERT / UPDATE / DELETE policy。


## v18 更新重點

1. 修正 RLS enable 後仍需確認 Edge Function Secrets：`SUPABASE_SERVICE_ROLE_KEY` 必須存在。
2. 修正題目一出現就立即結束答題的時間判讀問題。
3. 全體作答完成或時間到後，畫面改為只顯示三種排行榜；主持人可在排行榜上方按「下一題」。
4. 繼續採用 Dashboard 單檔 Function 架構，不使用 `_shared`。

## v18 建議更新順序

1. 執行 `P01_SQL_v18_RLS_FinalPolicies.sql`。
2. 覆蓋 GitHub Pages 前端檔案。
3. 檢查 Supabase Dashboard → Edge Functions → Secrets 是否有 `SUPABASE_SERVICE_ROLE_KEY`。
4. 若 Function 曾貼錯或仍遇到 RLS 寫入錯誤，重新貼上本 ZIP 內五支 `P01_` Function。


## v18 修正說明

1. 修正主持人按「開始第一題」後，主持人端畫面可能停留在等待區或看似沒有更新的問題。
2. 主持人端在成功呼叫 `P01_set_question` 後，會立即用本機已抽出的題目更新畫面，不必等待下一輪 Supabase 輪詢。
3. 主持人端題目畫面只作為監看，不開放答題按鈕；參與者端作答流程維持不變。
4. `P01_set_question` Function 不需要重新貼上；本版主要更新前端 `app.js`。


## v19 更新：主持人也作答

本版調整主持人端邏輯：主持人不再只是監看螢幕，而是和參與者一樣需要作答。主持人按「開始第一題」後，自己的畫面會顯示題目與答案選項；全體玩家（包含主持人）都作答後，畫面改為只顯示三種排行榜，主持人可按「下一題」。

另修正主持人等待畫面的參加人數更新方式，改以一般 `select UserID` 計算人數，避免部分 RLS / PostgREST 設定下 `head count` 不更新。

---

## v20 補充：主持人同步修正

v20 新增 `P01_get_game_state` Function，主持人與參與者的競賽狀態、參加人數、作答紀錄、排行榜資料都改由此 Function 回傳。這樣可以避免 RLS enable 後，主持人端直接 select `TblP01GameSession` 或 `TblP01GamePlayer` 時出現畫面不更新或「找不到競賽資料」。

需要新增部署：

```text
supabase/functions/P01_get_game_state/index.ts
```

此 Function 是 Dashboard 單檔貼上版，不需要 `_shared`。
