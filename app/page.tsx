'use client'

import { useEffect, useState } from 'react'
import FlightTable from '@/components/FlightTable'

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
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
