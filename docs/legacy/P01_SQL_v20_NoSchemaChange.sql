-- P01 v20：本版無新增資料表或欄位。
-- 若您已成功執行 v17 RLS SQL，通常不需要再執行新的 SQL。
-- v20 的主要變更是新增 Edge Function：P01_get_game_state。

-- 檢查建議：確認 anon 可以讀題目；寫入與競賽狀態同步改由 Edge Function 使用 service_role 處理。
select 'P01 v20 no schema change' as note;
