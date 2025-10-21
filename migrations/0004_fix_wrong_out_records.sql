-- 같은 세션에 정상 기록이 있는 잘못된 OUT 레코드 삭제
-- 문제: [끝] 메시지 처리 시 같은 세션에 이미 정상 기록된 제품을 OUT으로 표시
-- 해결: 같은 세션에 out_rank=0 레코드가 있으면 out_rank=1 레코드 삭제

DELETE FROM hasie_rankings
WHERE id IN (
  SELECT r1.id
  FROM hasie_rankings r1
  WHERE r1.out_rank = 1
    AND r1.update_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM hasie_rankings r2
      WHERE r2.product_link = r1.product_link
        AND r2.update_session_id = r1.update_session_id
        AND r2.out_rank = 0
    )
);
