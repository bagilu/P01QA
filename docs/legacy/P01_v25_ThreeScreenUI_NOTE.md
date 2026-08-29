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
