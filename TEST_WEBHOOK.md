# 웹훅 로컬 테스트 가이드

## 🧪 로컬 이미지로 웹훅 테스트하기

### 1단계: 개발 서버 실행

```bash
cd /Users/kimjaehyeon/flight-viewer
npm run dev
```

서버가 `http://localhost:3000`에서 실행됨

---

### 2단계: 이미지 업로드 (Admin 페이지 사용)

1. 브라우저에서 **Admin 페이지** 열기:
   ```
   http://localhost:3000/admin/ads
   ```

2. **"새 광고 등록"** 버튼 클릭

3. **이미지 업로드**:
   - "이미지 파일 선택" 클릭
   - 로컬 이미지 선택 (예: `/Users/kimjaehyeon/flight-viewer/...`)
   - 업로드 대기

4. **업로드된 이미지 URL 복사**:
   - 업로드가 완료되면 URL이 표시됨
   - 예: `https://xcdnbzyhfpphfkqjsesi.supabase.co/storage/v1/object/public/ad-images/1234567890.jpg`
   - 이 URL을 복사해둠

---

### 3단계: 웹훅 API 테스트 (curl 사용)

#### 방법 1: 업로드한 이미지로 테스트

새 터미널을 열고 다음 명령어 실행:

```bash
curl -X POST http://localhost:3000/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "ad_title": "11월 테스트 광고",
    "ad_description": "로컬에서 등록한 테스트 광고",
    "ad_image_url": "업로드한_이미지_URL을_여기에_붙여넣기",
    "ad_link_url": "https://example.com",
    "ad_position": "banner-bottom",
    "ad_priority": 10,
    "start_date": "2025-11-08T00:00:00",
    "end_date": "2025-11-08T23:59:59"
  }'
```

**중요**: `ad_image_url`에 2단계에서 복사한 URL을 넣으세요!

---

#### 방법 2: 온라인 테스트 이미지 사용 (빠른 테스트)

```bash
curl -X POST http://localhost:3000/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "ad_title": "11월 8일 하단 배너 테스트",
    "ad_description": "웹훅으로 등록한 테스트 광고",
    "ad_image_url": "https://picsum.photos/2560/224",
    "ad_link_url": "https://flight-viewer.pages.dev",
    "ad_position": "banner-bottom",
    "ad_priority": 10,
    "start_date": "2025-11-08T00:00:00",
    "end_date": "2025-11-08T23:59:59"
  }'
```

---

### 4단계: 결과 확인

#### 성공 응답 예시:

```json
{
  "success": true,
  "message": "Advertisement registered successfully",
  "ad_id": "550e8400-e29b-41d4-a716-446655440000",
  "ad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "11월 8일 하단 배너 테스트",
    "description": "웹훅으로 등록한 테스트 광고",
    "image_url": "https://picsum.photos/2560/224",
    "link_url": "https://flight-viewer.pages.dev",
    "position": "banner-bottom",
    "priority": 10,
    "start_date": "2025-11-08T00:00:00",
    "end_date": "2025-11-08T23:59:59",
    "is_active": true,
    "view_count": 0,
    "click_count": 0,
    "created_at": "2025-01-15T12:00:00Z"
  }
}
```

#### 실패 응답 예시:

```json
{
  "error": "Missing required fields",
  "required": ["ad_title", "ad_image_url", "ad_link_url", "ad_position"]
}
```

---

### 5단계: 웹사이트에서 광고 확인

1. 브라우저에서 홈페이지 열기:
   ```
   http://localhost:3000
   ```

2. **하단 배너**에 광고가 표시되는지 확인

3. 광고 클릭해보기 (클릭 수 카운트 테스트)

---

## 📊 Admin 페이지에서 확인

```
http://localhost:3000/admin/ads
```

- 등록된 광고 목록에서 새 광고 확인
- 노출 수, 클릭 수 확인
- 게재 기간 확인 (2025-11-08)

---

## 🔍 Supabase에서 직접 확인 (선택사항)

Supabase 대시보드에서 확인:

1. https://supabase.com/dashboard 접속
2. **Table Editor** → `advertisements` 테이블
3. 방금 등록한 광고 확인

SQL 쿼리:
```sql
SELECT * FROM advertisements
WHERE position = 'banner-bottom'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🚀 프로덕션 테스트 (배포 후)

로컬 테스트가 성공하면, 프로덕션에서도 테스트:

```bash
curl -X POST https://flight-viewer.pages.dev/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "ad_title": "프로덕션 테스트 광고",
    "ad_image_url": "https://picsum.photos/2560/224",
    "ad_link_url": "https://example.com",
    "ad_position": "banner-top",
    "ad_priority": 5,
    "start_date": "2025-11-08T00:00:00",
    "end_date": "2025-11-30T23:59:59"
  }'
```

---

## 💡 팁

### 날짜 형식
- **ISO 8601 형식** 사용: `YYYY-MM-DDTHH:MM:SS`
- 예: `2025-11-08T00:00:00` (11월 8일 자정)
- 예: `2025-11-08T23:59:59` (11월 8일 23시 59분 59초)

### 무제한 게재
시작일/종료일을 생략하면 무제한 게재:
```json
{
  "ad_title": "상시 광고",
  "ad_image_url": "https://...",
  "ad_link_url": "https://...",
  "ad_position": "banner-top"
  // start_date, end_date 생략
}
```

### 광고 위치
- `banner-top`: 상단 배너
- `banner-bottom`: 하단 배너
- `sidebar`: 사이드바 (미구현)

---

## ❌ 문제 해결

### 1. "SUPABASE_SERVICE_ROLE_KEY is not defined"
`.env.local` 파일에 다음 추가:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. "Failed to create advertisement"
- Supabase 연결 확인
- `advertisements` 테이블 존재 확인
- RLS 정책 확인

### 3. curl 명령어가 작동하지 않음
- 개발 서버 실행 여부 확인 (`npm run dev`)
- JSON 형식 검증 (따옴표, 쉼표 확인)
- 다른 터미널에서 실행

### 4. 광고가 표시되지 않음
- 날짜 확인 (start_date <= 현재 <= end_date)
- `is_active: true` 확인
- 브라우저 캐시 삭제 후 새로고침
