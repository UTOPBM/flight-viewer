import { NextRequest, NextResponse } from 'next/server'

// Next.js static export 모드에서 API Routes 사용 설정
export const dynamic = 'force-static'

/**
 * POST /api/auth/verify
 *
 * Admin 비밀번호 검증 API (서버 사이드)
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // 환경변수에서 비밀번호 가져오기 (서버 전용)
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // 비밀번호 검증
    if (password === adminPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
