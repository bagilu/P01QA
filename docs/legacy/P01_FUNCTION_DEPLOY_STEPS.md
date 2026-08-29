# P01 v14 Edge Functions 部署步驟（Dashboard 可直接貼上版）

本版不使用 `_shared` 資料夾。每支 Function 的 `index.ts` 都是完整單檔，可直接貼到 Supabase Dashboard。

## 一、先執行 SQL

請先到 Supabase SQL Editor 執行：

```text
P01_SQL_v13_FunctionScoreUpgrade.sql
```

若您尚未執行過 v12 分數欄位升級，也請先確認：

```text
P01_SQL_v12_ScoreUpgrade.sql
```

## 二、確認環境變數

到 Supabase Dashboard 檢查 Edge Functions 的 Secrets / Environment variables，需有：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## 三、逐一建立 Functions

到 Supabase Dashboard → Edge Functions，建立以下 Function 名稱，並將對應資料夾中的 `index.ts` 全文貼上：

1. `P01_create_game`
   - 貼上：`supabase/functions/P01_create_game/index.ts`

2. `P01_join_game`
   - 貼上：`supabase/functions/P01_join_game/index.ts`

3. `P01_set_question`
   - 貼上：`supabase/functions/P01_set_question/index.ts`

4. `P01_submit_answer`
   - 貼上：`supabase/functions/P01_submit_answer/index.ts`

5. `P01_end_game`
   - 貼上：`supabase/functions/P01_end_game/index.ts`

## 四、前端部署

GitHub Pages 只需要上傳前端檔案：

- `index.html`
- `game.html`
- `app.js`
- `styles.css`
- `config.js`

本版只附 `config.example.js`。請保留您原本已設定好的 `config.js`，不要用 example 覆蓋。

## 五、測試

建議測試順序：

1. 首頁可讀取主類別與次類別。
2. 建立競賽，可產生 6 位數代號。
3. 另一位玩家可加入競賽。
4. 主持者開始題目。
5. 玩家作答後，答對者依剩餘秒數取得分數。
6. 答錯或逾時為 0 分。
7. 排行榜顯示答對率、答對數與總分。

## v15 RLS 補充

若您已經在 Supabase Table 開啟 RLS，請再執行：

```sql
P01_SQL_v15_RLS_FunctionPolicies.sql
```

本 SQL 會讓前端可讀取題目、場次、玩家與作答統計；寫入仍由 Dashboard 單檔版 Edge Functions 處理。

---

## v20 新增 Function

請在 Supabase Dashboard → Edge Functions 新增：

```text
P01_get_game_state
```

並貼上：

```text
supabase/functions/P01_get_game_state/index.ts
```

此 Function 用於同步主持人與參與者畫面狀態，尤其是：

- 參加人數
- 目前題目狀態
- 是否全體作答
- 三種排行榜資料

v20 之後，主持人端不再直接讀取 `TblP01GameSession`、`TblP01GamePlayer`、`TblP01Attempt` 來同步畫面，而是透過 `P01_get_game_state` 讀取。
