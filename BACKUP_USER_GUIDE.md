# 🔄 Google Sheets 백업 시스템 사용 가이드

## 📋 개요

D1 데이터베이스와 Google Sheets 간의 양방향 백업/복원 시스템이 구현되었습니다!

### 주요 기능
- ✅ D1 → Google Sheets 백업
- ✅ Google Sheets → D1 복원  
- ✅ 3개 테이블 지원 (rankings, messages, sessions)
- ✅ API 엔드포인트로 수동 실행 가능
- ⏰ (향후) Cron으로 자동 백업 가능

---

## 1️⃣ 초기 설정 (한 번만 실행)

### A. Google Cloud 설정

**`GOOGLE_SHEETS_SETUP.md` 파일을 참고하여 다음 작업을 완료하세요:**

1. Google Cloud 프로젝트 생성
2. Google Sheets API 활성화
3. Service Account 생성
4. Service Account JSON 키 발급 ⬇️
5. Google Sheets 생성 및 Service Account와 공유

### B. 필요한 정보

다음 2가지 정보를 준비하세요:

1. **GOOGLE_SHEETS_ID**: 스프레드시트 URL에서 추출
   ```
   https://docs.google.com/spreadsheets/d/[이_부분이_ID]/edit
   ```

2. **GOOGLE_SERVICE_ACCOUNT**: JSON 파일 내용 전체
   ```json
   {
     "type": "service_account",
     "project_id": "...",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "...@....iam.gserviceaccount.com",
     "client_id": "...",
     ...
   }
   ```

### C. Cloudflare Pages 환경 변수 설정

제가 도와드릴 수 있습니다! 위 2가지 정보를 제공하시면:

1. Cloudflare Pages 프로젝트에 환경 변수 추가
2. 재배포
3. 백업/복원 기능 활성화

---

## 2️⃣ 백업 실행하기

### 수동 백업 (API)

설정 완료 후 아래 API로 즉시 백업 가능:

```bash
curl -X POST https://hacie-tracker.pages.dev/api/backup/to-sheets
```

**응답 예시:**
```json
{
  "success": true,
  "message": "백업 완료: rankings(150), messages(10), sessions(5)",
  "rowCount": 165
}
```

### 백업 확인

Google Sheets를 열어보면 3개의 시트가 생성됩니다:

- `backup_rankings` - 순위 데이터
- `backup_messages` - 텔레그램 메시지
- `backup_sessions` - 업데이트 세션

---

## 3️⃣ 복원하기

⚠️ **주의**: 복원 시 D1의 기존 데이터가 모두 삭제됩니다!

```bash
curl -X POST https://hacie-tracker.pages.dev/api/backup/from-sheets
```

**응답 예시:**
```json
{
  "success": true,
  "message": "복원 완료: rankings(150), messages(10), sessions(5)",
  "rowCount": 165
}
```

---

## 4️⃣ 백업 상태 확인

현재 설정 및 데이터베이스 통계 확인:

```bash
curl https://hacie-tracker.pages.dev/api/backup/status
```

**응답 예시:**
```json
{
  "success": true,
  "configured": true,
  "spreadsheet_id": "1BxiMVs0XRA5nFMd...",
  "database_stats": {
    "rankings": 150,
    "messages": 10,
    "sessions": 5
  }
}
```

---

## 5️⃣ 자동 백업 (향후 추가 예정)

Cloudflare Cron Triggers를 사용하여 자동 백업 설정 가능:

- 매일 오전 2시 자동 백업
- 매주 월요일 자동 백업
- 사용자 정의 스케줄

---

## 🆘 문제 해결

### "Google Sheets 설정이 완료되지 않았습니다" 에러

→ 환경 변수가 설정되지 않았습니다. Cloudflare Pages 대시보드에서 확인하세요.

### "Failed to get access token" 에러

→ Service Account JSON이 잘못되었습니다. 형식을 확인하세요.

### "Failed to write to sheet" 에러

→ Service Account가 스프레드시트에 편집 권한이 없습니다. 공유 설정을 확인하세요.

---

## 📊 백업 데이터 구조

### backup_rankings 시트
```
| id | category | product_name | product_link | rank | out_rank | created_at | ...
```

### backup_messages 시트  
```
| id | message_id | chat_id | received_at | message_text | ...
```

### backup_sessions 시트
```
| id | created_at | source |
```

---

## ✅ 다음 단계

1. **Google Cloud 설정 완료**
   - `GOOGLE_SHEETS_SETUP.md` 참고
   - Service Account JSON 발급
   - Google Sheets 생성 및 공유

2. **정보 제공**
   - GOOGLE_SHEETS_ID
   - GOOGLE_SERVICE_ACCOUNT (JSON 전체)

3. **환경 변수 설정** (제가 도와드리겠습니다)

4. **재배포 및 테스트**

---

**준비되면 알려주세요!** 🚀
