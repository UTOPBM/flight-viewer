'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Flight, Region, AirportMapping } from '@/lib/types'
import { DateRange } from 'react-day-picker'
import DateRangePicker from './DateRangePicker'
import FlightDetailPanel from './FlightDetailPanel'

type QuickFilter = 'all' | 'japan' | 'europe' | 'southeast'

export default function FlightTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [flights, setFlights] = useState<Flight[]>([])
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([])
  const [airportMappings, setAirportMappings] = useState<Record<string, AirportMapping>>({})
  const [selectedFlights, setSelectedFlights] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [region, setRegion] = useState<Region>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [copyNotification, setCopyNotification] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [includeWeekend, setIncludeWeekend] = useState<boolean>(true)

  const [selectedFlightDetail, setSelectedFlightDetail] = useState<Flight | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // 초기 데이터 로드
  useEffect(() => {
    fetchData()
  }, [])

  // 탭으로 돌아올 때 자동 업데이트 (30분 쿨다운)
  useEffect(() => {
    let lastFetchTime = Date.now()
    const COOLDOWN_MS = 30 * 60 * 1000 // 30분

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        const timeSinceLastFetch = now - lastFetchTime

        // 마지막 업데이트 후 30분 이상 지났으면 새로고침
        if (timeSinceLastFetch >= COOLDOWN_MS) {
          fetchData()
          lastFetchTime = now
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const [autoSelectRank, setAutoSelectRank] = useState<number | null>(null)

  // 초기 로드 시 URL 쿼리 파라미터에서 검색어 설정 (오토매핑 추가) 및 순위/주말 파라미터 확인
  useEffect(() => {
    // 1. Search Query
    const searchParam = searchParams.get('search')
    if (searchParam) {
      const upperSearchParam = searchParam.toUpperCase()
      const airportMapping = airportMappings[upperSearchParam]

      if (airportMapping) {
        setSearchQuery(airportMapping.city)
      } else {
        setSearchQuery(searchParam)
      }
    }

    // 2. Weekend Parameter
    const weekendParam = searchParams.get('weekend')
    if (weekendParam === 'false') {
      setIncludeWeekend(false)
    }

    // 3. Auto Select Rank (Numeric Keys)
    const keys = Array.from(searchParams.keys())
    const rankKey = keys.find(key => /^\d+$/.test(key))
    if (rankKey) {
      setAutoSelectRank(parseInt(rankKey))
    }
  }, [searchParams, airportMappings])

  // 검색어 변경 시 URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery) {
      params.set('search', searchQuery)
    } else {
      params.delete('search')
    }

    // 현재 경로와 다를 때만 replace 실행 (무한 루프 방지)
    const newPath = `${pathname}?${params.toString()}`
    if (newPath !== `${pathname}?${searchParams.toString()}`) {
      router.replace(newPath, { scroll: false })
    }
  }, [searchQuery, pathname, router, searchParams])

  // URL의 flightId가 있으면 해당 항공권을 찾아 패널 열기 (데이터 로드 후)
  useEffect(() => {
    const flightIdStr = searchParams.get('flightId')

    // 1. flightId가 있는 경우 (패널 열기)
    if (flightIdStr && flights.length > 0) {
      const flightId = parseInt(flightIdStr)
      if (selectedFlightDetail?.id !== flightId) {
        const flight = flights.find((f) => f.id === flightId)
        if (flight) {
          setSelectedFlightDetail(flight)
          setIsPanelOpen(true)
          return
        }
      } else if (!isPanelOpen) {
        setIsPanelOpen(true)
        return
      }
    }
    // 2. flightId가 없는 경우 (패널 닫기 - 뒤로가기 대응)
    else if (!flightIdStr && isPanelOpen) {
      setIsPanelOpen(false)
      setSelectedFlightDetail(null)
    }

    // 3. 순위 기반 자동 선택 (검색 결과 진입 시)
    if (autoSelectRank && filteredFlights.length > 0 && !flightIdStr) {
      const index = autoSelectRank - 1
      if (index >= 0 && index < filteredFlights.length) {
        const flight = filteredFlights[index]
        setSelectedFlightDetail(flight)
        setIsPanelOpen(true)

        setAutoSelectRank(null)

        const params = new URLSearchParams(searchParams.toString())
        params.set('flightId', flight.id.toString())
        params.delete(autoSelectRank.toString())

        setPanelOpenedByHistory(true) // 자동 선택도 PUSH 하므로 History 취급
        router.push(`${pathname}?${params.toString()}`, { scroll: false }) // Use Push for auto-select too
      }
    }
  }, [searchParams, flights, filteredFlights, autoSelectRank, pathname, router, isPanelOpen, selectedFlightDetail])

  // 필터링 및 정렬
  useEffect(() => {
    filterAndSortFlights()
  }, [flights, region, dateRange, sortOrder, searchQuery, quickFilter, includeWeekend])

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

    // 빠른 필터
    if (quickFilter === 'japan') {
      filtered = filtered.filter((f) => {
        const country = airportMappings[f.outbound_arrival_airport]?.country
        return country === '일본'
      })
    } else if (quickFilter === 'europe') {
      filtered = filtered.filter((f) => f.region === '유럽미주')
    } else if (quickFilter === 'southeast') {
      filtered = filtered.filter((f) => f.region === '동남아')
    }

    // 날짜 범위 필터
    if (dateRange?.from) {
      filtered = filtered.filter((f) => {
        const outboundDate = new Date(f.outbound_date)
        const inboundDate = new Date(f.inbound_date)

        outboundDate.setHours(0, 0, 0, 0)
        inboundDate.setHours(0, 0, 0, 0)

        const fromDate = new Date(dateRange.from!)
        fromDate.setHours(0, 0, 0, 0)

        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return outboundDate >= fromDate && inboundDate <= toDate
        } else {
          return outboundDate >= fromDate
        }
      })
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

    // 주말 포함 필터
    const isEuropeAmerica = quickFilter === 'europe' || region === '유럽미주'
    if (!isEuropeAmerica) {
      filtered = filtered.filter((f) => {
        if (includeWeekend) {
          return f.has_weekend === true
        } else {
          return f.has_weekend === false
        }
      })
    }

    // 가격순 정렬
    filtered.sort((a, b) => {
      return sortOrder === 'asc' ? a.price - b.price : b.price - a.price
    })

    setFilteredFlights(filtered)
  }

  // 히스토리 제어용 State
  const [panelOpenedByHistory, setPanelOpenedByHistory] = useState(false)

  const handleFlightClick = (flight: Flight) => {
    setSelectedFlightDetail(flight)
    setIsPanelOpen(true)
    setPanelOpenedByHistory(true) // 내부 탐색으로 열림 표시

    // URL 업데이트 (flightId 추가) - PUSH to history so back button works
    const params = new URLSearchParams(searchParams.toString())
    params.set('flightId', flight.id.toString())
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleClosePanel = () => {
    setIsPanelOpen(false)

    if (panelOpenedByHistory) {
      // 내부 탐색으로 열렸다면 back()으로 히스토리 제거
      router.back()
      setPanelOpenedByHistory(false)
    } else {
      // 외부 접속/공유 링크/뒤로가기 불가능한 경우 replace로 파라미터만 제거
      // 이렇게 해야 "강제 재오픈" 현상을 막고 리스트로 깔끔하게 돌아감
      const params = new URLSearchParams(searchParams.toString())
      params.delete('flightId')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
  }

  const getDayOfWeek = (dateStr: string): string => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const date = new Date(dateStr)
    return days[date.getDay()]
  }

  const formatDateWithDay = (dateStr: string) => {
    return `${formatDate(dateStr)}(${getDayOfWeek(dateStr)})`
  }

  const formatPrice = (price: number) => {
    const rounded = Math.round(price / 100) * 100
    return rounded.toLocaleString() + '원'
  }

  const formatUpdatedAt = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const hours = date.getHours()
    const ampm = hours >= 12 ? '오후' : '오전'
    const formattedHours = hours % 12 || 12
    return `${ampm} ${formattedHours}시`
  }

  const getLastUpdatedTime = () => {
    if (flights.length === 0) return null
    const dates = flights.map((f) => (f.created_at ? new Date(f.created_at).getTime() : 0))
    const maxDate = Math.max(...dates)
    if (maxDate === 0) return null
    return new Date(maxDate).toISOString()
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
      'bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500', 'bg-cyan-500',
    ]

    const selected = flights.filter((f) => selectedFlights.has(f.id))
    const uniqueDestinations = [...new Set(selected.map((f) => f.outbound_arrival_airport))].sort()

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

    const selected = flights.filter((f) => selectedFlights.has(f.id))
    selected.sort((a, b) => a.price - b.price)

    const lines = selected.map((flight) => {
      const origin = getCityName(flight.outbound_departure_airport)
      const destination = getCityName(flight.outbound_arrival_airport)
      const tripDays = `${flight.trip_nights}박${flight.trip_nights + 1}일`
      const url = getSkyscannerUrl(flight)
      return `${origin} → ${destination} | ${formatDateWithDay(flight.outbound_date)}-${formatDateWithDay(flight.inbound_date)} (${tripDays}) | ${formatPrice(flight.price)} | ${flight.is_direct ? '직항' : '경유'}\n${url}`
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
      <div className="mb-4 flex gap-2 overflow-x-auto flex-nowrap pb-2 no-scrollbar">
        <button
          onClick={() => {
            setQuickFilter('all')
            setSearchQuery('')
          }}
          className={`whitespace-nowrap px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${quickFilter === 'all'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          전체
        </button>
        <button
          onClick={() => {
            setQuickFilter('japan')
            setSearchQuery('')
          }}
          className={`whitespace-nowrap px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${quickFilter === 'japan'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          🇯🇵 일본
        </button>
        <button
          onClick={() => {
            setQuickFilter('europe')
            setSearchQuery('')
          }}
          className={`whitespace-nowrap px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${quickFilter === 'europe'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          🌍 유럽·미주
        </button>
        <button
          onClick={() => {
            setQuickFilter('southeast')
            setSearchQuery('')
          }}
          className={`whitespace-nowrap px-3 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${quickFilter === 'southeast'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          🌴 동남아
        </button>

        {getLastUpdatedTime() && (
          <div className="whitespace-nowrap px-2 sm:px-6 py-2 rounded-lg text-xs sm:text-base font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center">
            Last update : {formatUpdatedAt(getLastUpdatedTime()!)}
          </div>
        )}
      </div>

      <div className="mb-3 md:mb-6 flex flex-col md:flex-row gap-2 md:gap-3 rounded-lg bg-white dark:bg-gray-800 p-3 md:p-4 shadow border border-gray-300 dark:border-gray-700">
        {/* 1. 목적지 검색 */}
        <div className="w-full md:flex-1">
          <label className="mb-1 md:mb-2 block text-sm font-medium">목적지 검색</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="도시명, 공항코드, 국가..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-1.5 md:py-2 text-sm"
          />
        </div>

        {/* 2. 여행 기간 */}
        <div className="w-full md:w-auto">
          <label className="mb-1 md:mb-2 block text-sm font-medium">여행 기간</label>
          <DateRangePicker
            dateRange={dateRange}
            onSelect={setDateRange}
          />
        </div>

        {/* 3. 여행 옵션 & 총 개수 */}
        <div className="grid grid-cols-2 gap-2 md:flex md:gap-3 w-full md:w-auto">
          <div className="md:w-auto">
            <label className="mb-1 md:mb-2 block text-sm font-medium">여행 옵션</label>
            <button
              onClick={() => setIncludeWeekend(!includeWeekend)}
              disabled={quickFilter === 'europe' || region === '유럽미주'}
              className={`w-full whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${(quickFilter === 'europe' || region === '유럽미주')
                ? 'bg-blue-500 text-white cursor-not-allowed'
                : includeWeekend
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
            >
              {(quickFilter === 'europe' || region === '유럽미주') || includeWeekend
                ? '주말 포함'
                : '평일만'}
            </button>
          </div>

          <div className="md:w-auto">
            <label className="mb-1 md:mb-2 block text-sm font-medium md:invisible">·</label>
            {selectedFlights.size > 0 ? (
              <button
                onClick={copySelectedToClipboard}
                className="w-full md:w-auto rounded-lg bg-green-500 px-3 py-2 text-sm text-white hover:bg-green-600 transition-colors whitespace-nowrap font-medium"
              >
                선택 복사 ({selectedFlights.size})
              </button>
            ) : (
              <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm whitespace-nowrap font-medium text-gray-700 dark:text-gray-300 text-center">
                총 {filteredFlights.length}개
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모바일 카드 레이아웃 */}
      <div className="md:hidden space-y-3">
        {filteredFlights.map((flight) => {
          const isSelected = selectedFlights.has(flight.id)
          return (
            <div
              key={flight.id}
              onClick={() => handleFlightClick(flight)}
              className={`rounded-lg p-4 shadow cursor-pointer transition-colors border ${isSelected
                ? 'bg-blue-50 ring-2 ring-blue-500 border-blue-500'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700'
                }`}
            >
              {/* 체크박스 & 경로 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleFlightSelection(flight.id)}
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
                <span className="text-sm text-gray-400">
                  상세보기 &gt;
                </span>
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
                  onClick={() => handleFlightClick(flight)}
                  className={`cursor-pointer transition-colors ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => {
                        e.stopPropagation();
                      }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFlightSelection(flight.id)}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </div>
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
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {formatPrice(flight.price)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <FlightDetailPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        flight={selectedFlightDetail}
        airportMappings={airportMappings}
        getSkyscannerUrl={getSkyscannerUrl}
        formatPrice={formatPrice}
        formatDateWithDay={formatDateWithDay}
        getCityName={getCityName}
      />
    </div>
  )
}
