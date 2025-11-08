import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 (Service Role Key 사용 - RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 환경변수에 추가 필요
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface WebhookPayload {
  // 결제 시스템에서 받을 데이터 형식 (나중에 실제 웹훅 형식에 맞춰 수정)
  order_id?: string
  customer_email?: string
  customer_name?: string

  // 광고 정보
  ad_title: string
  ad_description?: string
  ad_image_url: string
  ad_link_url: string
  ad_position: 'banner-top' | 'banner-bottom' | 'sidebar'
  ad_priority?: number
  start_date?: string  // ISO 8601 형식 (예: 2025-01-01T00:00:00)
  end_date?: string    // ISO 8601 형식

  // 보안 검증용 (나중에 결제 시스템 연동 시 사용)
  webhook_secret?: string
}

/**
 * POST /api/webhook/ad-registration
 *
 * 결제 완료 시 웹훅으로 광고를 자동 등록하는 API
 *
 * 사용 방법:
 * 1. 테스트: curl로 직접 호출 (아래 예시 참고)
 * 2. 운영: 결제 시스템 웹훅 URL로 이 엔드포인트 등록
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()

    // 1. 보안 검증 (나중에 활성화)
    // const webhookSecret = process.env.WEBHOOK_SECRET
    // if (payload.webhook_secret !== webhookSecret) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized: Invalid webhook secret' },
    //     { status: 401 }
    //   )
    // }

    // 2. 필수 필드 검증
    if (!payload.ad_title || !payload.ad_image_url || !payload.ad_link_url || !payload.ad_position) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['ad_title', 'ad_image_url', 'ad_link_url', 'ad_position']
        },
        { status: 400 }
      )
    }

    // 3. position 값 검증
    const validPositions = ['banner-top', 'banner-bottom', 'sidebar']
    if (!validPositions.includes(payload.ad_position)) {
      return NextResponse.json(
        {
          error: 'Invalid ad_position',
          allowed: validPositions
        },
        { status: 400 }
      )
    }

    // 4. 날짜 형식 검증 (있는 경우)
    if (payload.start_date && isNaN(Date.parse(payload.start_date))) {
      return NextResponse.json(
        { error: 'Invalid start_date format. Use ISO 8601 (e.g., 2025-01-01T00:00:00)' },
        { status: 400 }
      )
    }

    if (payload.end_date && isNaN(Date.parse(payload.end_date))) {
      return NextResponse.json(
        { error: 'Invalid end_date format. Use ISO 8601 (e.g., 2025-01-31T23:59:59)' },
        { status: 400 }
      )
    }

    // 5. 광고 DB에 삽입
    const { data, error } = await supabaseAdmin
      .from('advertisements')
      .insert({
        title: payload.ad_title,
        description: payload.ad_description || null,
        image_url: payload.ad_image_url,
        link_url: payload.ad_link_url,
        position: payload.ad_position,
        priority: payload.ad_priority || 0,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        is_active: true,
        view_count: 0,
        click_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to insert ad:', error)
      return NextResponse.json(
        { error: 'Failed to create advertisement', details: error.message },
        { status: 500 }
      )
    }

    // 6. 성공 응답
    return NextResponse.json({
      success: true,
      message: 'Advertisement registered successfully',
      ad_id: data.id,
      ad: data
    }, { status: 201 })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhook/ad-registration
 *
 * API 상태 확인용 (웹훅이 정상 작동하는지 확인)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Ad Registration Webhook API is running',
    endpoint: '/api/webhook/ad-registration',
    method: 'POST',
    docs: 'See comments in route.ts for usage examples'
  })
}
