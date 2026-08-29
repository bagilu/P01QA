# P01 v20 修正說明：主持人同步狀態改走 Function

## 修正原因

v19 之後雖然 RLS 已可啟用，但主持人端仍直接用前端 anon key 讀取：

- `TblP01GameSession`
- `TblP01GamePlayer`
- `TblP01Attempt`

在某些 RLS / Supabase Dashboard / PostgREST 狀態下，參與者端可正常顯示，但主持人端輪詢可能出現：

```text
同步競賽失敗：找不到競賽資料。
```

或等待畫面的人數不更新。

## v20 解法

新增一支 Dashboard 單檔 Edge Function：

```text
P01_get_game_state
```

用途：

1. 讀取目前競賽資料 `TblP01GameSession`
2. 讀取目前參與者清單 `TblP01GamePlayer`
3. 讀取目前作答紀錄 `TblP01Attempt`
4. 回傳給前端同步畫面
5. 若主持人玩家紀錄意外不存在，會自動補上主持人到 `TblP01GamePlayer`

## 需要部署的 Function

v20 共六支 Function：

1. `P01_create_game`
2. `P01_join_game`
3. `P01_set_question`
4. `P01_submit_answer`
5. `P01_end_game`
6. `P01_get_game_state` ← v20 新增

## 操作提醒

若 v17 的 SQL 與 v19 的其他 Function 已可正常使用，本版主要需要：

1. 覆蓋 GitHub Pages 前端檔案。
2. 到 Supabase Dashboard 新增並貼上 `P01_get_game_state/index.ts`。
3. 其他五支 Function 若已是 v19 可用版，可暫時不用重貼；若要保險，可全部重貼 v20 ZIP 內版本。

## 架構原則

本版延續實驗室規則：

- 不使用 `_shared`。
- 每支 Function 都是單一 `index.ts`。
- 可在任何電腦登入 Supabase Dashboard 直接建立 Function 並貼上程式碼。
