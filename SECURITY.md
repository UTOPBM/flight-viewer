# 보안 가이드

## 🔐 Supabase Auth 보안

### 현재 상태:

Admin 페이지는 **Supabase Auth**로 보호됩니다.

### ✅ 권장 보안 설정:

1. **Supabase 대시보드** 접속: https://supabase.com/dashboard
2. **Authentication** → **Providers** 이동
3. **Email** 클릭
4. **"Enable email signup"** → **OFF** (비활성화)
5. 저장

### 왜 비활성화해야 하나요?

- ✅ **활성화 OFF**: 너만 admin으로 접근 가능 (안전)
- ⚠️ **활성화 ON**: 누구나 회원가입 가능 (위험!)

### 새 Admin 추가 방법:

회원가입이 비활성화되어 있으면, Supabase 대시보드에서 수동으로 추가:

1. **Authentication** → **Users** 탭
2. **"Add user"** 클릭
3. 이메일, 비밀번호 입력
4. 저장

---

## 🔒 웹훅 보안

### 현재 보안 상태: ✅ 활성화

웹훅 API는 **시크릿 키**로 보호됩니다.

### 시크릿 키:

```
9cd1eca1b84cd9d8d21925f7d6c7091d8c98cc4bf2a682108451c077bc83d43f
```

⚠️ **절대 공개 금지!** 이 키는:
- GitHub에 커밋하지 마세요 (`.env.local`은 `.gitignore`에 포함됨)
- 브라우저 코드에 포함하지 마세요
- 결제 시스템 관리자에게만 전달하세요

### 웹훅 호출 방법:

```bash
curl -X POST https://flight-viewer.pages.dev/api/webhook/ad-registration \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_secret": "9cd1eca1b84cd9d8d21925f7d6c7091d8c98cc4bf2a682108451c077bc83d43f",
    "ad_title": "광고 제목",
    "ad_image_url": "https://...",
    "ad_link_url": "https://...",
    "ad_position": "banner-top"
  }'
```

### 시크릿 없이 호출하면?

```json
{
  "error": "Unauthorized: Invalid webhook secret"
}
```

❌ 광고가 등록되지 않습니다.

---

## 🌐 Cloudflare Pages 환경변수

### 필수 환경변수:

| 변수명 | 설명 | 공개 여부 | 예시 |
|--------|------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | ✅ 공개 | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ 공개 | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | ❌ 서버 전용 | `eyJhbG...` |
| `WEBHOOK_SECRET` | 웹훅 시크릿 키 | ❌ 서버 전용 | `9cd1eca1...` |
| `ADMIN_PASSWORD` | Admin 비밀번호 (미사용) | ❌ 서버 전용 | `carrot970405*` |

### ⚠️ 주의사항:

**절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요:**

- ❌ `NEXT_PUBLIC_WEBHOOK_SECRET` → 브라우저에 노출됨!
- ✅ `WEBHOOK_SECRET` → 서버 전용

### Cloudflare Pages 설정 방법:

1. https://dash.cloudflare.com 접속
2. **flight-viewer** 프로젝트 선택
3. **Settings** → **Environment variables**
4. **Production**과 **Preview** 모두에 추가:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   WEBHOOK_SECRET=9cd1eca1b84cd9d8d21925f7d6c7091d8c98cc4bf2a682108451c077bc83d43f
   ```

---

## 🛡️ RLS (Row Level Security)

Supabase 테이블은 **RLS**로 보호됩니다.

### 현재 설정:

- **`advertisements` 테이블**:
  - 읽기: 모두 허용 (공개 광고)
  - 쓰기/수정/삭제: 인증된 사용자만 (Admin)

- **`ad-images` Storage 버킷**:
  - 읽기: 모두 허용 (공개 이미지)
  - 업로드/수정/삭제: 인증된 사용자만 (Admin)

### RLS 정책 확인:

Supabase 대시보드:
1. **Database** → **Policies**
2. `advertisements` 테이블 정책 확인

---

## 📊 보안 체크리스트

### 배포 전 확인:

- [ ] Supabase Auth 회원가입 비활성화
- [ ] `NEXT_PUBLIC_ADMIN_PASSWORD` 삭제 (Cloudflare Pages)
- [ ] `WEBHOOK_SECRET` 환경변수 등록 (Cloudflare Pages)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경변수 등록 (Cloudflare Pages)
- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] GitHub에 시크릿 키가 커밋되지 않았는지 확인

### 정기 점검 (월 1회):

- [ ] Supabase Users 목록 확인 (불필요한 계정 삭제)
- [ ] 웹훅 로그 확인 (이상한 호출 없는지)
- [ ] RLS 정책 확인 (변경사항 없는지)

---

## 🚨 보안 사고 발생 시:

### 시크릿 키가 노출된 경우:

1. **즉시 새 시크릿 키 생성**:
   ```bash
   openssl rand -hex 32
   ```

2. **`.env.local` 업데이트**:
   ```
   WEBHOOK_SECRET=새로운키
   ```

3. **Cloudflare Pages 환경변수 업데이트**

4. **결제 시스템에 새 키 전달**

5. **API 코드 재배포** (Cloudflare Pages 자동 배포)

---

## 💡 추가 보안 권장사항:

### 1. IP 화이트리스트 (선택사항)

결제 시스템의 IP만 허용:

```typescript
// app/api/webhook/ad-registration/route.ts
const allowedIPs = ['1.2.3.4', '5.6.7.8'] // 결제 시스템 IP
const clientIP = request.headers.get('x-forwarded-for')

if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP || '')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 2. Rate Limiting (선택사항)

Cloudflare Pages는 기본적으로 rate limiting을 제공합니다.

추가 설정:
- Cloudflare 대시보드 → **Security** → **Rate Limiting**

### 3. 로그 모니터링

웹훅 호출 로그를 정기적으로 확인:
- Cloudflare Pages → **Functions** → **Real-time Logs**

---

## 📞 문의

보안 관련 문의사항이 있으면 GitHub Issues에 등록하세요.

**절대 시크릿 키를 공개 이슈에 포함하지 마세요!**
