import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flight Viewer',
  description: '항공권 필터링 뷰어',
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
