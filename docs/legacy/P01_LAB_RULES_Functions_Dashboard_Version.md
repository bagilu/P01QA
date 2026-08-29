# P01 實驗室規則：Edge Function 採 Dashboard 可貼上版

## 原則

後續若 ZIP 交付對象是老師本人，且部署方式是到 Supabase Dashboard 手動新增 Function 與貼上 code，Function 檔案應採「單檔完整版」。

## 實作規則

每一支 Function 的 `index.ts` 應直接包含：

1. CORS 設定
2. JSON response / error response helper
3. Supabase admin client 建立程式
4. 該 Function 自己的主要商業邏輯

## 避免使用

除非老師明確要求改用 Supabase CLI / npx 部署，否則不要使用：

```ts
import { corsHeaders } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'
```

也不要在 ZIP 中放入 `supabase/functions/_shared`，以免誤以為需要另外部署。

## 原因

Supabase Dashboard 手動貼上 Function code 時，不會像 CLI deploy 一樣自動打包 `_shared` 共用模組。因此單檔完整版較符合老師目前的操作流程。
