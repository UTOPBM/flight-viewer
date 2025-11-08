#!/bin/bash

# 웹훅 테스트 스크립트

echo "🚀 웹훅 광고 등록 테스트"
echo "========================"
echo ""

# 서버 URL 설정
if [ "$1" == "prod" ]; then
  URL="https://flight-viewer.pages.dev/api/webhook/ad-registration"
  echo "📍 프로덕션 서버: $URL"
else
  URL="http://localhost:3000/api/webhook/ad-registration"
  echo "📍 로컬 서버: $URL"
fi

echo ""

# 이미지 URL 입력
read -p "이미지 URL (엔터 = 테스트 이미지 사용): " IMAGE_URL
if [ -z "$IMAGE_URL" ]; then
  IMAGE_URL="https://picsum.photos/2560/224"
  echo "✅ 테스트 이미지 사용: $IMAGE_URL"
fi

echo ""
echo "🔄 광고 등록 중..."
echo ""

# 웹훅 호출
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"ad_title\": \"11월 8일 테스트 광고\",
    \"ad_description\": \"웹훅으로 자동 등록된 광고입니다\",
    \"ad_image_url\": \"$IMAGE_URL\",
    \"ad_link_url\": \"https://flight-viewer.pages.dev\",
    \"ad_position\": \"banner-bottom\",
    \"ad_priority\": 10,
    \"start_date\": \"2025-11-08T00:00:00\",
    \"end_date\": \"2025-11-08T23:59:59\"
  }"

echo ""
echo ""
echo "✅ 완료!"
echo ""
echo "📊 확인 방법:"
if [ "$1" == "prod" ]; then
  echo "1. https://flight-viewer.pages.dev 접속"
else
  echo "1. http://localhost:3000 접속"
fi
echo "2. 하단 배너에 광고가 표시되는지 확인"
echo "3. Admin 페이지에서 통계 확인"
echo ""
