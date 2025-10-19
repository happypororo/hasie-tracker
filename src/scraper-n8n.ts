import type { BrandRanking } from './types';

/**
 * N8N 웹훅을 통한 크롤링
 * 
 * N8N 워크플로우 설정:
 * 1. Webhook Trigger (POST)
 * 2. Set Node - URL 파라미터 추출
 * 3. Puppeteer Node - 페이지 크롤링
 * 4. Function Node - 데이터 정리
 * 5. Respond to Webhook - 결과 반환
 */
export async function scrapeViaN8N(
  url: string,
  n8nWebhookUrl: string
): Promise<BrandRanking[]> {
  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        selector: '.brand-list, .product-list, [class*="BrandList"]',
        waitTime: 5000,
      }),
    });

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status}`);
    }

    const result = await response.json();
    
    // N8N이 반환하는 브랜드 배열
    if (Array.isArray(result.brands)) {
      return result.brands;
    }

    throw new Error('Invalid response format from N8N');
  } catch (error) {
    console.error('N8N scraping failed:', error);
    throw error;
  }
}

/**
 * ScrapingBee를 통한 크롤링 (무료 티어: 1000 requests/month)
 * https://www.scrapingbee.com/
 */
export async function scrapeViaScrapingBee(
  url: string,
  apiKey: string
): Promise<BrandRanking[]> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: 'true',
      wait: '5000',
      premium_proxy: 'false',
    });

    const response = await fetch(
      `https://app.scrapingbee.com/api/v1/?${params}`
    );

    if (!response.ok) {
      throw new Error(`ScrapingBee error: ${response.status}`);
    }

    const html = await response.text();
    return parseHtmlForBrands(html);
  } catch (error) {
    console.error('ScrapingBee scraping failed:', error);
    throw error;
  }
}

/**
 * Browserless.io를 통한 크롤링 (무료 티어 제한적)
 * https://www.browserless.io/
 */
export async function scrapeViaBrowserless(
  url: string,
  apiKey: string
): Promise<BrandRanking[]> {
  try {
    const response = await fetch(`https://chrome.browserless.io/content?token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        waitFor: 5000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Browserless error: ${response.status}`);
    }

    const html = await response.text();
    return parseHtmlForBrands(html);
  } catch (error) {
    console.error('Browserless scraping failed:', error);
    throw error;
  }
}

/**
 * HTML에서 브랜드 정보 추출
 */
function parseHtmlForBrands(html: string): BrandRanking[] {
  const brands: BrandRanking[] = [];

  // 방법 1: JSON 데이터 추출 시도
  const jsonPattern = /"brands?"\s*:\s*\[(.*?)\]/gs;
  const jsonMatches = html.match(jsonPattern);
  
  if (jsonMatches) {
    try {
      for (const match of jsonMatches) {
        const json = JSON.parse(`{${match}}`);
        if (json.brands && Array.isArray(json.brands)) {
          json.brands.forEach((brand: any, index: number) => {
            brands.push({
              rank: index + 1,
              name: brand.name || brand.brandName || brand.brand,
              link: brand.link || brand.url,
            });
          });
          break;
        }
      }
    } catch (e) {
      // JSON 파싱 실패, 다음 방법 시도
    }
  }

  // 방법 2: Next.js __NEXT_DATA__ 추출
  if (brands.length === 0) {
    const nextDataPattern = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;
    const nextDataMatch = html.match(nextDataPattern);
    
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        // Next.js 데이터 구조에서 브랜드 찾기
        const findBrands = (obj: any): any[] => {
          if (Array.isArray(obj)) {
            return obj;
          }
          if (obj && typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
              if (key.includes('brand') || key.includes('product')) {
                const result = findBrands(obj[key]);
                if (result.length > 0) return result;
              }
            }
          }
          return [];
        };

        const brandData = findBrands(nextData);
        brandData.forEach((brand: any, index: number) => {
          if (brand.name || brand.brandName) {
            brands.push({
              rank: index + 1,
              name: brand.name || brand.brandName,
              link: brand.link || brand.url,
            });
          }
        });
      } catch (e) {
        // JSON 파싱 실패
      }
    }
  }

  // 방법 3: HTML 태그에서 직접 추출
  if (brands.length === 0) {
    const brandPatterns = [
      /<a[^>]*href="[^"]*brand[^"]*"[^>]*>([^<]+)<\/a>/gi,
      /<div[^>]*class="[^"]*brand-name[^"]*"[^>]*>([^<]+)<\/div>/gi,
      /data-brand-name="([^"]+)"/gi,
      /"brandName":"([^"]+)"/gi,
    ];

    for (const pattern of brandPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach((match, index) => {
          const name = match[1].trim();
          if (name && !brands.find(b => b.name === name)) {
            brands.push({
              rank: brands.length + 1,
              name: name,
            });
          }
        });
        if (brands.length > 0) break;
      }
    }
  }

  return brands;
}

/**
 * 여러 방법을 순서대로 시도하는 통합 크롤러
 */
export async function scrapeWithFallback(
  url: string,
  config: {
    n8nWebhookUrl?: string;
    scrapingBeeApiKey?: string;
    browserlessApiKey?: string;
  }
): Promise<BrandRanking[]> {
  const errors: string[] = [];

  // 1. N8N 웹훅 시도
  if (config.n8nWebhookUrl) {
    try {
      console.log('Trying N8N webhook...');
      return await scrapeViaN8N(url, config.n8nWebhookUrl);
    } catch (error) {
      errors.push(`N8N: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 2. ScrapingBee 시도
  if (config.scrapingBeeApiKey) {
    try {
      console.log('Trying ScrapingBee...');
      return await scrapeViaScrapingBee(url, config.scrapingBeeApiKey);
    } catch (error) {
      errors.push(`ScrapingBee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 3. Browserless 시도
  if (config.browserlessApiKey) {
    try {
      console.log('Trying Browserless...');
      return await scrapeViaBrowserless(url, config.browserlessApiKey);
    } catch (error) {
      errors.push(`Browserless: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 모든 방법 실패
  throw new Error(`All scraping methods failed:\n${errors.join('\n')}`);
}
