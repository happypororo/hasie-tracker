-- W컨셉 순위 추적 시스템 초기 스키마

-- 모니터링할 URL 목록
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 순위 이력
CREATE TABLE IF NOT EXISTS rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  brand_name TEXT NOT NULL,
  rank_position INTEGER NOT NULL,
  crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 크롤링 로그
CREATE TABLE IF NOT EXISTS crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  status TEXT NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 알림 설정
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'email', 'telegram'
  enabled INTEGER DEFAULT 1,
  config TEXT NOT NULL, -- JSON: {"email": "...", "telegram_chat_id": "..."}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 알림 규칙
CREATE TABLE IF NOT EXISTS notification_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT NOT NULL DEFAULT '하시에',
  condition_type TEXT NOT NULL, -- 'rank_change', 'top_n', 'rank_drop'
  condition_value INTEGER, -- 예: top 10 진입
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 스케줄 설정
CREATE TABLE IF NOT EXISTS schedule_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  enabled INTEGER DEFAULT 0,
  last_run DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_rankings_category_crawled ON rankings(category_id, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_brand ON rankings(brand_name, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_category ON crawl_logs(category_id, crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);

-- 초기 카테고리 데이터 삽입
INSERT INTO categories (name, url) VALUES
  ('아우터', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101201&gnbType=Y'),
  ('원피스', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101202&gnbType=Y'),
  ('블라우스', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101203&gnbType=Y'),
  ('셔츠', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101204&gnbType=Y'),
  ('티셔츠', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101205&gnbType=Y'),
  ('니트', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101206&gnbType=Y'),
  ('스커트', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101207&gnbType=Y'),
  ('언더웨어', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10101&displaySubCategoryType=10101212&gnbType=Y'),
  ('가방(전체)', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10102&displaySubCategoryType=ALL&gnbType=Y'),
  ('가방 숄더백', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10102&displaySubCategoryType=10102201&gnbType=Y'),
  ('가방 기타가방', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10102&displaySubCategoryType=10102209&gnbType=Y'),
  ('악세사리(전체)', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10104&displaySubCategoryType=ALL&gnbType=Y'),
  ('악세사리(쥬얼리)', 'https://display.wconcept.co.kr/rn/best?displayCategoryType=10104&displaySubCategoryType=10104201&gnbType=Y');

-- 기본 스케줄 설정
INSERT INTO schedule_settings (interval_minutes, enabled) VALUES (60, 0);
