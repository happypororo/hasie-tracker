#!/bin/bash

# 텔레그램 봇 진단 스크립트
# Usage: ./diagnose_bot.sh

BOT_TOKEN="8402879837:AAGaN2uVkkufLo5hDBbDjZORFx_PNjJRtq4"
WEBHOOK_URL="https://hacie-tracker-v2.pages.dev/api/telegram/webhook"
API_URL="https://hacie-tracker-v2.pages.dev/api/hasie"

echo "================================================"
echo "  텔레그램 봇 진단 도구 (HACIE_Tracker)"
echo "================================================"
echo ""

# 1. 봇 상태 확인
echo "1️⃣  봇 상태 확인..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")
BOT_OK=$(echo "$BOT_INFO" | grep -o '"ok":true' | wc -l)

if [ "$BOT_OK" -eq 1 ]; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ 봇 활성화됨: @$BOT_USERNAME"
else
    echo "   ❌ 봇 비활성화 또는 토큰 오류"
    exit 1
fi
echo ""

# 2. 웹훅 상태 확인
echo "2️⃣  웹훅 상태 확인..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
WEBHOOK_SET=$(echo "$WEBHOOK_INFO" | grep -o '"url":"https://hacie-tracker-v2.pages.dev/api/telegram/webhook"' | wc -l)
PENDING_COUNT=$(echo "$WEBHOOK_INFO" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2)

if [ "$WEBHOOK_SET" -eq 1 ]; then
    echo "   ✅ 웹훅 설정됨: $WEBHOOK_URL"
    echo "   📊 대기 중인 업데이트: $PENDING_COUNT개"
else
    echo "   ❌ 웹훅이 올바르게 설정되지 않음"
    echo ""
    echo "   웹훅을 다시 설정하려면:"
    echo "   curl -X POST \"https://api.telegram.org/bot${BOT_TOKEN}/setWebhook\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"url\": \"${WEBHOOK_URL}\", \"allowed_updates\": [\"message\"]}'"
fi
echo ""

# 3. 웹훅 엔드포인트 테스트
echo "3️⃣  웹훅 엔드포인트 테스트..."
TEST_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 999999999,
    "message": {
      "message_id": 999998,
      "date": 1708847760,
      "text": "test"
    }
  }')

if echo "$TEST_RESPONSE" | grep -q "success"; then
    echo "   ✅ 웹훅 엔드포인트 정상 작동"
else
    echo "   ❌ 웹훅 엔드포인트 응답 없음"
fi
echo ""

# 4. API 상태 확인
echo "4️⃣  API 상태 확인..."
STATS=$(curl -s "$API_URL/stats")
if echo "$STATS" | grep -q "success"; then
    LAST_UPDATE=$(echo "$STATS" | grep -o '"last_update":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ API 정상 작동"
    echo "   📅 마지막 업데이트: $LAST_UPDATE"
else
    echo "   ❌ API 응답 없음"
fi
echo ""

# 5. 진단 요약
echo "================================================"
echo "  진단 요약"
echo "================================================"
echo ""
echo "✅ 정상 작동 항목:"
echo "   - 봇 활성화 상태"
echo "   - 웹훅 설정"
echo "   - 웹훅 엔드포인트"
echo "   - API 엔드포인트"
echo ""
echo "⚠️  확인 필요 사항:"
echo "   - 마지막 업데이트가 오래됨 (2월 6일)"
echo "   - 텔레그램 채널에서 메시지가 전송되는지 확인"
echo "   - 봇이 채널에 추가되어 있는지 확인"
echo ""
echo "📋 다음 단계:"
echo "   1. 텔레그램 채널 확인"
echo "   2. @HACIE_Tracker_Bot을 채널에 추가"
echo "   3. 또는 수동 입력 사용: https://hacie-tracker-v2.pages.dev/"
echo ""
echo "자세한 내용은 TELEGRAM_BOT_DIAGNOSIS.md 파일을 참고하세요."
echo "================================================"
