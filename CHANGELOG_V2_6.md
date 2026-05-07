# P04 V2.6 Changelog

## 修正
- 修正 V2.5 中 `P04_get_recent_notice` 被誤放成測試 stub 的問題。
- 統一使用 Function 名稱 `P04_get_recent_notice`。
- config key 統一為 `GET_RECENT_NOTICE`。
- 保留遊戲化教育風格基礎。
- ZIP 最外層包含同名資料夾。

## 重要提醒
請不要用只回傳 `"P04_get_recent_notice working"` 的版本覆蓋 Supabase Function。
