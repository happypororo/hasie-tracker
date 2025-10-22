-- 업데이트 세션 추적을 위한 컬럼 추가
-- [시작] ~ [끝] 메시지 사이의 모든 업데이트를 하나의 세션으로 묶음

ALTER TABLE hasie_rankings ADD COLUMN update_session_id TEXT;

-- 업데이트 세션 정보 테이블
CREATE TABLE IF NOT EXISTS update_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  started_at DATETIME,
  completed_at DATETIME,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
  message_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hasie_rankings_session ON hasie_rankings(update_session_id);
CREATE INDEX IF NOT EXISTS idx_update_sessions_status ON update_sessions(status, started_at DESC);
