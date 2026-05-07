# P04 微笑漣漪系統 V2.6

## 本版修正

此版本修正 V2.5 中 `P04_get_recent_notice` 被誤放成測試 stub 的問題。

正確的 `P04_get_recent_notice` 必須：
- 連線 Supabase
- 查詢 `tblp04smileevents`
- 根據 `smiler_account` 查詢最近被掃描者收到的紀錄
- 回傳 responder_nickname / smile_type / created_at
- 支援 CORS
- 使用 `SUPABASE_SERVICE_ROLE_KEY`

## Function 名稱統一

- P04_submit_smile_event
- P04_get_home_stats
- P04_get_records_by_date
- P04_get_recent_notice

## ZIP 結構

本 ZIP 最外層包含同名資料夾，方便解壓縮管理。
