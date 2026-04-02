檔案說明

1. config.example.js
   - 範例設定檔。

2. config.js
   - 實際使用的設定檔。
   - 請填入您的 SUPABASE_URL 與 SUPABASE_ANON_KEY。

3. index.html
   - 首頁。
   - 左邊：自己玩／建立競賽。
   - 右邊：加入競賽。

4. game.html
   - 競賽進行頁。
   - 顯示 6 位數代號、加入人數、倒數、每題統計、前三名。

5. styles.css
   - 視覺樣式。

6. app.js
   - 所有前端邏輯。

注意事項

1. GitHub Pages 部署時，請將這些檔案放在同一層。
2. config.js 需要手動填入您自己的 Supabase 參數。
3. 本版本使用 Supabase 資料表：
   - TblP01Question
   - TblP01Attempt
   - TblP01GameSession
   - TblP01GamePlayer
4. 目前採用前端輪詢（polling）方式同步，不需額外伺服器。
5. GameCode 設計為 6 位數，並依資料庫 UNIQUE 限制避免永久重複。


注意：zip 內的 config.js 仍是範例值，部署前必須改回您自己的 Supabase URL 與 anon key，否則會出現 Failed to fetch。
