import type { Env, BrandRanking } from './types';
import { scrapeWithFallback } from './scraper-n8n';
import { getScraperConfig } from './config';

/**
 * W컨셉 크롤링 - 통합 진입점
 */
export async function scrapeWconcept(url: string, env: Env): Promise<BrandRanking[]> {
  // 설정 로드
  const config = await getScraperConfig(env);

  // 설정된 API 키가 있으면 우선 사용
  if (config.n8nWebhookUrl || config.scrapingBeeApiKey || config.browserlessApiKey) {
    try {
      return await scrapeWithFallback(url, config);
    } catch (error) {
      console.error('External scraping failed, trying browser API:', error);
    }
  }

  // Cloudflare Browser Rendering API 시도
  return await scrapeWithBrowser(url, env);
}

/**
 * Cloudflare Browser Rendering API를 사용한 W컨셉 크롤링
 * https://developers.cloudflare.com/browser-rendering/
 */
async function scrapeWithBrowser(url: string, env: Env): Promise<BrandRanking[]> {
  // Browser Rendering API 사용 가능 여부 확인
  if (!env.BROWSER) {
    console.log('Browser Rendering API not available, using fallback method');
    return await scrapeFallback(url);
  }

  try {
    // Puppeteer 호환 스크립트
    const script = `
      const puppeteer = require('puppeteer');
      
      module.exports = async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // User-Agent 설정
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 페이지 로드
        await page.goto('${url}', {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
        
        // 브랜드 리스트 대기 (여러 선택자 시도)
        await page.waitForSelector('.brand-list, .product-list, [class*="BrandList"], [class*="ProductList"]', {
          timeout: 10000
        }).catch(() => {});
        
        // 추가 대기 (동적 컨텐츠 로딩)
        await page.waitForTimeout(3000);
        
        // 브랜드 정보 추출
        const brands = await page.evaluate(() => {
          const results = [];
          
          // 가능한 선택자들
          const selectors = [
            '.brand-item',
            '.product-item',
            '[class*="BrandItem"]',
            '[class*="ProductItem"]',
            '[class*="brand-"]',
            'a[href*="/brand/"]',
            '.brand-list > div',
            '.product-list > div'
          ];
          
          let items = [];
          for (const selector of selectors) {
            items = Array.from(document.querySelectorAll(selector));
            if (items.length > 0) break;
          }
          
          items.forEach((item, index) => {
            // 브랜드명 추출 시도
            let name = '';
            const nameSelectors = [
              '.brand-name',
              '.product-brand',
              '[class*="BrandName"]',
              '[class*="brand"]',
              'a',
              'span',
              'div'
            ];
            
            for (const sel of nameSelectors) {
              const el = item.querySelector(sel);
              if (el && el.textContent.trim()) {
                name = el.textContent.trim();
                break;
              }
            }
            
            if (!name) {
              name = item.textContent.trim().split('\\n')[0];
            }
            
            // 링크 추출
            const linkEl = item.querySelector('a');
            const link = linkEl ? linkEl.href : '';
            
            if (name) {
              results.push({
                rank: index + 1,
                name: name,
                link: link
              });
            }
          });
          
          return results;
        });
        
        await browser.close();
        return brands;
      };
    `;

    // Browser Rendering API 호출
    const response = await env.BROWSER.fetch('https://example.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ script }),
    });

    if (!response.ok) {
      throw new Error(`Browser API error: ${response.status}`);
    }

    const result = await response.json();
    return result as BrandRanking[];
  } catch (error) {
    console.error('Browser Rendering API failed:', error);
    return await scrapeFallback(url);
  }
}

/**
 * 대체 방법: HTTP 요청으로 HTML 파싱 시도
 */
async function scrapeFallback(url: string): Promise<BrandRanking[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    
    // 간단한 HTML 파싱 (정규식 사용)
    // 주의: 이 방법은 제한적이며 실제 브라우저 렌더링이 필요할 수 있음
    const brands: BrandRanking[] = [];
    
    // 브랜드명 패턴 찾기 (예시)
    const brandPatterns = [
      /brand["-]name[^>]*>([^<]+)</gi,
      /data-brand[^>]*>([^<]+)</gi,
      /"brandName":"([^"]+)"/gi,
      /"brand":"([^"]+)"/gi,
    ];

    for (const pattern of brandPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach((match, index) => {
          brands.push({
            rank: index + 1,
            name: match[1].trim(),
          });
        });
        break;
      }
    }

    // 데이터를 찾지 못한 경우
    if (brands.length === 0) {
      console.warn('No brands found in HTML, page may require JavaScript rendering');
    }

    return brands;
  } catch (error) {
    console.error('Fallback scraping failed:', error);
    throw error;
  }
}

/**
 * '하시에' 브랜드 순위 찾기
 */
export function findHasieRank(brands: BrandRanking[]): number | null {
  const hasie = brands.find(b => 
    b.name.includes('하시에') || 
    b.name.toLowerCase().includes('hasie') ||
    b.name.toLowerCase().includes('hachier')
  );
  return hasie ? hasie.rank : null;
}
