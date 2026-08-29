# P01 v19 修正說明：主持人也作答 + 主持人畫面同步

## 本版修正

1. 主持人建立競賽後，已視為玩家之一。
2. 主持人按「開始第一題」後，主持人畫面也會出現答案選項，可以作答。
3. 主持人作答後，和其他參與者一樣等待本題結束。
4. 全體作答完成或時間結束後，畫面切換為三種排行榜。
5. 只有主持人畫面會出現「下一題」按鈕。
6. 主持人等待畫面的參加人數改用一般 select 計算，避免 RLS / head count 造成畫面不更新。

## 部署方式

如果 v17/v18 的 SQL 與 Edge Functions 已正常，本版主要覆蓋 GitHub Pages 前端檔案即可：

- index.html
- game.html
- app.js
- styles.css
- config.example.js 不需覆蓋原本 config.js

## 注意

本版沒有新增資料表，也沒有新增 Edge Function。
若您已經將 v17 的 RLS 與 v16/v17 Function 正常部署，通常不需要重新貼 Function。
