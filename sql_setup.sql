-- P04 V2.6 非破壞性 SQL
-- 不刪除、不覆蓋既有資料

ALTER TABLE public.tblp04smileevents
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_p04_smiler_created_at_desc
ON public.tblp04smileevents(smiler_account, created_at DESC);
