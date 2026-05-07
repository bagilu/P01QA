# P04 V2.6 部署步驟

## 1. 執行 SQL

Supabase Dashboard → SQL Editor

執行：

```text
sql_setup.sql
```

此 SQL 不會刪除舊資料。

---

## 2. 更新 Function：P04_get_recent_notice

請到：

```text
Supabase Dashboard → Edge Functions → P04_get_recent_notice
```

把以下檔案完整貼上：

```text
supabase/functions/P04_get_recent_notice/index.ts
```

然後 Deploy。

重要：不要使用只回傳 `"P04_get_recent_notice working"` 的測試版。

---

## 3. 更新 config.js

請確認 Function URL 是：

```javascript
GET_RECENT_NOTICE:
  "https://YOUR_PROJECT.supabase.co/functions/v1/P04_get_recent_notice"
```

不是：

```javascript
GET_RECENT_NOTIFICATIONS
```

---

## 4. 更新 GitHub Pages

至少覆蓋：

```text
config.js
styles.css
myqrcode.js
```

若您習慣整包覆蓋，也可以覆蓋全部前端檔案。

---

## 5. 測試

1. A 停留在自己的 QRCode 畫面。
2. B 掃描 A 的 QRCode。
3. B 送出微笑 / 問候 / 鼓勵 / 幫助。
4. A 的 QRCode 區域應出現花束通知。
