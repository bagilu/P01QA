# P01 v22 QR 與介面小修正

本版以 v21 可用版本為基礎，只修改前端 HTML / CSS / JS，不更動 SQL 與 Edge Function。

## 修正內容

1. 首頁「暱稱」欄位加入紅色星號與「必填」提示。
2. 題目類別 checkbox 加粗邊框，提高可視性。
3. 建立競賽後，競賽頁會顯示 QR Code；QR Code 內含 `index.html?code=六位數代號`。
4. 掃描 QR Code 後，首頁會自動帶入競賽代號，使用者只需輸入暱稱即可加入。
5. 已加入競賽者在競賽頁也可看到同一個 QR Code，可讓其他人繼續掃描加入。

## 注意

QRCode 使用 CDN：`https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`。
此系統原本已使用 Bootstrap 與 Supabase CDN，因此維持相同部署模式。
