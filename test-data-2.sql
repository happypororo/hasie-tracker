-- 순위 변동 테스트 데이터 (며칠 후 순위가 변한 경우)

-- 스커트 1위 제품의 순위 변화 (1위 -> 3위로 하락)
INSERT INTO hasie_rankings (category, rank, product_name, product_link, created_at) VALUES
('스커트', 3, '(10차 리오더) VINTAGE SILK LIKE CODUROY LONG SKIRT [BROWN][BLACK]', 
 'https://m.wconcept.co.kr/Product/306105637',
 datetime('now', '+1 hour'));

-- 셔츠 4위 제품의 순위 변화 (4위 -> 2위로 상승)
INSERT INTO hasie_rankings (category, rank, product_name, product_link, created_at) VALUES
('셔츠', 2, '(3차 리오더) BLUE STRIPE COTTON SHIRT [BLUE]', 
 'https://m.wconcept.co.kr/Product/306668472',
 datetime('now', '+1 hour'));

-- 아우터 9위 제품의 순위 유지 (9위 -> 9위)
INSERT INTO hasie_rankings (category, rank, product_name, product_link, created_at) VALUES
('아우터', 9, '(5차 리오더) CASHMERE COLLAR LIGHT DOWN JACKET [IVORY][BLACK]', 
 'https://m.wconcept.co.kr/Product/303596201',
 datetime('now', '+1 hour'));

-- 아우터 98위 제품의 순위 변화 (98위 -> 75위로 상승)
INSERT INTO hasie_rankings (category, rank, product_name, product_link, created_at) VALUES
('아우터', 75, 'EMBROIDERY PADDING JACKET [3COLORS]', 
 'https://m.wconcept.co.kr/Product/303596164',
 datetime('now', '+1 hour'));

-- 새로운 제품 추가 (처음 등장)
INSERT INTO hasie_rankings (category, rank, product_name, product_link, created_at) VALUES
('원피스', 5, '[NEW] ELEGANT LONG DRESS [BLACK]', 
 'https://m.wconcept.co.kr/Product/999999999',
 datetime('now', '+1 hour'));
