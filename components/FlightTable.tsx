'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flight, Region, AirportMapping } from '@/lib/types'

export default function FlightTable() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([])
  const [airportMappings, setAirportMappings] = useState<Record<string, AirportMapping>>({})
  const [selectedFlights, setSelectedFlights] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [region, setRegion] = useState<Region>('all')
  const [month, setMonth] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [copyNotification, setCopyNotification] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterAndSortFlights()
  }, [flights, region, month, sortOrder])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 항공권 데이터 가져오기
      const { data: flightsData, error: flightsError } = await supabase
        .from('filtered_flights')
        .select('*')
        .eq('is_monthly_cheapest', true)

      if (flightsError) throw flightsError

      // 공항 매핑 데이터 가져오기
      const { data: airportsData, error: airportsError } = await supabase
        .from('airport_regions')
        .select('airport_code, city, country')

      if (airportsError) throw airportsError

      // 공항 코드 → 도시명 매핑 객체 생성
      const mappings: Record<string, AirportMapping> = {}
      airportsData?.forEach((airport) => {
        mappings[airport.airport_code] = airport
      })

      setFlights(flightsData || [])
      setAirportMappings(mappings)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortFlights = () => {
    let filtered = [...flights]

    if (region !== 'all') {
      filtered = filtered.filter((f) => f.region === region)
    }

    if (month !== 'all') {
      filtered = filtered.filter((f) => f.departure_month === month)
    }

    filtered.sort((a, b) => {
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price
    })

    setFilteredFlights(filtered)
  }

  const getUniqueMonths = () => {
    const months = [...new Set(flights.map((f) => f.departure_month))]
    return months.sort()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const getCityName = (airportCode: string): string => {
    return airportMappings[airportCode]?.city || airportCode
  }

  const getSkyscannerUrl = (flight: Flight) => {
    const depDate = flight.outbound_date.replace(/-/g, '').slice(2)
    const retDate = flight.inbound_date.replace(/-/g, '').slice(2)
    const origin = flight.outbound_departure_airport.toLowerCase()
    const destination = flight.outbound_arrival_airport.toLowerCase()
    return `https://www.skyscanner.co.kr/transport/flights/${origin}/${destination}/${depDate}/${retDate}`
  }

  const toggleFlightSelection = (flightId: number) => {
    const newSelection = new Set(selectedFlights)
    if (newSelection.has(flightId)) {
      newSelection.delete(flightId)
    } else {
      newSelection.add(flightId)
    }
    setSelectedFlights(newSelection)
  }

  const copySelectedToClipboard = () => {
    if (selectedFlights.size === 0) {
      setCopyNotification('선택된 항공권이 없습니다.')
      setTimeout(() => setCopyNotification(null), 2000)
      return
    }

    // 선택된 항공편 가져오기
    const selected = flights.filter((f) => selectedFlights.has(f.id))

    // 가격순으로 정렬
    selected.sort((a, b) => a.price - b.price)

    // 클립보드 텍스트 생성
    const lines = selected.map((flight) => {
      const origin = getCityName(flight.outbound_departure_airport)
      const destination = getCityName(flight.outbound_arrival_airport)
      return `${origin} → ${destination} | ${formatDate(flight.outbound_date)}-${formatDate(flight.inbound_date)} (${flight.trip_nights}박) | ${flight.formatted_price} | ${flight.outbound_carrier} | ${flight.is_direct ? '직항' : '경유'}`
    })

    const text = lines.join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopyNotification(`${selectedFlights.size}개 항공권이 클립보드에 복사되었습니다!`)
      setTimeout(() => setCopyNotification(null), 2000)
    }).catch((err) => {
      console.error('복사 실패:', err)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-lg">항공권 데이터 로딩중...</div>
      </div>
    )
  }

  return (
    <div>
      {copyNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {copyNotification}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
        <div>
          <label className="mb-2 block text-sm font-medium">지역</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2"
          >
            <option value="all">전체</option>
            <option value="동북아">동북아</option>
            <option value="동남아">동남아</option>
            <option value="유럽미주">유럽미주</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">출발월</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2"
          >
            <option value="all">전체</option>
            {getUniqueMonths().map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">가격 정렬</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2"
          >
            <option value="asc">낮은 순</option>
            <option value="desc">높은 순</option>
          </select>
        </div>

        <div className="flex items-end gap-3">
          <div className="text-sm">
            총 <span className="font-bold text-blue-600 dark:text-blue-400">{filteredFlights.length}</span>개 항공권
            {selectedFlights.size > 0 && (
              <span className="ml-2">
                | 선택 <span className="font-bold text-green-600 dark:text-green-400">{selectedFlights.size}</span>개
              </span>
            )}
          </div>
          {selectedFlights.size > 0 && (
            <button
              onClick={copySelectedToClipboard}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 transition-colors"
            >
              📋 선택 항목 복사
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-800 shadow">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">선택</th>
              <th className="px-4 py-3 text-left text-sm font-medium">지역</th>
              <th className="px-4 py-3 text-left text-sm font-medium">경로</th>
              <th className="px-4 py-3 text-left text-sm font-medium">날짜</th>
              <th className="px-4 py-3 text-left text-sm font-medium">박수</th>
              <th className="px-4 py-3 text-left text-sm font-medium">항공사</th>
              <th className="px-4 py-3 text-left text-sm font-medium">직항</th>
              <th className="px-4 py-3 text-left text-sm font-medium">가격</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredFlights.map((flight) => {
              const isSelected = selectedFlights.has(flight.id)
              return (
                <tr
                  key={flight.id}
                  onClick={() => toggleFlightSelection(flight.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <td className="px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{flight.region}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{getCityName(flight.outbound_departure_airport)} → {getCityName(flight.outbound_arrival_airport)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {flight.outbound_departure_airport} → {flight.outbound_arrival_airport}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(flight.outbound_date)} - {formatDate(flight.inbound_date)}
                  </td>
                  <td className="px-4 py-3 text-sm">{flight.trip_nights}박</td>
                  <td className="px-4 py-3 text-sm">{flight.outbound_carrier}</td>
                  <td className="px-4 py-3 text-sm">
                    {flight.is_direct ? '✅' : '❌'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <a
                      href={getSkyscannerUrl(flight)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {flight.formatted_price}
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredFlights.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            필터 조건에 맞는 항공권이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
