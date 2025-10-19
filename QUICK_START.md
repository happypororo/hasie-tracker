# 빠른 시작 가이드

## 🚨 중요: 크롤링이 작동하지 않는 이유

현재 **W컨셉은 봇 차단**을 사용하여 일반적인 크롤링 방식으로는 데이터를 가져올 수 없습니다.

### 현재 상황
```
✅ 웹 인터페이스: 정상 작동
✅ 데이터베이스: 정상 작동
✅ API 엔드포인트: 정상 작동
❌ 크롤링: 데이터 없음 (W컨셉 봇 차단)
```

## 🔧 해결 방법 3가지

### 방법 1: N8N 웹훅 연동 ⭐ 권장

가장 안정적이고 무료인 방법입니다.

**1단계: N8N 설치**
```bash
# Docker로 N8N 실행
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**2단계: 워크플로우 생성**

http://localhost:5678 접속 후:

1. 새 워크플로우 생성
2. **Webhook** 노드 추가
   - Method: POST
   - Path: /webhook/wconcept-scraper

3. **Code** 노드 추가 (아래 코드 복사)

```javascript
const puppeteer = require('puppeteer');

const url = $input.item.json.body.url;

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox']
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForTimeout(5000);

const brands = await page.evaluate(() => {
  // 브랜드 아이템 선택자 (여러 가능성 시도)
  const selectors = [
    '.brand-item',
    '.product-item', 
    '[class*="BrandItem"]',
    '[class*="brand-list"] > div',
    'a[href*="/brand/"]'
  ];
  
  let items = [];
  for (const sel of selectors) {
    items = Array.from(document.querySelectorAll(sel));
    if (items.length > 0) break;
  }
  
  return items.slice(0, 100).map((item, index) => {
    let name = '';
    const nameEl = item.querySelector('.brand-name, [class*="brand"]');
    if (nameEl) {
      name = nameEl.textContent.trim();
    } else {
      name = item.textContent.trim().split('\n')[0];
    }
    
    return {
      rank: index + 1,
      name: name,
      link: item.querySelector('a')?.href || ''
    };
  }).filter(b => b.name.length > 0 && b.name.length < 100);
});

await browser.close();

return { brands };
```

4. **Respond to Webhook** 노드 추가
   - Response Body: `{{ $json }}`

5. 워크플로우 **활성화** (우측 상단 토글)

6. Production Webhook URL 복사

**3단계: 환경 변수 설정**

프로젝트 루트에 `.dev.vars` 파일 생성:
```bash
N8N_WEBHOOK_URL=https://your-n8n-url.com/webhook/wconcept-scraper
```

**4단계: 서버 재시작**
```bash
cd /home/user/webapp
pm2 restart webapp
```

**5단계: 테스트**
- 웹 인터페이스에서 "전체 크롤링" 클릭
- N8N이 자동으로 호출되어 크롤링 수행
- 약 1-2분 후 순위 확인

---

### 방법 2: ScrapingBee (무료 1000/월)

**1단계: 가입**
- https://www.scrapingbee.com 방문
- 무료 계정 생성
- API 키 복사

**2단계: 환경 변수 설정**
```bash
# .dev.vars
SCRAPINGBEE_API_KEY=your-api-key-here
```

**3단계: 재시작 및 테스트**
```bash
pm2 restart webapp
```

**제한사항**: 
- 무료 티어: 1000 requests/month
- 13개 카테고리 × 일 4회 = 52 requests/day
- 약 19일 사용 가능

---

### 방법 3: Browserless (제한적)

**1단계: 가입**
- https://www.browserless.io 방문
- 무료 계정 (매우 제한적)

**2단계: 설정**
```bash
# .dev.vars
BROWSERLESS_API_KEY=your-api-key
```

**제한사항**: 무료 티어가 매우 제한적

---

## ✅ 설정 완료 후 사용법

### 1. 첫 크롤링
1. 웹 인터페이스 접속: https://3000-i1xyioj8hpgtq5ei2pf6u-2e77fc33.sandbox.novita.ai
2. "전체 크롤링" 버튼 클릭
3. 1-2분 대기 (13개 카테고리 처리)
4. "하시에 최신 순위" 섹션에서 결과 확인

### 2. 순위 차트 보기
1. "순위 변동 추이" 섹션으로 이동
2. 드롭다운에서 카테고리 선택
3. Chart.js 차트로 시간별 순위 확인

### 3. 개별 크롤링
- 카테고리 관리 섹션에서 각 카테고리 옆 🔄 아이콘 클릭

---

## 🧪 현재 상태 테스트

### API 테스트
```bash
# 카테고리 목록
curl http://localhost:3000/api/categories | jq '.data | length'
# 결과: 13

# 개별 크롤링 (아우터)
curl -X POST http://localhost:3000/api/crawl/1 | jq '.data.brands | length'
# N8N 없이: 0
# N8N 있으면: 50-100
```

---

## 📊 데이터베이스 직접 확인

```bash
# 카테고리 확인
cd /home/user/webapp
npx wrangler d1 execute webapp-production --local \
  --command="SELECT * FROM categories LIMIT 3"

# 순위 이력 확인
npx wrangler d1 execute webapp-production --local \
  --command="SELECT * FROM rankings WHERE brand_name LIKE '%하시에%' LIMIT 10"

# 크롤링 로그
npx wrangler d1 execute webapp-production --local \
  --command="SELECT * FROM crawl_logs ORDER BY crawled_at DESC LIMIT 5"
```

---

## ❓ 자주 묻는 질문

### Q: 크롤링 버튼을 눌렀는데 데이터가 없어요
**A**: W컨셉 봇 차단 때문입니다. 위 방법 1-3 중 하나를 설정하세요.

### Q: N8N 설치가 어려워요
**A**: ScrapingBee 무료 티어(방법 2)를 사용하세요. 가장 간단합니다.

### Q: 순위가 표시되지 않아요
**A**: 
1. 먼저 크롤링을 실행했는지 확인
2. 해당 카테고리에서 하시에가 실제로 순위권에 있는지 W컨셉에서 확인
3. 브랜드명이 "하시에", "HACHIER", "HASIE" 중 어떤 것인지 확인

### Q: 차트가 비어있어요
**A**: 
1. 드롭다운에서 카테고리 선택 필요
2. 해당 카테고리에 크롤링 이력 필요
3. 최소 2회 이상 크롤링 필요 (추이 확인용)

---

## 🎯 다음 단계

### 설정 완료 후
1. ✅ 크롤링 방식 설정 (N8N/ScrapingBee)
2. ✅ 첫 크롤링 실행 및 데이터 확인
3. ⏰ 주기적 크롤링 일정 설정 (수동으로 하루 2-3회)
4. 📊 순위 변동 모니터링

### 향후 개선
- Cloudflare Cron Triggers로 자동 크롤링
- 텔레그램/이메일 알림
- 경쟁 브랜드 추적

---

## 📞 도움이 필요하신가요?

- 📖 [상세 사용 가이드](./USAGE_GUIDE.md)
- 📘 [README](./README.md)
- 🐛 GitHub Issues

**즐거운 순위 추적 되세요!** 🚀
