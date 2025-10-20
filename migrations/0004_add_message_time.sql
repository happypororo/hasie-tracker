-- 텔레그램 메시지 시간 추가

-- telegram_messages에 message_date 컬럼 추가 (텔레그램 메시지의 실제 전송 시간)
ALTER TABLE telegram_messages ADD COLUMN message_date DATETIME;

-- 기존 데이터는 created_at으로 채우기
UPDATE telegram_messages SET message_date = created_at WHERE message_date IS NULL;

-- hasie_rankings에 message_date 컬럼 추가
ALTER TABLE hasie_rankings ADD COLUMN message_date DATETIME;

-- 기존 데이터는 created_at으로 채우기
UPDATE hasie_rankings SET message_date = created_at WHERE message_date IS NULL;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_telegram_messages_date ON telegram_messages(message_date DESC);
CREATE INDEX IF NOT EXISTS idx_hasie_rankings_message_date ON hasie_rankings(message_date DESC);
