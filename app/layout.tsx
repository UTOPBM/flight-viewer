import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://flight-viewer.pages.dev'),
  title: '우리들의 여행이 쉬워졌으면 좋겠어 - 최저가 항공권 검색',
  description: '일본, 유럽, 동남아 최저가 항공권을 한눈에! 월별 최저가 자동 업데이트. 직항/경유 필터링, 가격 비교로 쉽고 빠른 항공권 검색.',
  keywords: ['항공권', '최저가', '항공권 검색', '여행', '일본 항공권', '유럽 항공권', '동남아 항공권', '직항', '스카이스캐너', '항공권 비교'],
  authors: [{ name: 'Flight Viewer' }],
  creator: 'Flight Viewer',
  publisher: 'Flight Viewer',

  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://flight-viewer.pages.dev',
    siteName: '우리들의 여행이 쉬워졌으면 좋겠어',
    title: '우리들의 여행이 쉬워졌으면 좋겠어 - 최저가 항공권 검색',
    description: '일본, 유럽, 동남아 최저가 항공권을 한눈에! 월별 최저가 자동 업데이트',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '우리들의 여행이 쉬워졌으면 좋겠어',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: '우리들의 여행이 쉬워졌으면 좋겠어',
    description: '일본, 유럽, 동남아 최저가 항공권 검색',
    images: ['/og-image.jpg'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    // Google Search Console 등록 후 추가
    // google: 'your-verification-code',
    // Naver Search Advisor 등록 후 추가
    // naver: 'your-naver-verification-code',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-white dark:bg-gray-900 text-black dark:text-white">
        {children}
      </body>
    </html>
  )
}
