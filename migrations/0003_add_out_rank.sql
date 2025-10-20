-- Out Rank 상태 추적 컬럼 추가

-- hasie_rankings 테이블에 out_rank 컬럼 추가
ALTER TABLE hasie_rankings ADD COLUMN out_rank INTEGER DEFAULT 0;

-- 0 = 순위권 내, 1 = 순위권 이탈 (Out Rank)

-- out_rank 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_hasie_rankings_out_rank ON hasie_rankings(out_rank, created_at DESC);
