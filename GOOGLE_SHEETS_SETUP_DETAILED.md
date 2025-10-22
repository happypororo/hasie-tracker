# 📘 Google Cloud 설정 상세 가이드 (단계별)

## 🎯 목표
Google Sheets와 연동하여 데이터를 자동으로 백업할 수 있도록 설정합니다.

---

## 1단계: Google Cloud Console 접속 ☁️

### 1-1. 웹사이트 접속
```
https://console.cloud.google.com/
```
- Google 계정으로 로그인하세요
- Gmail 계정이 있으면 바로 사용 가능합니다

### 1-2. 첫 방문 시
- "약관 동의" 화면이 나오면 동의하고 진행
- "무료 평가판" 안내가 나올 수 있음 (무시해도 됨)

---

## 2단계: 프로젝트 생성 📁

### 2-1. 프로젝트 선택 드롭다운 클릭
- 화면 **상단 왼쪽**에 "프로젝트 선택" 또는 "Select a project" 버튼
- 현재 선택된 프로젝트 이름 옆의 **▼** 클릭

### 2-2. 새 프로젝트 만들기
1. 팝업 창에서 **"새 프로젝트"** 버튼 클릭
2. 프로젝트 이름 입력:
   ```
   hasie-tracker
   ```
   (또는 원하는 이름)

3. 조직: `조직 없음` (기본값 그대로)
4. 위치: `조직 없음` (기본값 그대로)
5. **"만들기"** 버튼 클릭

### 2-3. 프로젝트 생성 완료 대기
- 10-20초 정도 소요
- 우측 상단 종 아이콘에서 "프로젝트가 생성되었습니다" 알림 확인
- 자동으로 새 프로젝트로 전환됨

---

## 3단계: Google Sheets API 활성화 🔌

### 3-1. API 라이브러리로 이동
**방법 A: 검색창 사용**
1. 상단 검색창에 `sheets api` 입력
2. 검색 결과에서 **"Google Sheets API"** 선택

**방법 B: 메뉴 사용**
1. 왼쪽 햄버거 메뉴 (☰) 클릭
2. **"API 및 서비스"** → **"라이브러리"** 선택
3. 검색창에 `sheets` 입력
4. **"Google Sheets API"** 클릭

### 3-2. API 사용 설정
1. **"사용"** 또는 **"ENABLE"** 버튼 클릭
2. 잠시 기다리면 API가 활성화됩니다
3. API 대시보드 화면으로 전환됨

✅ **확인**: 화면에 "API가 사용 설정됨" 표시

---

## 4단계: Service Account 생성 🔑

### 4-1. 사용자 인증 정보 페이지로 이동
**방법 A: 현재 페이지에서**
- API 활성화 후 화면에서 **"사용자 인증 정보 만들기"** 버튼 클릭

**방법 B: 메뉴에서**
1. 왼쪽 메뉴에서 **"사용자 인증 정보"** 클릭
2. 상단의 **"+ 사용자 인증 정보 만들기"** 버튼 클릭
3. 드롭다운에서 **"서비스 계정"** 선택

### 4-2. 서비스 계정 세부정보 입력
1. **서비스 계정 이름**:
   ```
   hasie-tracker-backup
   ```
   (또는 원하는 이름)

2. **서비스 계정 ID**: 자동으로 생성됨
   ```
   hasie-tracker-backup@프로젝트ID.iam.gserviceaccount.com
   ```

3. **설명** (선택사항):
   ```
   하시에 트래커 데이터 백업용 서비스 계정
   ```

4. **"만들기 및 계속하기"** 버튼 클릭

### 4-3. 역할 부여 (선택사항)
1. **"역할 선택"** 드롭다운 클릭
2. 검색: `편집자` 또는 `Editor`
3. **"기본" → "편집자"** 선택
4. **"계속"** 버튼 클릭

> 💡 **참고**: 역할을 건너뛰어도 됩니다. Google Sheets 공유로 권한을 줄 수 있습니다.

### 4-4. 서비스 계정 생성 완료
1. 3단계는 건너뛰기
2. **"완료"** 버튼 클릭

✅ **확인**: 사용자 인증 정보 목록에 새 서비스 계정 표시됨

---

## 5단계: JSON 키 발급 🔐

### 5-1. 서비스 계정 선택
1. 사용자 인증 정보 페이지에서
2. 방금 만든 서비스 계정 이메일 클릭
   ```
   hasie-tracker-backup@...iam.gserviceaccount.com
   ```

### 5-2. 키 생성
1. 상단 탭에서 **"키"** 탭 클릭
2. **"키 추가"** 버튼 클릭
3. **"새 키 만들기"** 선택

### 5-3. JSON 형식 선택
1. 키 유형: **JSON** 선택 (기본값)
2. **"만들기"** 버튼 클릭

### 5-4. 키 다운로드
- 자동으로 JSON 파일이 다운로드됩니다 ⬇️
- 파일명 예시: `hasie-tracker-xxx-yyyy.json`

⚠️ **중요**: 
- 이 파일을 **안전하게 보관**하세요!
- 다시 다운로드할 수 없습니다
- 잃어버리면 새 키를 만들어야 합니다

### 5-5. JSON 파일 내용 확인
파일을 텍스트 에디터로 열어보면:
```json
{
  "type": "service_account",
  "project_id": "hasie-tracker-xxx",
  "private_key_id": "abcd1234...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n",
  "client_email": "hasie-tracker-backup@hasie-tracker-xxx.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

📋 **나중에 필요**: 이 JSON 파일 전체 내용

---

## 6단계: Google Sheets 생성 📊

### 6-1. Google Sheets 접속
```
https://sheets.google.com/
```
- 같은 Google 계정으로 로그인

### 6-2. 새 스프레드시트 만들기
1. **"빈 스프레드시트"** 클릭
2. 또는 **"+ 새로 만들기"** 버튼

### 6-3. 스프레드시트 이름 변경
1. 왼쪽 상단 "제목 없는 스프레드시트" 클릭
2. 새 이름 입력:
   ```
   하시에 순위 백업
   ```
   (또는 원하는 이름)

### 6-4. 스프레드시트 ID 복사
1. 브라우저 주소창의 URL 확인:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   ```

2. `/d/` 와 `/edit` 사이의 문자열이 **Spreadsheet ID**:
   ```
   1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   ```

3. 이 ID를 **복사해서 따로 저장**하세요 📋

---

## 7단계: Service Account와 공유 🤝

### 7-1. 공유 버튼 클릭
- Google Sheets 우측 상단의 **"공유"** 버튼 클릭

### 7-2. Service Account 이메일 추가
1. "사용자 또는 그룹 추가" 입력란에:
   ```
   hasie-tracker-backup@hasie-tracker-xxx.iam.gserviceaccount.com
   ```
   (5단계 JSON 파일의 `client_email` 값)

2. 권한 선택: **"편집자"** (기본값)
   - 드롭다운에서 "뷰어" 대신 "편집자" 선택

3. **알림 보내기 체크 해제** (선택사항)
   - 서비스 계정은 이메일을 받을 수 없으므로

4. **"보내기"** 또는 **"공유"** 버튼 클릭

✅ **확인**: 
- 공유 목록에 서비스 계정 이메일이 "편집자" 권한으로 표시됨
- 에러 없이 정상적으로 공유됨

---

## 8단계: 정보 정리 및 제공 📝

### 필요한 정보 2가지:

**① GOOGLE_SHEETS_ID**
```
예시: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```
- 6단계에서 복사한 ID

**② GOOGLE_SERVICE_ACCOUNT**
```json
{
  "type": "service_account",
  "project_id": "hasie-tracker-xxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "hasie-tracker-backup@....iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```
- 5단계에서 다운로드한 JSON 파일의 **전체 내용**

### 제공 방법:
이 두 정보를 저에게 제공해주시면:
1. Cloudflare Pages 환경 변수로 설정
2. 애플리케이션 재배포
3. 백업 기능 활성화 완료! ✅

---

## ✅ 체크리스트

설정 완료 확인:
- [ ] Google Cloud 프로젝트 생성됨
- [ ] Google Sheets API 활성화됨
- [ ] Service Account 생성됨
- [ ] JSON 키 파일 다운로드됨
- [ ] Google Sheets 생성됨
- [ ] Spreadsheet ID 복사됨
- [ ] Service Account와 Sheets 공유 완료됨
- [ ] 2가지 정보 준비됨

---

## 🆘 자주 묻는 질문 (FAQ)

### Q1: "프로젝트를 만들 수 없습니다" 에러
**A**: Google 계정이 조직 계정인 경우 권한이 제한될 수 있습니다.
- 개인 Gmail 계정으로 시도해보세요

### Q2: JSON 파일을 잃어버렸어요
**A**: 새 키를 만들면 됩니다.
1. Service Account 페이지로 돌아가기
2. "키" 탭에서 기존 키 삭제 (선택사항)
3. 새 JSON 키 만들기

### Q3: Service Account 이메일을 어디서 찾나요?
**A**: 
- JSON 파일의 `client_email` 필드
- 또는 Google Cloud Console → 사용자 인증 정보 → 서비스 계정 목록

### Q4: Sheets 공유가 안 돼요
**A**: 
- Service Account 이메일 주소를 정확히 복사했는지 확인
- `@` 앞뒤로 공백이 없는지 확인
- "편집자" 권한으로 설정했는지 확인

### Q5: 비용이 발생하나요?
**A**: 
- Google Sheets API는 무료입니다 (일일 할당량 내)
- 일반적인 백업 용도로는 무료 범위 충분

---

## 🎊 설정 완료!

모든 단계를 완료했다면:
1. **GOOGLE_SHEETS_ID** 준비 ✅
2. **GOOGLE_SERVICE_ACCOUNT** (JSON) 준비 ✅

이제 저에게 이 정보를 제공해주시면 바로 설정해드리겠습니다! 🚀
