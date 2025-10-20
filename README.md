# 하시에 순위 트래커

텔레그램 채널에서 W컨셉 '하시에' 브랜드의 순위 정보를 자동으로 수집하고 트래킹하는 웹 애플리케이션

## 🎯 현재 버전: v1.0

**버전 정보**
- **버전명**: v1.0 (Global Out Rank + Timezone Fix)
- **Git 태그**: `v1.0`
- **완성일**: 2025-10-20
- **커밋 해시**: `c4379ab`
- **백업 파일**: [hasie-tracker-v1.0.tar.gz](다운로드 링크는 백업 생성 후 추가됨)

## 📚 버전 히스토리

### v1.0 (2025-10-20) - **현재 버전**
**주요 기능**:
- ✅ 글로벌 Out Rank 로직 (모든 카테고리 통합 처리)
- ✅ 한국 시간대(KST) 정확한 표시
- ✅ 텔레그램 메시지 시간 기준 업데이트
- ✅ 최신 순위/Out Rank 2탭 시스템

**변경 사항**:
- Out Rank 로직을 카테고리별 → 글로벌 범위로 변경
- 새 메시지에 없는 모든 제품을 Out Rank로 이동
- 타임존 UTC → KST 변환 로직 개선
- 절대 시간 표시 (YYYY.MM.DD HH:MM)

**Git 태그**: `v1.0`
**커밋**: `c4379ab`
**복원 방법**:
```bash
# Git 태그로 복원
git checkout v1.0

# 백업 파일로 복원
wget [백업 다운로드 링크]
tar -xzf hasie-tracker-v1.0.tar.gz
cd home/user/webapp && npm install
```

### v1.0-simple-bw (2025-10-20) - 이전 버전
**주요 기능**:
- ✅ 심플 흑백 UI
- ✅ 카테고리별 Out Rank 로직
- ✅ 수동/자동 텔레그램 연동
- ✅ 순위 변동 표시 (NEW, +N, -N)

**Git 태그**: `v1.0-simple-bw`
**백업**: [hasie-tracker-v1.0-simple-bw.tar.gz](https://page.gensparksite.com/project_backups/hasie-tracker-v1.0-simple-bw.tar.gz)

## ✅ 완료된 기능

### 1. **텔레그램 연동 (자동 + 수동)**
- **자동 연동**: 텔레그램 웹훅으로 메시지 실시간 수신
- **수동 입력**: 대시보드에서 메시지 복사/붙여넣기
- 메시지 파싱 (여러 카테고리 동시 처리)
- 하시에 브랜드 순위 데이터 자동 저장
- Out Rank 자동 추적 (순위권 이탈 제품 관리)

### 2. **순위 데이터 관리**
- 동일 제품의 **최신 순위만** 표시 (중복 제거)
- 제품별 순위 히스토리 추적
- 바로 이전 순위와 비교한 변동 계산

### 3. **순위 변동 표시**
- **+N**: N칸 상승 (예: +2 = 2칸 상승)
- **-N**: N칸 하락 (예: -2 = 2칸 하락)
- **-**: 순위 유지
- **NEW**: 신규 제품

### 4. **심플 흑백 UI**
- 미니멀한 흑백 디자인
- 테이블 형태의 깔끔한 레이아웃
- 순위 정보를 한눈에 파악 가능
- 카테고리별 필터링

### 5. **제품별 동향 차트**
- 제품 클릭 → 순위 히스토리 차트
- Chart.js 기반 시각화
- 첫 등장부터 현재까지 전체 이력 표시

### 6. **Out Rank 기능**
- **[최신 순위] 탭**: 현재 순위권 내 제품들
- **[Out Rank] 탭**: 순위권 이탈 제품들
- 제품이 다시 순위권 진입 시 자동으로 최신 순위 탭으로 복귀
- 카테고리별 Out Rank 추적

### 7. **데이터 관리**
- **초기화 버튼**: 모든 순위 데이터 삭제
- 확인 메시지로 안전장치 제공
- 한국 시간대(KST) 표시
- 텔레그램 메시지 시간 기준 업데이트

## 📊 데이터 구조

### hasie_rankings (순위 데이터)
```sql
- id: 기록 ID
- category: 카테고리 (아우터, 셔츠, 스커트 등)
- rank: 순위
- product_name: 상품명
- product_link: 상품 링크 (고유 식별자)
- created_at: 기록 시간
```

### telegram_messages (텔레그램 메시지 로그)
```sql
- id: 로그 ID
- message_id: 텔레그램 메시지 ID (중복 방지)
- message_text: 원본 메시지
- parsed_count: 파싱된 순위 개수
- created_at: 수신 시간
```

## 🚀 로컬 개발 환경

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 로컬 D1 데이터베이스 초기화
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply webapp-production --local

# 빌드
npm run build

# 개발 서버 시작
pm2 start ecosystem.config.cjs

# 서버 확인
curl http://localhost:3000
```

### 환경 변수 (.dev.vars)
```bash
TELEGRAM_BOT_TOKEN=8402879837:AAGaN2uVkkufLo5hDBbDjZORFx_PNjJRtq4
```

## 🤖 텔레그램 봇 설정

### 1. BotFather에서 봇 생성
```
1. 텔레그램에서 @BotFather 검색
2. /newbot 명령어
3. 봇 이름 및 유저네임 입력
4. API 토큰 복사
```

### 2. 웹훅 설정 (현재 활성화됨)
```bash
# 현재 설정된 웹훅
curl -X POST "https://api.telegram.org/bot8402879837:AAGaN2uVkkufLo5hDBbDjZORFx_PNjJRtq4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://3000-i1xyioj8hpgtq5ei2pf6u-2e77fc33.sandbox.novita.ai/api/telegram/webhook",
    "allowed_updates": ["message"]
  }'

# 웹훅 상태 확인
curl -s "https://api.telegram.org/bot8402879837:AAGaN2uVkkufLo5hDBbDjZORFx_PNjJRtq4/getWebhookInfo"
```

### 3. 사용 방법
**자동 연동 (웹훅)**:
- 봇에게 메시지를 보내면 자동으로 사이트에 반영됩니다
- 실시간 업데이트 (즉시 반영)

**수동 입력**:
1. 텔레그램에서 메시지 복사
2. 대시보드에서 "메시지 입력" 클릭
3. 메시지 붙여넣기 후 확인
4. 메시지 시간 조정 가능 (선택사항)

## 🌐 API 엔드포인트

### 텔레그램 연동
- `POST /api/telegram/webhook` - 텔레그램 웹훅 (자동 수신)
- `POST /api/hasie/import` - 수동 메시지 입력

### 순위 조회
- `GET /api/hasie/latest?category=아우터` - 최신 순위 (out_rank = 0)
- `GET /api/hasie/latest-with-changes?category=셔츠` - 순위 변동 정보 포함
- `GET /api/hasie/out-rank?category=아우터` - 순위권 이탈 제품
- `GET /api/hasie/categories` - 카테고리 목록

### 통계 및 분석
- `GET /api/hasie/stats` - 카테고리별 통계
- `GET /api/hasie/product-trends?product_link=...` - 특정 제품 동향
- `GET /api/hasie/trends?category=아우터&days=7` - 카테고리 트렌드

### 데이터 관리
- `DELETE /api/hasie/reset` - 데이터베이스 초기화

## 🎨 UI/UX 특징

### 디자인 컨셉
- **색상**: 흑백 (Black & White)
- **스타일**: 미니멀리즘
- **레이아웃**: 테이블 기반

### 정보 표시
```
┌────────────────────────────────────┐
│ 순위 | 변동 | 상품명             │
├────────────────────────────────────┤
│ 2위  | +2   | BLUE STRIPE...     │
│ 3위  | -2   | VINTAGE SILK...    │
│ 5위  | NEW  | ELEGANT LONG...    │
└────────────────────────────────────┘
```

## 🔄 버전 복원 방법

### 방법 1: Git 태그 사용
```bash
# 태그 목록 확인
git tag -l

# 특정 태그로 체크아웃
git checkout v1.0-simple-bw

# 새 브랜치로 작업
git checkout -b restore-v1.0
```

### 방법 2: 백업 파일 사용
```bash
# 백업 다운로드
wget https://page.gensparksite.com/project_backups/hasie-tracker-v1.0-simple-bw.tar.gz

# 압축 해제
tar -xzf hasie-tracker-v1.0-simple-bw.tar.gz

# 프로젝트 디렉토리로 이동
cd home/user/webapp

# 의존성 설치
npm install
```

### 방법 3: 특정 커밋으로 복원
```bash
# 현재 커밋 해시: eb985c3
git checkout eb985c3

# 또는 새 브랜치로
git checkout -b v1.0-backup eb985c3
```

## 📦 배포

### Cloudflare Pages 배포
```bash
# 빌드
npm run build

# Pages 프로젝트 생성 (최초 1회)
npx wrangler pages project create webapp --production-branch main

# 배포
npx wrangler pages deploy dist --project-name webapp
```

## 🛠️ 기술 스택

- **Backend**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **Charts**: Chart.js 4.4.0
- **Icons**: Font Awesome 6.4.0
- **Deployment**: Cloudflare Pages

## 📝 개발 노트

### 주요 결정 사항
1. **최신 순위만 표시**: 사용자가 각 제품을 한 번만 보길 원함
2. **흑백 디자인**: 정보 집중, 심플함 강조
3. **+/- 표시**: 직관적인 순위 변동 표현
4. **테이블 레이아웃**: 스캔하기 쉬운 구조

### 알려진 제약사항
- Cloudflare Workers 환경에서 실행 (Node.js API 제한)
- 10ms CPU 시간 제한 (무료 플랜)
- 정적 파일은 public/ 디렉토리에 빌드 시 포함

## 📄 라이선스

MIT License

---

**문제나 개선 사항이 있으면 이슈를 등록해주세요!**
