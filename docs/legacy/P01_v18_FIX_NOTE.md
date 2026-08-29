# P01 v18 修正說明：主持人出題後畫面不更新

## 問題

v17 測試時，參與者端可以正常看到題目與作答，但主持人按下「開始第一題」後，主持人端畫面可能停留在原畫面，看起來沒有更新。

## 修正

本版修改前端 `app.js`：

1. 新增 `renderQuestionObject(state, question)`，讓主持人端可直接使用已抽出的題目更新畫面。
2. `startFirstQuestion()` 呼叫 `P01_set_question` 成功後，不再只依賴下一輪輪詢，而是立即：
   - 更新 `state.session`
   - 顯示題目區
   - 顯示倒數
   - 鎖住主持人端答案按鈕
3. `manualNextQuestion()` / `autoAdvanceQuestion()` 也採用同樣邏輯。

## 部署

只需要覆蓋 GitHub Pages 前端檔案即可。

Supabase SQL 與 Edge Functions 若已使用 v17 且運作正常，本版不需要重新部署 Function。
