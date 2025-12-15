'use client'

import { useEffect, useState, Suspense } from 'react'
import FlightTable from '@/components/FlightTable'
import AdBanner from '@/components/AdBanner'
import FlightHeader from '@/components/FlightHeader'

export default function HomeClient() {
    const [darkMode, setDarkMode] = useState(false)

    // 초기 로드 시 localStorage에서 다크모드 설정 불러오기
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode')
        if (savedDarkMode) {
            setDarkMode(savedDarkMode === 'true')
        }
    }, [])

    // 다크모드 변경 시 localStorage 저장 및 DOM 업데이트
    useEffect(() => {
        localStorage.setItem('darkMode', darkMode.toString())
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-between gap-2">
                    <FlightHeader />
                    <div className="flex gap-2">
                        <a
                            href="/ad"
                            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm sm:px-4 sm:text-base hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                            🚀 광고
                        </a>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm sm:px-4 sm:text-base hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>

                {/* 상단 광고 */}
                <AdBanner position="banner-top" className="mb-6" />

                <Suspense fallback={<div className="flex items-center justify-center p-12 text-lg">항공권 데이터 로딩중...</div>}>
                    <FlightTable />
                </Suspense>

                {/* 하단 광고 */}
                <AdBanner position="banner-bottom" className="mt-6" />
            </div>
        </div>
    )
}
