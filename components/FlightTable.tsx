'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flight, Region, AirportMapping } from '@/lib/types'

type QuickFilter = 'all' | 'japan' | 'europe' | 'southeast'

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
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterAndSortFlights()
  }, [flights, region, month, sortOrder, searchQuery, quickFilter])

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

    // 지역 필터
    if (region !== 'all') {
      filtered = filtered.filter((f) => f.region === region)
    }

    // 빠른 필터 (일본/유럽·미주/동남아)
    if (quickFilter === 'japan') {
      // airport_regions 테이블의 country 정보를 사용
      filtered = filtered.filter((f) => {
        const country = airportMappings[f.outbound_arrival_airport]?.country
        return country === '일본'
      })
    } else if (quickFilter === 'europe') {
      filtered = filtered.filter((f) => f.region === '유럽미주')
    } else if (quickFilter === 'southeast') {
      filtered = filtered.filter((f) => f.region === '동남아')
    }

    // 월 필터
    if (month !== 'all') {
      filtered = filtered.filter((f) => f.departure_month === month)
    }

    // 목적지 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((f) => {
        const cityName = getCityName(f.outbound_arrival_airport).toLowerCase()
        const airportCode = f.outbound_arrival_airport.toLowerCase()
        const country = airportMappings[f.outbound_arrival_airport]?.country?.toLowerCase() || ''

        return cityName.includes(query) || airportCode.includes(query) || country.includes(query)
      })
    }

    // 가격순 정렬
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

  const getDayOfWeek = (dateStr: string): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const date = new Date(dateStr)
    return days[date.getDay()]
  }

  const formatDateWithDay = (dateStr: string) => {
    return `${formatDate(dateStr)}(${getDayOfWeek(dateStr)})`
  }

  // 가격 100원 단위로 반올림
  const formatPrice = (price: number) => {
    const rounded = Math.round(price / 100) * 100
    return rounded.toLocaleString() + '원'
  }

  const getDestinationCount = (flight: Flight): number => {
    if (!selectedFlights.has(flight.id)) return 0

    const selected = flights.filter((f) => selectedFlights.has(f.id))
    return selected.filter(
      (f) => f.outbound_arrival_airport === flight.outbound_arrival_airport
    ).length
  }

  const getDestinationColor = (airportCode: string): string => {
    const colors = [
      'bg-orange-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-cyan-500',
    ]

    // 선택된 항공편들의 고유 목적지 리스트
    const selected = flights.filter((f) => selectedFlights.has(f.id))
    const uniqueDestinations = [...new Set(selected.map((f) => f.outbound_arrival_airport))].sort()

    // 현재 목적지의 인덱스를 찾아서 색상 할당
    const index = uniqueDestinations.indexOf(airportCode)
    return colors[index % colors.length]
  }

  const getCityName = (airportCode: string): string => {
    return airportMappings[airportCode]?.city || airportCode
  }

  const getSkyscannerUrl = (flight: Flight) => {
    const depDate = flight.outbound_date.replace(/-/g, '').slice(2)
    const retDate = flight.inbound_date.replace(/-/g, '').slice(2)
    const origin = flight.outbound_departure_airport.toLowerCase()
    const destination = flight.outbound_arrival_airport.toLowerCase()
    return `https://www.skyscanner.co.kr/transport/flights/${origin}/${destination}/${depDate}/${retDate}/?adultsv2=1&childrenv2=&cabinclass=economy&rtn=1&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false`
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
      const tripDays = `${flight.trip_nights}박${flight.trip_nights + 1}일`
      return `${origin} → ${destination} | ${formatDateWithDay(flight.outbound_date)}-${formatDateWithDay(flight.inbound_date)} (${tripDays}) | ${formatPrice(flight.price)} | ${flight.is_direct ? '직항' : '경유'}`
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

      {/* 빠른 필터 버튼 */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setQuickFilter('all')}
          className={`px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            quickFilter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setQuickFilter('japan')}
          className={`px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            quickFilter === 'japan'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          🇯🇵 일본
        </button>
        <button
          onClick={() => setQuickFilter('europe')}
          className={`px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            quickFilter === 'europe'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          🌍 유럽·미주
        </button>
        <button
          onClick={() => setQuickFilter('southeast')}
          className={`px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
            quickFilter === 'southeast'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          🌴 동남아
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 rounded-lg bg-white dark:bg-gray-800 p-4 shadow border border-gray-300 dark:border-gray-700">
        {/* 목적지 검색 */}
        <div className="flex-1 min-w-[200px]">
          <label className="mb-2 block text-sm font-medium">목적지 검색</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="도시명, 공항코드, 국가..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2"
          />
        </div>

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

      {/* 모바일 카드 레이아웃 */}
      <div className="md:hidden space-y-3">
        {filteredFlights.map((flight) => {
          const isSelected = selectedFlights.has(flight.id)
          return (
            <div
              key={flight.id}
              onClick={() => toggleFlightSelection(flight.id)}
              className={`rounded-lg p-4 shadow cursor-pointer transition-colors border ${
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 border-blue-500'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700'
              }`}
            >
              {/* 체크박스 & 경로 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 cursor-pointer mt-1"
                  />
                  <div>
                    <div className="font-medium text-base">
                      {getCityName(flight.outbound_departure_airport)} → {getCityName(flight.outbound_arrival_airport)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {flight.outbound_departure_airport} → {flight.outbound_arrival_airport}
                    </div>
                  </div>
                </div>
                {flight.is_direct && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    직항
                  </span>
                )}
              </div>

              {/* 날짜 */}
              <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                📅 {formatDateWithDay(flight.outbound_date)} - {formatDateWithDay(flight.inbound_date)}
                <span className="ml-2 text-gray-500">({flight.trip_nights}박{flight.trip_nights + 1}일)</span>
              </div>

              {/* 가격 & 버튼 */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatPrice(flight.price)}
                </span>
                <a
                  href={getSkyscannerUrl(flight)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  검색 →
                </a>
              </div>
            </div>
          )
        })}
        {filteredFlights.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
            필터 조건에 맞는 항공권이 없습니다.
          </div>
        )}
      </div>

      {/* 데스크톱 테이블 레이아웃 */}
      <div className="hidden md:block overflow-x-auto rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-300 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">선택</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium">지역</th>
              <th className="px-4 py-3 text-left text-sm font-medium">경로</th>
              <th className="px-4 py-3 text-left text-sm font-medium">날짜</th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-medium">박수</th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium">직항</th>
              <th className="px-4 py-3 text-left text-sm font-medium">가격 & 링크</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredFlights.map((flight) => {
              const isSelected = selectedFlights.has(flight.id)
              const destCount = getDestinationCount(flight)
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
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 cursor-pointer"
                      />
                      {destCount > 1 && (
                        <span className={`flex items-center justify-center w-5 h-5 rounded-full ${getDestinationColor(flight.outbound_arrival_airport)} text-white text-xs font-bold`}>
                          {destCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm">{flight.region}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{getCityName(flight.outbound_departure_airport)} → {getCityName(flight.outbound_arrival_airport)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {flight.outbound_departure_airport} → {flight.outbound_arrival_airport}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDateWithDay(flight.outbound_date)} - {formatDateWithDay(flight.inbound_date)}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm whitespace-nowrap">{flight.trip_nights}박{flight.trip_nights + 1}일</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm">
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
                      {formatPrice(flight.price)}
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
