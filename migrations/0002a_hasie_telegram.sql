-- 하시에 텔레그램 순위 트래킹 시스템

-- 하시에 상품 순위 이력
CREATE TABLE IF NOT EXISTS hasie_rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,          -- 카테고리 (예: "아우터", "셔츠", "스커트")
  rank INTEGER NOT NULL,            -- 순위
  product_name TEXT NOT NULL,       -- 상품명
  product_link TEXT NOT NULL,       -- 상품 링크
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 텔레그램 메시지 로그
CREATE TABLE IF NOT EXISTS telegram_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER UNIQUE,        -- 텔레그램 메시지 ID
  message_text TEXT,                -- 원본 메시지 텍스트
  parsed_count INTEGER DEFAULT 0,   -- 파싱된 순위 개수
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_hasie_rankings_category ON hasie_rankings(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hasie_rankings_rank ON hasie_rankings(rank, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hasie_rankings_created ON hasie_rankings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_message_id ON telegram_messages(message_id);
