import type { Env } from './types';

/**
 * 크롤링 설정 관리
 */

export type ScraperConfig = {
  n8nWebhookUrl?: string;
  scrapingBeeApiKey?: string;
  browserlessApiKey?: string;
  method: 'n8n' | 'scrapingbee' | 'browserless' | 'browser' | 'fallback';
};

const DEFAULT_CONFIG: ScraperConfig = {
  method: 'fallback',
};

/**
 * 환경 변수 또는 KV에서 설정 로드
 */
export async function getScraperConfig(env: Env): Promise<ScraperConfig> {
  // Cloudflare Workers 환경 변수 확인
  const config: ScraperConfig = { ...DEFAULT_CONFIG };

  // N8N 웹훅 URL (환경 변수에서)
  if (env.N8N_WEBHOOK_URL) {
    config.n8nWebhookUrl = env.N8N_WEBHOOK_URL as string;
  }

  // ScrapingBee API 키
  if (env.SCRAPINGBEE_API_KEY) {
    config.scrapingBeeApiKey = env.SCRAPINGBEE_API_KEY as string;
  }

  // Browserless API 키
  if (env.BROWSERLESS_API_KEY) {
    config.browserlessApiKey = env.BROWSERLESS_API_KEY as string;
  }

  // 기본 메서드 결정
  if (config.n8nWebhookUrl) {
    config.method = 'n8n';
  } else if (config.scrapingBeeApiKey) {
    config.method = 'scrapingbee';
  } else if (config.browserlessApiKey) {
    config.method = 'browserless';
  } else if (env.BROWSER) {
    config.method = 'browser';
  }

  return config;
}

/**
 * 텔레그램 설정
 */
export type TelegramConfig = {
  botToken?: string;
  chatId?: string;
  enabled: boolean;
};

export async function getTelegramConfig(env: Env): Promise<TelegramConfig> {
  return {
    botToken: env.TELEGRAM_BOT_TOKEN as string | undefined,
    chatId: env.TELEGRAM_CHAT_ID as string | undefined,
    enabled: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
  };
}

/**
 * 이메일 설정 (Resend)
 */
export type EmailConfig = {
  apiKey?: string;
  from?: string;
  to?: string;
  enabled: boolean;
};

export async function getEmailConfig(env: Env): Promise<EmailConfig> {
  return {
    apiKey: env.RESEND_API_KEY as string | undefined,
    from: (env.EMAIL_FROM as string) || 'noreply@example.com',
    to: env.EMAIL_TO as string | undefined,
    enabled: !!(env.RESEND_API_KEY && env.EMAIL_TO),
  };
}
