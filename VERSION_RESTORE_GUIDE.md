# 버전 복원 가이드 - 다른 젠스파크 세션에서 사용하기

## 🎯 목적
이 프로젝트의 특정 버전을 다른 젠스파크 세션에서 복원하여 사용하는 방법

## 📦 현재 저장된 버전

### v1.0 (최신) - 2025-10-20
- **백업 파일**: https://page.gensparksite.com/project_backups/hasie-tracker-v1.0.tar.gz
- **Git 태그**: v1.0
- **커밋**: c4379ab
- **특징**: 글로벌 Out Rank + 한국 시간대

### v1.0-simple-bw - 2025-10-20  
- **백업 파일**: https://page.gensparksite.com/project_backups/hasie-tracker-v1.0-simple-bw.tar.gz
- **Git 태그**: v1.0-simple-bw
- **특징**: 심플 흑백 UI + 카테고리별 Out Rank

---

## 🚀 복원 방법

### 방법 1: 백업 파일 사용 (가장 쉬움) ⭐

```bash
# 1. 백업 다운로드
cd /home/user
wget https://page.gensparksite.com/project_backups/hasie-tracker-v1.0.tar.gz

# 2. 압축 해제 (절대 경로로 복원됨)
tar -xzf hasie-tracker-v1.0.tar.gz

# 3. 프로젝트 디렉토리로 이동
cd /home/user/webapp

# 4. Git 히스토리 확인 (포함되어 있음)
git log --oneline -5
git tag -l

# 5. 의존성 설치
npm install

# 6. 로컬 D1 데이터베이스 초기화
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply webapp-production --local

# 7. 빌드 및 실행
npm run build
pm2 start ecosystem.config.cjs

# 8. 서비스 확인
curl http://localhost:3000
```

### 방법 2: GitHub 저장소 사용 (추천)

**전제조건**: GitHub에 푸시되어 있어야 함

```bash
# 1. 저장소 클론
cd /home/user
git clone https://github.com/YOUR_USERNAME/webapp.git

# 2. 특정 버전 체크아웃
cd webapp
git checkout v1.0

# 3. 의존성 설치
npm install

# 4. 로컬 D1 데이터베이스 초기화
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply webapp-production --local

# 5. 빌드 및 실행
npm run build
pm2 start ecosystem.config.cjs
```

### 방법 3: 특정 커밋으로 복원

```bash
# GitHub 저장소 클론 후
cd webapp
git checkout c4379ab  # v1.0의 커밋 해시
git checkout -b restore-v1.0  # 새 브랜치 생성

# 이후 동일하게 진행
npm install
npm run build
pm2 start ecosystem.config.cjs
```

---

## 📋 버전별 특징 비교

| 항목 | v1.0-simple-bw | v1.0 |
|------|----------------|------|
| Out Rank 로직 | 카테고리별 처리 | 글로벌 처리 ⭐ |
| 시간 표시 | 상대 시간 | 절대 시간 (KST) ⭐ |
| UI 디자인 | 심플 흑백 | 심플 흑백 |
| 텔레그램 연동 | 자동+수동 | 자동+수동 |
| 순위 변동 표시 | ✅ | ✅ |
| 동향 차트 | ✅ | ✅ (KST 개선) |

---

## 🔧 환경 변수 설정

복원 후 `.dev.vars` 파일이 필요합니다:

```bash
# .dev.vars 파일 생성
cat > /home/user/webapp/.dev.vars << 'VARS'
TELEGRAM_BOT_TOKEN=8402879837:AAGaN2uVkkufLo5hDBbDjZORFx_PNjJRtq4
VARS
```

---

## 📝 복원 후 체크리스트

- [ ] Git 히스토리 확인: `git log --oneline`
- [ ] 태그 확인: `git tag -l`
- [ ] 의존성 설치: `npm install`
- [ ] D1 마이그레이션: `npx wrangler d1 migrations apply webapp-production --local`
- [ ] 환경 변수 설정: `.dev.vars` 파일 생성
- [ ] 빌드: `npm run build`
- [ ] 서비스 시작: `pm2 start ecosystem.config.cjs`
- [ ] 동작 확인: `curl http://localhost:3000`

---

## 🆘 문제 해결

### 포트 3000이 이미 사용 중
```bash
fuser -k 3000/tcp 2>/dev/null || true
pm2 delete all
```

### 데이터베이스 초기화 필요
```bash
rm -rf .wrangler/state/v3/d1
npx wrangler d1 migrations apply webapp-production --local
```

### PM2 서비스가 시작 안 됨
```bash
pm2 logs webapp --nostream
pm2 restart webapp
```

---

## 📞 추가 정보

- **프로젝트 경로**: `/home/user/webapp`
- **개발 포트**: 3000
- **데이터베이스**: Cloudflare D1 (로컬 SQLite)
- **프로세스 관리**: PM2

**상세 문서**: README.md, VERSION_HISTORY.md 참조
