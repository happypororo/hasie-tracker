# Google Sheets 백업 설정 가이드

## 1단계: Google Cloud 프로젝트 생성

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 방문
   - Google 계정으로 로그인

2. **새 프로젝트 생성**
   - 상단 프로젝트 선택 → "새 프로젝트"
   - 프로젝트 이름: `hasie-tracker` (또는 원하는 이름)
   - "만들기" 클릭

## 2단계: Google Sheets API 활성화

1. **API 및 서비스 → 라이브러리**로 이동
2. "Google Sheets API" 검색
3. "Google Sheets API" 선택 → "사용 설정" 클릭

## 3단계: Service Account 생성

1. **API 및 서비스 → 사용자 인증 정보**로 이동
2. **"사용자 인증 정보 만들기"** → **"서비스 계정"** 선택
3. 서비스 계정 세부정보:
   - 이름: `hasie-tracker-backup`
   - ID: 자동 생성됨
   - "만들기 및 계속하기" 클릭
4. 역할 선택: "기본" → "편집자" 선택 (또는 생략 가능)
5. "완료" 클릭

## 4단계: Service Account JSON 키 발급

1. 생성된 서비스 계정 클릭
2. **"키" 탭**으로 이동
3. **"키 추가"** → **"새 키 만들기"**
4. 키 유형: **JSON** 선택
5. "만들기" 클릭
6. **JSON 파일이 자동으로 다운로드됩니다** ⬇️

⚠️ **중요**: 이 JSON 파일은 안전하게 보관하세요!

## 5단계: Google Sheets 생성 및 공유

1. **Google Sheets 생성**
   - https://sheets.google.com/ 접속
   - 새 스프레드시트 생성
   - 이름: "하시에 순위 백업" (또는 원하는 이름)

2. **Service Account와 공유**
   - 스프레드시트 우측 상단 "공유" 버튼 클릭
   - JSON 파일에서 `client_email` 값 복사
     (예: `hasie-tracker-backup@xxx.iam.gserviceaccount.com`)
   - 해당 이메일을 **편집자 권한**으로 추가
   - "보내기" 클릭

3. **스프레드시트 ID 복사**
   - URL에서 ID 확인: 
     `https://docs.google.com/spreadsheets/d/[여기가_SPREADSHEET_ID]/edit`
   - 예: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## 6단계: 정보 제공

아래 정보를 제공해주세요:

1. **Service Account JSON 파일 내용** (전체)
2. **Google Sheets ID** (URL에서 추출)

이 정보를 받으면 자동으로 설정을 완료하겠습니다!

---

## 보안 참고사항

- Service Account JSON 키는 절대 공개 저장소에 커밋하지 마세요
- Cloudflare Pages 환경 변수로 안전하게 저장됩니다
- Google Sheets는 Service Account와만 공유되어 안전합니다
