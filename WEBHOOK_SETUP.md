# 웹훅 광고 자동 등록 API 가이드

## 🎯 개요

결제 시스템(예: latpeed.com)에서 광고 결제가 완료되면, 웹훅을 통해 자동으로 광고를 등록하는 시스템입니다.

---

## 📡 API 엔드포인트

### 프로덕션
```
POST https://flight-viewer.pages.dev/api/webhook/ad-registration
```

### 로컬 테스트
```
POST http://localhost:3000/api/webhook/ad-registration
```

---

## 🔧 Cloudflare Pages 환경변수 설정

Cloudflare Pages 대시보드에서 다음 환경변수를 추가해야 합니다:

1. Cloudflare Pages 대시보드 접속: https://dash.cloudflare.com
2. **flight-viewer** 프로젝트 선택
3. **Settings** → **Environment variables** 이동
4. 다음 변수들을 **Production**과 **Preview** 모두에 추가:

```bash
# 필수 환경변수
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZG5ienloZnBwaGZrcWpzZXNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI5ODE0OCwiZXhwIjoyMDc0ODc0MTQ4fQ.mM_b9ILLO2BiZLwMyYMr8zUl5eHZvLW9VQ5PvTntwE0

# 선택 (나중에 웹훅 보안 활성화 시)
WEBHOOK_SECRET=your-random-secret-key-here
```

> ⚠️ **중요**: `NEXT_PUBLIC_` 접두사를 **절대 붙이지 마세요**. 브라우저에 노출됩니다!

5. 저장 후 **Redeploy** 클릭

---

## 📋 요청 형식

### HTTP 헤더
```
Content-Type: application/json
```

### Request Body (JSON)

```json
{
  // 필수 항목
  "ad_title": "최저가 항공권 검색!",
  "ad_image_url": "https://example.com/ad-image.jpg",
  "ad_link_url": "https://example.com",
  "ad_position": "banner-top",

  // 선택 항목
  "ad_description": "지금 바로 확인하세요",
  "ad_priority": 10,
  "start_date": "2025-02-01T00:00:00",
  "end_date": "2025-02-28T23:59:59",

  // 결제 정보 (선택, 기록용)
  "order_id": "ORDER-12345",
  "customer_email": "customer@example.com",
  "customer_name": "홍길동"
}
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `ad_title` | string | ✅ | 광고 제목 (최대 50자) |
| `ad_image_url` | string | ✅ | 광고 이미지 URL (권장: 2560×224px) |
| `ad_link_url` | string | ✅ | 클릭 시 이동할 URL |
| `ad_position` | string | ✅ | `banner-top`, `banner-bottom`, `sidebar` 중 하나 |
| `ad_description` | string | ❌ | 광고 설명 (최대 100자) |
| `ad_priority` | number | ❌ | 우선순위 (높을수록 먼저 표시, 기본값: 0) |
| `start_date` | string | ❌ | 게재 시작일 (ISO 8601, 예: `2025-02-01T00:00:00`) |
| `end_date` | string | ❌ | 게재 종료일 (ISO 8601, 예: `2025-02-28T23:59:59`) |
| `order_id` | string | ❌ | 주문 번호 (기록용) |
| `customer_email` | string | ❌ | 고객 이메일 (기록용) |
| `customer_name` | string | ❌ | 고객 이름 (기록용) |

---

## ✅ 응답 형식

### 성공 (201 Created)

```json
{
  "success": true,
  "message": "Advertisement registered successfully",
  "ad_id": "550e8400-e29b-41d4-a716-446655440000",
  "ad": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "최저가 항공권 검색!",
    "image_url": "https://example.com/ad-image.jpg",
    "link_url": "https://example.com",
    "position": "banner-top",
    "priority": 10,
    "is_active": true,
    "view_count": 0,
    "click_count": 0,
    "start_date": "2025-02-01T00:00:00",
    "end_date": "2025-02-28T23:59:59",
    "created_at": "2025-01-15T12:00:00Z"
  }
}
```

### 실패

#### 400 Bad Request - 필수 필드 누락
```json
{
  "error": "Missing required fields",
  "required": ["ad_title", "ad_image_url", "ad_link_url", "ad_position"]
}
```

#### 400 Bad Request - 잘못된 position 값
```json
{
  "error": "Invalid ad_position",
  "allowed": ["banner-top", "banner-bottom", "sidebar"]
}
```

#### 400 Bad Request - 잘못된 날짜 형식
```json
{
  "error": "Invalid start_date format. Use ISO 8601 (e.g., 2025-01-01T00:00:00)"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to create advertisement",
  "details": "error message here"
}
```

---

## 🧪 테스트 방법

### 1. API 상태 확인 (GET)

```bash
curl https://flight-viewer.pages.dev/api/webhook/ad-registration
```

**예상 응답:**
```json
{
  "status": "ok",
  "message": "Ad Registration Webhook API is running",
  "endpoint": "/api/webhook/ad-registration",
  "method": "POST",
  "docs": "See comments in route.ts for usage examples"
}
```

---

### 2. 광고 등록 테스트 (POST)

#### 기본 광고 등록 (날짜 무제한)

```bash
curl -X POST https://flight-viewer.pages.dev/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "ad_title": "테스트 광고",
    "ad_image_url": "https://picsum.photos/2560/224",
    "ad_link_url": "https://example.com",
    "ad_position": "banner-top",
    "ad_description": "curl로 등록한 테스트 광고입니다",
    "ad_priority": 5
  }'
```

---

#### 기간 한정 광고 등록

```bash
curl -X POST https://flight-viewer.pages.dev/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "ad_title": "2월 한정 특가!",
    "ad_image_url": "https://picsum.photos/2560/224",
    "ad_link_url": "https://example.com/february-sale",
    "ad_position": "banner-bottom",
    "ad_description": "2월 한정 특가 광고",
    "ad_priority": 10,
    "start_date": "2025-02-01T00:00:00",
    "end_date": "2025-02-28T23:59:59",
    "order_id": "TEST-001",
    "customer_email": "test@example.com"
  }'
```

---

#### 로컬 테스트 (개발 중)

```bash
# 먼저 로컬 서버 실행
npm run dev

# 다른 터미널에서 테스트
curl -X POST http://localhost:3000/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "ad_title": "로컬 테스트 광고",
    "ad_image_url": "https://picsum.photos/2560/224",
    "ad_link_url": "https://example.com",
    "ad_position": "banner-top"
  }'
```

---

## 🔒 보안 (활성화됨!)

웹훅 보안이 **활성화**되어 있습니다. 올바른 시크릿 키 없이는 광고를 등록할 수 없습니다.

### 현재 보안 설정:

**시크릿 키**: `9cd1eca1b84cd9d8d21925f7d6c7091d8c98cc4bf2a682108451c077bc83d43f`

⚠️ **주의**: 이 키는 절대 공개하지 마세요! 결제 시스템 설정에만 사용하세요.

### 웹훅 호출 시 필수 항목:

```json
{
  "webhook_secret": "9cd1eca1b84cd9d8d21925f7d6c7091d8c98cc4bf2a682108451c077bc83d43f",
  "ad_title": "광고 제목",
  "ad_image_url": "https://...",
  "ad_link_url": "https://...",
  "ad_position": "banner-top"
}
```

### Cloudflare Pages 환경변수 설정:

1. Cloudflare Pages 대시보드
2. **Settings** → **Environment variables**
3. **Production**과 **Preview** 모두에 추가:
   ```
   WEBHOOK_SECRET=9cd1eca1b84cd9d8d21925f7d6c7091d8c98cc4bf2a682108451c077bc83d43f
   ```

---

## 🔗 결제 시스템 연동 (latpeed.com 예시)

### 1. latpeed.com 대시보드 설정

1. **웹훅 URL 등록**:
   ```
   https://flight-viewer.pages.dev/api/webhook/ad-registration
   ```

2. **웹훅 페이로드 매핑** (결제 시스템 → 우리 API):

   | latpeed 필드 | 우리 API 필드 | 비고 |
   |-------------|--------------|------|
   | `product_name` | `ad_title` | 상품명 → 광고 제목 |
   | `product_image` | `ad_image_url` | 상품 이미지 → 광고 이미지 |
   | `product_url` | `ad_link_url` | 상품 URL → 광고 링크 |
   | `custom_field_1` | `ad_position` | 커스텀 필드 활용 |
   | `custom_field_2` | `start_date` | 커스텀 필드 활용 |
   | `custom_field_3` | `end_date` | 커스텀 필드 활용 |
   | `order_id` | `order_id` | 주문 번호 |
   | `customer_email` | `customer_email` | 고객 이메일 |

3. **웹훅 트리거**: 결제 완료 시

---

### 2. 웹훅 페이로드 변환 (필요 시)

결제 시스템이 우리 형식과 다르면, 중간에 **변환 로직**이 필요할 수 있습니다.

**옵션 A**: latpeed.com에서 직접 우리 형식으로 전송 (이상적)

**옵션 B**: 우리가 변환 로직 추가 (route.ts 수정)

---

## 📊 모니터링

### 웹훅 로그 확인

Cloudflare Pages 대시보드:
1. **Functions** 탭
2. **Real-time Logs** 확인

### Supabase에서 광고 확인

```sql
-- 최근 등록된 광고 확인
SELECT * FROM advertisements
ORDER BY created_at DESC
LIMIT 10;

-- 웹훅으로 등록된 광고만 확인 (order_id가 있는 경우)
SELECT * FROM advertisements
WHERE order_id IS NOT NULL
ORDER BY created_at DESC;
```

---

## ❓ FAQ

**Q. 웹훅이 실패하면 어떻게 되나요?**
A. 대부분의 결제 시스템은 실패 시 자동으로 재시도합니다. latpeed.com 설정을 확인하세요.

**Q. 광고가 바로 표시되나요?**
A. 네, `is_active: true`로 등록되므로 즉시 표시됩니다. 날짜 설정이 있으면 해당 기간에만 표시됩니다.

**Q. 같은 광고를 중복 등록하면?**
A. 현재는 중복 체크 없이 새 광고로 등록됩니다. 필요하면 중복 체크 로직을 추가할 수 있습니다.

**Q. 광고 이미지는 어디에 호스팅하나요?**
A. 고객이 이미지를 업로드하면, Supabase Storage에 저장하고 URL을 웹훅으로 전달합니다.

---

## 🚀 다음 단계

1. ✅ API 엔드포인트 생성 (완료)
2. ✅ 테스트용 curl 명령어 작성 (완료)
3. ⬜ Cloudflare Pages 환경변수 설정 (필요)
4. ⬜ latpeed.com 웹훅 설정 (결제 시스템 구매 후)
5. ⬜ 웹훅 보안 활성화 (`WEBHOOK_SECRET`)
6. ⬜ 고객용 광고 업로드 폼 제작 (이미지 → Supabase Storage)
7. ⬜ 운영 모니터링 및 로그 분석

---

## 📞 문의

기술적 이슈나 추가 기능이 필요하면 개발자에게 연락하세요.
