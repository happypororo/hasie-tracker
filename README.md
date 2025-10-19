# W컨셉 하시에 순위 추적 시스템

W컨셉(wconcept.co.kr)에서 '하시에' 브랜드의 카테고리별 순위를 실시간으로 추적하고 이력을 관리하는 웹 애플리케이션입니다.

## 🎯 주요 기능

### ✅ 완료된 기능
1. **카테고리 관리**
   - 13개 기본 카테고리 사전 등록 (아우터, 원피스, 블라우스 등)
   - 카테고리 추가/수정/삭제 UI
   - 카테고리별 활성화/비활성화 토글

2. **수동 크롤링**
   - 개별 카테고리 크롤링 버튼
   - 전체 카테고리 일괄 크롤링
   - 실시간 순위 확인

3. **순위 이력 관리**
   - Cloudflare D1 데이터베이스에 순위 이력 저장
   - 카테고리별 순위 변동 추이 차트 (Chart.js)
   - 하시에 브랜드 최신 순위 대시보드

4. **크롤링 로그**
   - 크롤링 성공/실패 이력 추적
   - 에러 메시지 상세 표시

### 🔧 구현 중 기능
5. **주기적 자동 크롤링**
   - Cloudflare Cron Triggers 사용 예정
   - 사용자 정의 시간 간격 설정

6. **알림 시스템**
   - 이메일 알림 (Resend API)
   - 텔레그램 봇 알림
   - 순위 변동 알림 규칙 설정

## 🚀 배포 URL

- **개발 서버**: https://3000-i1xyioj8hpgtq5ei2pf6u-2e77fc33.sandbox.novita.ai
- **프로덕션**: (Cloudflare Pages 배포 후 업데이트 예정)

## 📊 데이터 구조

### Categories (카테고리)
```sql
- id: 카테고리 ID
- name: 카테고리 이름
- url: W컨셉 URL
- active: 활성 상태 (1=활성, 0=비활성)
- created_at, updated_at: 타임스탬프
```

### Rankings (순위 이력)
```sql
- id: 순위 기록 ID
- category_id: 카테고리 ID (FK)
- brand_name: 브랜드 이름
- rank_position: 순위
- crawled_at: 크롤링 시간
```

### Crawl Logs (크롤링 로그)
```sql
- id: 로그 ID
- category_id: 카테고리 ID (FK)
- status: 상태 (success/failed)
- error_message: 에러 메시지
- crawled_at: 크롤링 시간
```

## 🔄 크롤링 방식

### 현재 지원하는 방식
1. **Cloudflare Browser Rendering API** (우선)
   - Puppeteer 호환 API
   - Cloudflare Workers 네이티브 지원

2. **N8N 웹훅 연동** (권장)
   - N8N에서 Playwright 워크플로우 실행
   - 웹훅으로 크롤링 결과 반환
   - 환경변수: `N8N_WEBHOOK_URL`

3. **ScrapingBee** (무료 티어: 1000 requests/month)
   - 클라우드 브라우저 자동화 서비스
   - 환경변수: `SCRAPINGBEE_API_KEY`

4. **Browserless.io** (제한적 무료 티어)
   - Puppeteer/Playwright 클라우드 실행
   - 환경변수: `BROWSERLESS_API_KEY`

5. **Fallback (HTTP + 정규식)**
   - 단순 HTTP 요청으로 HTML 파싱
   - 동적 렌더링 페이지에서는 제한적

### N8N 웹훅 워크플로우 설정

```
1. Webhook Trigger (POST)
   - Method: POST
   - Path: /webhook/wconcept-scraper

2. Code Node (Playwright 크롤링)
   ```javascript
   const puppeteer = require('puppeteer');
   
   const url = $json.body.url;
   const browser = await puppeteer.launch();
   const page = await browser.newPage();
   
   await page.goto(url, { waitUntil: 'networkidle0' });
   await page.waitForTimeout(5000);
   
   const brands = await page.evaluate(() => {
     const items = Array.from(document.querySelectorAll('.brand-item, .product-item'));
     return items.map((item, index) => ({
       rank: index + 1,
       name: item.textContent.trim().split('\n')[0],
       link: item.querySelector('a')?.href || ''
     }));
   });
   
   await browser.close();
   return { brands };
   ```

3. Respond to Webhook
   - Status Code: 200
   - Body: {{ $json }}
```

## 🛠️ 기술 스택

- **Backend**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **Charts**: Chart.js
- **Deployment**: Cloudflare Pages

## 📦 로컬 개발 환경

### 필수 요구사항
- Node.js 18+
- npm 또는 pnpm

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 로컬 D1 데이터베이스 마이그레이션
npm run db:migrate:local

# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox
```

### 환경 변수 설정 (.dev.vars)
```bash
# 크롤링 설정 (선택사항)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/wconcept
SCRAPINGBEE_API_KEY=your-api-key
BROWSERLESS_API_KEY=your-api-key

# 알림 설정 (선택사항)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_TO=your-email@example.com
```

## 🚀 Cloudflare Pages 배포

### 1. Cloudflare API 설정
```bash
# setup_cloudflare_api_key 도구 실행 또는
# Deploy 탭에서 API 키 설정
```

### 2. D1 데이터베이스 생성
```bash
npx wrangler d1 create webapp-production
# database_id를 wrangler.jsonc에 복사
```

### 3. 마이그레이션 실행
```bash
npm run db:migrate:prod
```

### 4. Pages 프로젝트 생성 및 배포
```bash
npm run build
npx wrangler pages project create webapp --production-branch main
npx wrangler pages deploy dist --project-name webapp
```

### 5. 환경 변수 설정
```bash
# 크롤링 API 키
npx wrangler pages secret put N8N_WEBHOOK_URL --project-name webapp
npx wrangler pages secret put SCRAPINGBEE_API_KEY --project-name webapp

# 알림 설정
npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name webapp
npx wrangler pages secret put TELEGRAM_CHAT_ID --project-name webapp
```

## 📈 사용 가이드

### 1. 카테고리 관리
- 우측 상단 "카테고리 추가" 버튼으로 새 카테고리 추가
- 카테고리별 활성화/비활성화 토글
- 삭제 버튼으로 불필요한 카테고리 제거

### 2. 크롤링 실행
- 개별 카테고리: 각 카테고리 행의 새로고침 아이콘 클릭
- 전체 크롤링: 상단 "전체 크롤링" 버튼 클릭
- 크롤링 완료 후 "하시에 최신 순위" 섹션에서 결과 확인

### 3. 순위 차트 확인
- "순위 변동 추이" 섹션에서 카테고리 선택
- Chart.js로 시간에 따른 순위 변동 시각화
- 순위가 낮을수록 위쪽에 표시 (역순)

### 4. 로그 확인
- "크롤링 로그" 섹션에서 성공/실패 이력 확인
- 에러 발생 시 상세 메시지 표시

## ⚠️ 알려진 이슈 및 제한사항

1. **W컨셉 봇 차단**
   - W컨셉은 자동화 접근을 차단할 수 있습니다
   - 권장: N8N 또는 ScrapingBee 같은 프록시 서비스 사용
   - Cloudflare Browser Rendering API는 제한적일 수 있음

2. **크롤링 성공률**
   - 페이지 구조 변경 시 크롤링 실패 가능
   - 브랜드명 매칭 로직 개선 필요
   - 동적 렌더링 지연으로 인한 데이터 누락 가능

3. **무료 티어 제한**
   - ScrapingBee: 1000 requests/month
   - Browserless: 제한적 무료 사용
   - Cloudflare D1: 5GB 스토리지, 500만 rows/day read

## 🔮 향후 개선 계획

1. **주기적 크롤링 스케줄러**
   - Cloudflare Cron Triggers 구현
   - 사용자 정의 시간 간격 설정 UI

2. **알림 시스템**
   - 순위 변동 알림 (텔레그램/이메일)
   - 알림 규칙 설정 (Top 10 진입, 순위 상승/하락)

3. **크롤링 개선**
   - W컨셉 API 직접 호출 (가능한 경우)
   - 더 정확한 브랜드명 매칭
   - 이미지, 가격 등 추가 데이터 수집

4. **분석 기능**
   - 카테고리별 순위 비교
   - 경쟁 브랜드 추적
   - 순위 예측 (머신러닝)

## 📝 개발 노트

- **프로젝트 시작**: 2025-10-19
- **최종 업데이트**: 2025-10-19
- **개발 상태**: 🟡 활발한 개발 중

## 🤝 기여

이슈나 개선 사항이 있으면 GitHub Issues에 등록해주세요.

## 📄 라이선스

MIT License
