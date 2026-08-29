# P01 v16 修正說明：RLS 開啟後建立競賽失敗

## 問題

錯誤訊息：

```text
建立競賽失敗：new row violates row-level security policy for table "TblP01GameSession"
```

這代表 `P01_create_game` 在寫入 `TblP01GameSession` 時，實際上仍被資料表 RLS 規則攔下。

## 本版修正

v16 將每一支 Edge Function 的 Supabase client 建立方式修正為：

```ts
return createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  },
});
```

也就是在 Dashboard 手動貼上 Function 的情境下，明確指定 PostgREST 請求使用 `service_role`。

## 您需要做的事

1. 到 Supabase SQL Editor 執行：

```text
P01_SQL_v16_RLS_ServiceRoleFix.sql
```

2. 到 Supabase Edge Functions，重新貼上以下五支 Function 的 v16 版 `index.ts`：

- `P01_create_game`
- `P01_join_game`
- `P01_set_question`
- `P01_submit_answer`
- `P01_end_game`

其中最重要的是 `P01_create_game`，因為目前錯誤發生在建立競賽。

3. 確認 Function Secrets 中存在：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

通常 Supabase 會自動提供，但若專案設定異常，仍建議確認。

## 本版仍維持的安全原則

- 前端 anon key：只做 SELECT。
- 寫入、更新、計分：走 Edge Function。
- 不使用 `_shared`。
- 每支 Function 都是 Dashboard 可直接貼上版。
