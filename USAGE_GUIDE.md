# W컨셉 순위 추적 시스템 사용 가이드

## 🚀 빠른 시작

### 1. 웹 인터페이스 접속
브라우저에서 다음 URL에 접속하세요:
- **개발 서버**: https://3000-i1xyioj8hpgtq5ei2pf6u-2e77fc33.sandbox.novita.ai

### 2. 대시보드 둘러보기
페이지를 열면 다음 섹션들을 볼 수 있습니다:
- **하시에 최신 순위**: 각 카테고리에서 하시에 브랜드의 현재 순위
- **순위 변동 추이**: 시간에 따른 순위 변화 차트
- **카테고리 관리**: URL 추가/수정/삭제
- **크롤링 로그**: 성공/실패 이력

## 📝 주요 기능 사용법

### ✅ 첫 번째 크롤링 실행

#### 방법 1: 개별 카테고리 크롤링
1. "카테고리 관리" 섹션으로 스크롤
2. 원하는 카테고리 행에서 **🔄 새로고침 아이콘** 클릭
3. 크롤링 완료까지 약 5-10초 대기
4. "하시에 최신 순위"에서 결과 확인

#### 방법 2: 전체 카테고리 한번에 크롤링
1. 우측 상단의 **"전체 크롤링"** 버튼 클릭
2. 모든 카테고리 크롤링 완료까지 약 1-2분 대기
3. 완료 메시지 확인
4. 대시보드에서 전체 결과 확인

### 📊 순위 차트 보기
1. "순위 변동 추이" 섹션으로 이동
2. 드롭다운에서 **카테고리 선택**
3. Chart.js로 시각화된 순위 변화 확인
   - X축: 시간
   - Y축: 순위 (낮을수록 위쪽 = 순위가 높음)

### ➕ 새 카테고리 추가
1. 우측 상단의 **"카테고리 추가"** 버튼 클릭
2. 모달창에서 정보 입력:
   - **카테고리 이름**: 예) "슬랙스"
   - **URL**: W컨셉 best 페이지 URL
     ```
     https://display.wconcept.co.kr/rn/best?displayCategoryType=XXXXX&displaySubCategoryType=XXXXX&gnbType=Y
     ```
3. **"추가"** 버튼 클릭
4. 카테고리 목록에서 확인

### 🔧 카테고리 관리
- **활성화/비활성화**: ⏸️/▶️ 아이콘 클릭
  - 비활성화된 카테고리는 "전체 크롤링"에서 제외됨
- **삭제**: 🗑️ 아이콘 클릭
  - 확인 메시지 후 영구 삭제

### 📜 크롤링 로그 확인
"크롤링 로그" 섹션에서:
- ✅ **성공**: 정상 크롤링
- ❌ **실패**: 에러 메시지 표시
- 최근 20개 로그 자동 표시

## ⚙️ 고급 설정

### 🔌 N8N 웹훅 연동 (권장)

W컨셉은 봇 차단이 있어 직접 크롤링이 실패할 수 있습니다. 
N8N을 사용하면 더 안정적으로 크롤링할 수 있습니다.

#### N8N 워크플로우 생성

1. **N8N 설치 및 실행**
   ```bash
   # Docker로 N8N 실행
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```

2. **워크플로우 생성**
   - http://localhost:5678 접속
   - 새 워크플로우 생성

3. **노드 추가**

   **A. Webhook Trigger**
   ```
   - Method: POST
   - Path: /webhook/wconcept-scraper
   - Respond: Using 'Respond to Webhook' Node
   ```

   **B. Code Node (Playwright)**
   ```javascript
   const puppeteer = require('puppeteer');
   
   // 입력 데이터
   const url = $input.item.json.body.url;
   const selector = $input.item.json.body.selector || '.brand-item';
   const waitTime = $input.item.json.body.waitTime || 5000;
   
   // Puppeteer 실행
   const browser = await puppeteer.launch({
     headless: true,
     args: ['--no-sandbox', '--disable-setuid-sandbox']
   });
   
   const page = await browser.newPage();
   
   // User-Agent 설정
   await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
   
   // 페이지 로드
   await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
   
   // 대기
   await page.waitForTimeout(waitTime);
   
   // 브랜드 데이터 추출
   const brands = await page.evaluate((sel) => {
     const items = Array.from(document.querySelectorAll(sel));
     
     return items.map((item, index) => {
       // 브랜드명 추출
       let name = '';
       const nameEl = item.querySelector('.brand-name, [class*="brand"]');
       if (nameEl) {
         name = nameEl.textContent.trim();
       } else {
         name = item.textContent.trim().split('\n')[0];
       }
       
       // 링크 추출
       const link = item.querySelector('a')?.href || '';
       
       return {
         rank: index + 1,
         name: name,
         link: link
       };
     });
   }, selector);
   
   await browser.close();
   
   return { brands };
   ```

   **C. Respond to Webhook**
   ```
   - Status Code: 200
   - Response Body: {{ $json }}
   ```

4. **워크플로우 활성화**
   - 우측 상단 토글을 "Active"로 설정
   - Production URL 복사 (예: https://your-n8n.com/webhook/wconcept-scraper)

5. **환경 변수 설정**
   
   **.dev.vars 파일 생성**
   ```bash
   N8N_WEBHOOK_URL=https://your-n8n.com/webhook/wconcept-scraper
   ```

   **프로덕션 배포 시**
   ```bash
   npx wrangler pages secret put N8N_WEBHOOK_URL --project-name webapp
   # 프롬프트에서 URL 입력
   ```

6. **테스트**
   - 웹 인터페이스에서 "전체 크롤링" 실행
   - N8N이 자동으로 호출되어 크롤링 수행

### 🐝 ScrapingBee 사용 (무료 1000 requests/month)

1. **ScrapingBee 가입**
   - https://www.scrapingbee.com/ 방문
   - 무료 계정 생성
   - API 키 복사

2. **환경 변수 설정**
   ```bash
   # .dev.vars
   SCRAPINGBEE_API_KEY=your-api-key-here
   ```

3. **자동 전환**
   - 시스템이 자동으로 ScrapingBee 사용
   - N8N보다 우선순위 낮음

### 🌐 Browserless 사용 (제한적 무료)

1. **Browserless 가입**
   - https://www.browserless.io/ 방문
   - 무료 계정 생성 (제한적)
   - API 키 복사

2. **환경 변수 설정**
   ```bash
   # .dev.vars
   BROWSERLESS_API_KEY=your-api-key-here
   ```

## 🔔 알림 설정 (향후 지원)

### 텔레그램 봇
1. BotFather에서 봇 생성
2. Chat ID 확인
3. 환경 변수 설정:
   ```bash
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_CHAT_ID=your-chat-id
   ```

### 이메일 (Resend)
1. Resend.com 가입
2. API 키 생성
3. 환경 변수 설정:
   ```bash
   RESEND_API_KEY=your-api-key
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_TO=your@email.com
   ```

## 🐛 문제 해결

### 크롤링이 실패해요
1. **에러 메시지 확인**
   - "크롤링 로그" 섹션에서 상세 에러 확인

2. **N8N 웹훅 연동**
   - 가장 안정적인 방법
   - W컨셉 봇 차단 우회

3. **ScrapingBee 사용**
   - 무료 티어로 테스트
   - 1000 requests/month 제한

### 하시에가 검색되지 않아요
1. **브랜드명 확인**
   - W컨셉에서 "하시에" 표기 확인
   - 영문명: "HACHIER" 또는 "HASIE"

2. **순위 이력 확인**
   - 해당 카테고리에 실제로 순위권 내에 있는지 확인

### 차트가 표시되지 않아요
1. **카테고리 선택**
   - 드롭다운에서 카테고리 선택 필요

2. **데이터 확인**
   - 해당 카테고리에 크롤링 이력이 있는지 확인
   - 하시에 브랜드 데이터가 있는지 확인

## 💡 팁과 요령

### 효율적인 크롤링
- **주기**: 1-2시간마다 크롤링 권장
- **시간대**: 새벽 시간대는 트래픽이 적어 안정적
- **카테고리**: 관심 카테고리만 활성화하여 API 호출 절약

### 순위 모니터링
- **중요 카테고리**: 자주 확인하는 카테고리만 활성화
- **알림 설정**: Top 10 진입 시 알림 설정 (향후 지원)
- **차트 분석**: 주간/월간 트렌드 확인

### 데이터 관리
- **로컬 백업**: 정기적으로 데이터 백업
- **오래된 데이터**: 필요시 D1 데이터베이스에서 직접 정리
- **용량 관리**: Cloudflare D1 무료 티어 5GB 제한 주의

## 📞 지원

문제가 있거나 개선 제안이 있으시면:
- GitHub Issues 등록
- 또는 개발자에게 직접 연락

---

**즐거운 순위 추적 되세요! 🎉**
