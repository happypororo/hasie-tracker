# 하시에 순위 트래커

텔레그램 채널에서 W컨셉 '하시에' 브랜드의 순위 정보를 자동으로 수집하고 트래킹하는 웹 애플리케이션

**🔗 GitHub**: https://github.com/happypororo/hasie-tracker

## 🎯 현재 버전: v1.3

**버전 정보**
- **버전명**: v1.3 (OUT 로직 버그 수정 + 동향차트 중복 제거)
- **Git 태그**: `v1.3` (예정)
- **완성일**: 2025-10-21
- **주요 기능**:
  - ✅ 같은 세션에 정상 기록된 제품이 OUT으로 표시되는 버그 수정
  - ✅ 동향차트에서 같은 분의 중복 기록 제거 (최신 상태만 표시)
  - ✅ 모든 historical 데이터 보존 (시간대별 순위 변화 추적 가능)
  - ✅ 세션 ID 기반 OUT 중복 방지
  - ✅ UNIQUE 제약으로 DB 레벨 중복 차단
  - ✅ GitHub 저장소 연동 완료

## 🚀 빠른 시작 (새 세션 복원)

### 젠스파크 새 대화창에서 복원하기

다음 명령어를 복사해서 새 대화창에 붙여넣으세요:

```
GitHub에서 하시에 순위 트래커 프로젝트를 복원하고 실행해줘.

저장소: https://github.com/happypororo/hasie-tracker
기술 스택: Hono + Cloudflare D1 + Chart.js
경로: /home/user/webapp

다음 순서로 진행해줘:
1. git clone https://github.com/happypororo/hasie-tracker.git /home/user/webapp
2. cd /home/user/webapp && npm install (300초 타임아웃)
3. cd /home/user/webapp && npx wrangler d1 migrations apply webapp-production --local
4. cd /home/user/webapp && npm run build (300초 타임아웃)
5. cd /home/user/webapp && pm2 start ecosystem.config.cjs
6. curl http://localhost:3000 으로 테스트
7. GetServiceUrl로 공개 URL 확인

완료되면 GitHub 링크, 로컬 URL, 공개 URL 모두 알려줘.
```

### 수동 복원 (직접 명령어 입력)

```bash
# 1. 저장소 클론
git clone https://github.com/happypororo/hasie-tracker.git /home/user/webapp
cd /home/user/webapp

# 2. 의존성 설치 (300초 타임아웃)
npm install

# 3. 데이터베이스 마이그레이션
npx wrangler d1 migrations apply webapp-production --local

# 4. 빌드 (300초 타임아웃)
npm run build

# 5. 서버 시작
pm2 start ecosystem.config.cjs

# 6. 테스트
curl http://localhost:3000
```

## 🎯 이전 버전: v1.1

**버전 정보**
- **버전명**: v1.1 (Export + Password + Out Chart + Minute-Precision Fix)
- **Git 태그**: `v1.1`
- **완성일**: 2025-10-20
- **주요 기능**:
  - ✅ 비밀번호 보호 초기화 (----)
  - ✅ 전체 데이터 CSV 내보내기
  - ✅ 개별 제품 히스토리 CSV 내보내기
  - ✅ Out Rank 차트 시각화 (빨간색, 210위 표시)
  - ✅ 분(minute) 단위 메시지 비교 로직 (동시 가져오기 지원)

## 📚 버전 히스토리

### v1.3 (2025-10-21) - **현재 버전**
**주요 버그 수정**:
- ✅ 같은 세션에 정상 기록된 제품이 OUT으로 표시되는 버그 수정
  - 문제: 115위로 기록된 제품이 같은 세션에 OUT으로도 기록됨
  - 원인: OUT 처리 쿼리가 같은 세션의 모든 제품(out_rank=0,1)을 가져옴
  - 해결: OUT 처리 쿼리에 'AND out_rank = 0' 조건 추가
- ✅ 동향차트에서 같은 분의 중복 기록 제거
  - 문제: 같은 분에 정상 순위 + OUT 레코드가 모두 차트에 표시됨
  - 해결: product-trends API에서 분 단위로 그룹핑하여 최신 레코드만 반환
  - 데이터 보존: 모든 historical 레코드는 데이터베이스에 보존

**마이그레이션**:
- `0004_fix_wrong_out_records.sql`: 잘못 기록된 26개 OUT 레코드 삭제

**Git 커밋**: 
- `fd446ae`: OUT 로직 버그 수정
- `8b46c65`: 동향차트 중복 제거

### v1.2 (2025-10-21) - 이전 버전
**주요 기능**:
- ✅ 세션 ID 기반 OUT 중복 방지 (1차 방어)
- ✅ UNIQUE 제약으로 DB 레벨 중복 차단 (2차 방어)
- ✅ INSERT OR IGNORE로 안전한 에러 처리 (3차 방어)

**Git 태그**: `v1.2`

### v1.1 (2025-10-20) - 이전 버전
**주요 기능**:
- ✅ 비밀번호 보호 초기화 기능 (----)
- ✅ CSV 내보내기 (전체 데이터 + 개별 제품)
- ✅ Out Rank 차트 시각화 (빨간색, 210위 표시)
- ✅ 분(minute) 단위 메시지 비교 (동시 가져오기 지원)
- ✅ UTF-8 BOM 인코딩으로 한글 지원

**변경 사항**:
- 초기화 버튼에 비밀번호 인증 추가 (????)
- 전체 제품 순위 히스토리 CSV 다운로드
- 개별 제품 순위 히스토리 CSV 다운로드
- 차트에서 Out Rank를 210위에 빨간색으로 표시
- Out Rank 로직을 분(minute) 단위 비교로 개선
- 동일 분(minute) 내 여러 카테고리 동시 가져오기 지원

**버그 수정**:
- 차트 렌더링 오류 수정 (context.tick null 체크)
- 순차적 카테고리 가져오기 시 Out Rank 이동 방지
- 같은 시간(분) 내 가져온 제품들이 Out Rank로 가는 문제 해결

**Git 태그**: `v1.1`

### v1.0 (2025-10-20) - 이전 버전
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
wget https://page.gensparksite.com/project_backups/hasie-tracker-v1.0.tar.gz
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
- **초기화 버튼**: 비밀번호 보호 (----)
- 확인 메시지로 2단계 안전장치 제공
- 한국 시간대(KST) 표시
- 텔레그램 메시지 시간 기준 업데이트
- 분(minute) 단위 메시지 비교로 동시 가져오기 지원

### 8. **CSV 내보내기**
- **전체 데이터 내보내기**: 모든 제품의 순위 히스토리
- **개별 제품 내보내기**: 선택한 제품의 순위 히스토리
- UTF-8 BOM 인코딩으로 한글 지원
- 카테고리 필터링 지원
- Excel에서 바로 열기 가능

### 9. **Out Rank 차트 시각화**
- Out Rank 제품을 차트에 표시 (210위)
- Out Rank 구간을 빨간색으로 강조
- Y축에 "OUT" 라벨 표시
- 일반 순위와 구분되는 시각적 표현

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

### 데이터 내보내기
- `GET /api/hasie/export/all?category=아우터` - 전체 데이터 CSV 다운로드
- `GET /api/hasie/export/product?product_link=...` - 개별 제품 CSV 다운로드

### 데이터 관리
- `DELETE /api/hasie/reset` - 데이터베이스 초기화 (비밀번호 보호)

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
5. **분 단위 비교**: 동시 가져오기 시 모든 제품을 최신 순위로 유지
6. **Out Rank 차트 시각화**: 빨간색으로 순위권 이탈 강조

### 알려진 제약사항
- Cloudflare Workers 환경에서 실행 (Node.js API 제한)
- 10ms CPU 시간 제한 (무료 플랜)
- 정적 파일은 public/ 디렉토리에 빌드 시 포함

### 주요 이슈 해결
1. **Out Rank 동시 가져오기 문제**: 
   - 문제: 여러 카테고리를 같은 시간에 가져오면 일부만 Out Rank로 이동
   - 원인: 초 단위 타임스탬프 비교로 미세한 시간 차이 감지
   - 해결: `strftime('%Y-%m-%d %H:%M')` 사용하여 분 단위 비교

2. **차트 렌더링 오류**:
   - 문제: 차트 클릭 시 "순위 동향을 불러오는데 실패했습니다" 오류
   - 원인: Chart.js callback에서 context.tick 객체 구조 오해
   - 해결: ticks callback 단순화, null 체크 추가

3. **Out Rank 차트 표시**:
   - 문제: Out Rank 제품이 차트에 표시되지 않음
   - 해결: rank 201을 210으로 매핑, Y축에 "OUT" 라벨 표시
   - 추가: 빨간색 점과 라인으로 Out Rank 구간 강조

4. **같은 세션 정상 제품 OUT 오류**:
   - 문제: 텔레그램에 115위로 나타나는 제품이 Out Rank로 잘못 기록됨
   - 원인: [끝] 메시지 처리 시 같은 세션의 모든 레코드(out_rank=0,1)를 제외 대상으로 가져옴
   - 해결: OUT 처리 쿼리에 'AND out_rank = 0' 조건 추가하여 정상 제품만 제외

5. **동향차트 중복 레코드**:
   - 문제: 같은 분에 정상 순위 + OUT 레코드가 모두 차트에 표시됨
   - 원인: 같은 제품이 순위권 → OUT 전환 시 같은 분에 2개 레코드 생성
   - 해결: product-trends API에서 분 단위로 그룹핑하여 최신 상태만 반환
   - 효과: 차트는 깔끔하게, 데이터베이스는 완전한 이력 보존

## 📄 라이선스

MIT License

---

**문제나 개선 사항이 있으면 이슈를 등록해주세요!**
