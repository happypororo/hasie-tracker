# 하시에 순위 트래커 - 버전 히스토리

이 문서는 프로젝트의 모든 버전을 관리하고 추적합니다. 각 버전은 Git 태그와 백업 파일로 보존됩니다.

## 📖 버전 복원 가이드

### 방법 1: Git 태그 사용 (추천)
```bash
# 1. 저장소 클론 (처음 한 번만)
git clone https://github.com/YOUR_USERNAME/webapp.git
cd webapp

# 2. 모든 태그 확인
git tag -l

# 3. 원하는 버전으로 체크아웃
git checkout v1.0

# 4. 의존성 설치 및 실행
npm install
npm run build
pm2 start ecosystem.config.cjs
```

### 방법 2: 백업 파일 사용
```bash
# 1. 백업 다운로드
wget [백업 URL]

# 2. 압축 해제 (절대 경로 복원)
tar -xzf hasie-tracker-vX.X.tar.gz

# 3. 프로젝트 디렉토리로 이동
cd home/user/webapp

# 4. 의존성 설치 및 실행
npm install
npm run build
pm2 start ecosystem.config.cjs
```

### 방법 3: 특정 커밋으로 복원
```bash
git checkout [커밋 해시]
git checkout -b restore-version
```

---

## 📦 버전 목록

### v1.0 (2025-10-20) ⭐ **최신 버전**

**Git 태그**: `v1.0`  
**커밋 해시**: `c4379ab2912b732bb3e56ec96b76263d75841784`  
**백업 파일**: [hasie-tracker-v1.0.tar.gz](https://page.gensparksite.com/project_backups/hasie-tracker-v1.0.tar.gz)  
**크기**: 354 KB

#### 주요 기능
- ✅ **글로벌 Out Rank 로직**: 새 메시지에 없는 모든 제품을 Out Rank로 이동
- ✅ **한국 시간대 정확 표시**: UTC → KST 변환 개선
- ✅ **텔레그램 메시지 시간 기준**: DB 생성 시간이 아닌 메시지 시간 사용
- ✅ **2탭 시스템**: 최신 순위 / Out Rank 완전 분리
- ✅ **자동/수동 연동**: 웹훅 + 수동 입력 모두 지원

#### 변경 사항
- Out Rank 로직을 **카테고리별 → 글로벌 범위**로 변경
- 최신 순위 탭에서 `out_rank=1` 제품 완전 제외
- 타임존 표시를 **상대 시간 → 절대 시간**으로 변경 (YYYY.MM.DD HH:MM)
- Chart.js 동향 차트도 한국 시간대 표시

#### 복원 방법
```bash
# Git 태그
git checkout v1.0

# 백업 파일
wget https://page.gensparksite.com/project_backups/hasie-tracker-v1.0.tar.gz
tar -xzf hasie-tracker-v1.0.tar.gz
cd home/user/webapp && npm install
```

#### 기술 스택
- Hono 4.0+ (Cloudflare Workers)
- Cloudflare D1 (SQLite)
- TailwindCSS (CDN)
- Chart.js 4.4.0
- Font Awesome 6.4.0

---

### v1.0-simple-bw (2025-10-20)

**Git 태그**: `v1.0-simple-bw`  
**커밋 해시**: `eb985c3` (추정)  
**백업 파일**: [hasie-tracker-v1.0-simple-bw.tar.gz](https://page.gensparksite.com/project_backups/hasie-tracker-v1.0-simple-bw.tar.gz)

#### 주요 기능
- ✅ **심플 흑백 UI**: 미니멀한 Black & White 디자인
- ✅ **카테고리별 Out Rank**: 같은 카테고리 내에서만 Out Rank 처리
- ✅ **순위 변동 표시**: NEW, +N, -N, - 표시
- ✅ **제품 동향 차트**: Chart.js 기반 히스토리 시각화
- ✅ **텔레그램 연동**: 자동 웹훅 + 수동 입력

#### 알려진 제약
- 카테고리별 Out Rank 처리로 인해 다른 카테고리 업데이트 시 제품이 남아있는 문제
- 상대 시간 표시로 정확한 시간 파악 어려움

#### 복원 방법
```bash
# Git 태그
git checkout v1.0-simple-bw

# 백업 파일
wget https://page.gensparksite.com/project_backups/hasie-tracker-v1.0-simple-bw.tar.gz
tar -xzf hasie-tracker-v1.0-simple-bw.tar.gz
cd home/user/webapp && npm install
```

---

## 🔖 태그 명명 규칙

- **메이저 버전**: `v1.0`, `v2.0` (큰 기능 변경)
- **마이너 버전**: `v1.1`, `v1.2` (기능 추가)
- **패치 버전**: `v1.0.1`, `v1.0.2` (버그 수정)
- **특수 버전**: `v1.0-simple-bw` (특정 특징 표시)

## 📝 새 버전 생성 가이드

```bash
# 1. 코드 변경 및 커밋
git add .
git commit -m "Feature: Add new functionality"

# 2. README.md 업데이트
# - 현재 버전 정보 수정
# - 버전 히스토리에 새 버전 추가

# 3. Git 태그 생성
git tag -a v1.1 -m "v1.1: Feature description

Major changes:
- Change 1
- Change 2
"

# 4. 백업 생성 (ProjectBackup 도구 사용)
# - project_path: /home/user/webapp
# - backup_name: hasie-tracker-v1.1
# - description: [버전 설명]

# 5. README와 VERSION_HISTORY.md에 백업 URL 추가

# 6. 최종 커밋
git add .
git commit -m "Release v1.1"
```

## 🗂️ 파일 구조

```
webapp/
├── README.md                    # 프로젝트 개요 및 현재 버전
├── VERSION_HISTORY.md          # 모든 버전 히스토리 (이 파일)
├── .git/                       # Git 저장소 (모든 버전 포함)
├── src/                        # 소스 코드
├── public/                     # 정적 파일
├── migrations/                 # 데이터베이스 마이그레이션
└── [백업 파일들]
```

## 📊 버전 비교

| 기능 | v1.0-simple-bw | v1.0 |
|------|----------------|------|
| Out Rank 로직 | 카테고리별 | 글로벌 |
| 시간 표시 | 상대 시간 | 절대 시간 (KST) |
| 타임존 정확도 | 보통 | 높음 |
| 최신 순위 필터링 | 기본 | 개선 |

---

**마지막 업데이트**: 2025-10-20  
**관리자**: genspark_dev
