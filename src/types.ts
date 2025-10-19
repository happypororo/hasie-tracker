// Cloudflare 환경 타입
export type Env = {
  DB: D1Database;
  BROWSER?: Fetcher;
  
  // 크롤링 설정
  N8N_WEBHOOK_URL?: string;
  SCRAPINGBEE_API_KEY?: string;
  BROWSERLESS_API_KEY?: string;
  
  // 알림 설정
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;
};

// 카테고리
export type Category = {
  id: number;
  name: string;
  url: string;
  active: number;
  created_at: string;
  updated_at: string;
};

// 순위 기록
export type Ranking = {
  id: number;
  category_id: number;
  brand_name: string;
  rank_position: number;
  crawled_at: string;
};

// 크롤링 로그
export type CrawlLog = {
  id: number;
  category_id: number | null;
  status: 'success' | 'failed';
  error_message: string | null;
  crawled_at: string;
};

// 알림 설정
export type NotificationSetting = {
  id: number;
  type: 'email' | 'telegram';
  enabled: number;
  config: string;
  created_at: string;
  updated_at: string;
};

// 알림 규칙
export type NotificationRule = {
  id: number;
  brand_name: string;
  condition_type: 'rank_change' | 'top_n' | 'rank_drop';
  condition_value: number | null;
  enabled: number;
  created_at: string;
};

// 스케줄 설정
export type ScheduleSetting = {
  id: number;
  interval_minutes: number;
  enabled: number;
  last_run: string | null;
  created_at: string;
  updated_at: string;
};

// API 응답 타입
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// 크롤링 결과
export type CrawlResult = {
  category_id: number;
  category_name: string;
  url: string;
  brands: BrandRanking[];
  hasie_rank: number | null;
  crawled_at: string;
};

// 브랜드 순위
export type BrandRanking = {
  rank: number;
  name: string;
  link?: string;
};
