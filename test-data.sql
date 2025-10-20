-- 테스트 데이터 삽입

-- 텔레그램 메시지 로그
INSERT INTO telegram_messages (message_id, message_text, parsed_count) VALUES
(1001, 'W컨셉 베스트 아우터 테스트 메시지', 4);

-- 하시에 순위 데이터
INSERT INTO hasie_rankings (category, rank, product_name, product_link) VALUES
-- 아우터
('아우터', 9, '(5차 리오더) CASHMERE COLLAR LIGHT DOWN JACKET [IVORY][BLACK]', 'https://m.wconcept.co.kr/Product/303596201'),
('아우터', 98, 'EMBROIDERY PADDING JACKET [3COLORS]', 'https://m.wconcept.co.kr/Product/303596164'),
('아우터', 120, '[HACIE X ITALY] CLASSIC COTTON OVERSIZE TRENCH COAT [3COLORS]', 'https://m.wconcept.co.kr/Product/305707754'),
('아우터', 198, 'FAUX LEATHER DETAIL QUILTED JACKET [BLACK]', 'https://m.wconcept.co.kr/Product/306105650'),

-- 셔츠
('셔츠', 4, '(3차 리오더) BLUE STRIPE COTTON SHIRT [BLUE]', 'https://m.wconcept.co.kr/Product/306668472'),
('셔츠', 59, 'TULIP WIRE HEM LINE SHIRT [WHITE][BUTTER YELLOW]', 'https://m.wconcept.co.kr/Product/306918734'),
('셔츠', 155, '[채랑 PICK] OVERSIZE STANDARD STRIPE SHIRT [IVORY][PINK]', 'https://m.wconcept.co.kr/Product/307414592'),

-- 티셔츠
('티셔츠', 131, '[채랑 PICK] STRING DETAIL OVERSIZE MULTI STRIPE T-SHIRT [IVORY][NAVY]', 'https://m.wconcept.co.kr/Product/307414599'),
('티셔츠', 151, '[채랑 PICK] COLOR BLOCK RINGER TOP [3COLORS]', 'https://m.wconcept.co.kr/Product/306105578'),

-- 니트
('니트', 92, 'WOOL BLENDED LAYERED KNIT TOP (SET) [3COLORS]', 'https://m.wconcept.co.kr/Product/306105620'),

-- 스커트
('스커트', 1, '(10차 리오더) VINTAGE SILK LIKE CODUROY LONG SKIRT [BROWN][BLACK]', 'https://m.wconcept.co.kr/Product/306105637'),
('스커트', 13, '[채랑 PICK] (CHOCOLATE/S - 11/18 재입고) NEW CLASSIC SUEDE LONG SKIRT [BROWN][CHOCOLATE]', 'https://m.wconcept.co.kr/Product/307414600');
