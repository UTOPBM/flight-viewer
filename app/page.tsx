'use client'

import { useEffect, useState } from 'react'
import FlightTable from '@/components/FlightTable'

export default function HomePage() {
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">✈️ 항공권 최저가 모음</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? '☀️ 라이트' : '🌙 다크'}
          </button>
        </div>
        <FlightTable />
      </div>
    </div>
  )
}
