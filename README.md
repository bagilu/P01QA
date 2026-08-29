# P01 我的卡呼 V26.3

基準：V26.2 Image Questions。

本版新增兩項功能：

1. 建立競賽時可設定題目數（1–100，預設 10）。
2. 勾選多個類別時採「類別輪抽」：第一輪各類別隨機出一題，輪完後進第二輪，再各類別隨機出一題，直到達到設定題數。已無未出題目的類別會略過。
3. 修正答案選項在畫面出現後又重新洗牌的問題。同一玩家＋同一競賽＋同一題使用固定的隨機順序，即使輪詢重新 render 也不會換位。
4. 延續 V26.2 圖片題：Q 欄位可使用 `<img src="images/questions/Q0001.jpg">`。

## 本次部署

只更新 GitHub Pages 即可，不需要執行 Database SQL，也不需要重新部署 Edge Functions。

請從 `GitHub_Deploy_Only/` 更新：

- `index.html`
- `game.html`
- `js/app.js`
- `css/styles.css`

`config.js` 請保留目前線上可用版本，不要覆蓋。

`images/questions/` 是 persistent assets directory。更新程式時，不得刪除既有的 Qxxxx.jpg。

## 題數機制說明

題數目前由主持人的瀏覽器 localStorage 保存，不修改既有 Supabase schema。主持人進入競賽後，依設定題數控制是否繼續抽題。最後一題結算後，「下一題」按鈕會改成「結束競賽」。
