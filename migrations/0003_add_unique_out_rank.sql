-- 중복 OUT 기록 방지를 위한 UNIQUE 인덱스 추가
-- ⚠️ 주의: 기존 데이터는 삭제하지 않고, 앞으로 생성될 데이터만 제약

-- 1) 기존 중복 OUT 기록만 정리 (out_rank=1이고 같은 분에 중복된 경우만)
DELETE FROM hasie_rankings
WHERE out_rank = 1
  AND id NOT IN (
    SELECT MIN(id)
    FROM hasie_rankings
    WHERE out_rank = 1
    GROUP BY product_link, strftime('%Y-%m-%d %H:%M', created_at)
  );

-- 2) UNIQUE 인덱스 생성: OUT 기록은 같은 제품이 같은 분에 1개만 존재 가능
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_out_rank_per_minute
ON hasie_rankings(
  product_link, 
  strftime('%Y-%m-%d %H:%M', created_at)
)
WHERE out_rank = 1;

-- 3) 추가 안전장치: 같은 세션에서 같은 제품의 OUT 기록은 1개만
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_out_rank_per_session
ON hasie_rankings(
  product_link,
  update_session_id
)
WHERE out_rank = 1 AND update_session_id IS NOT NULL;
