'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flight, AirportMapping, Region } from '@/lib/types'
import FlightList from '@/components/admin/FlightList'
import ActivityList from '@/components/admin/ActivityList'
import { DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/DateRangePicker'

type QuickFilter = 'all' | 'japan' | 'europe' | 'southeast'

interface Product {
    id: number
    city: string
    title: string
    image_url: string
    price: string
    rating: number
    review_count: number
    original_url: string
}

export default function ContentMakerPage() {
    // Data State
    const [flights, setFlights] = useState<Flight[]>([])
    const [filteredFlights, setFilteredFlights] = useState<Flight[]>([])
    const [airportMappings, setAirportMappings] = useState<Record<string, AirportMapping>>({})
    const [products, setProducts] = useState<Product[]>([])

    // Filter State
    const [region, setRegion] = useState<Region>('all')
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
    const [includeWeekend, setIncludeWeekend] = useState<boolean>(true)
    const [searchQuery, setSearchQuery] = useState<string>('')

    // UI State
    const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null)
    const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set())
    const [loadingFlights, setLoadingFlights] = useState(true)
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [copyNotification, setCopyNotification] = useState<string | null>(null)

    // Fetch Flights & Mappings on Load
    useEffect(() => {
        const initData = async () => {
            setLoadingFlights(true)
            try {
                // 1. Fetch Flights
                const { data: flightsData } = await supabase
                    .from('filtered_flights')
                    .select('*')
                    .eq('is_monthly_cheapest', true)
                    .order('created_at', { ascending: false })

                // 2. Fetch Mappings
                const { data: mappingsData } = await supabase
                    .from('city_mappings')
                    .select('*')

                if (flightsData) setFlights(flightsData)

                if (mappingsData) {
                    const map: Record<string, AirportMapping> = {}
                    mappingsData.forEach((m: any) => {
                        map[m.airport_code] = {
                            airport_code: m.airport_code,
                            city: m.city_name_ko,
                            country: m.country
                        }
                    })
                    setAirportMappings(map)
                }
            } catch (e) {
                console.error('Init error:', e)
            } finally {
                setLoadingFlights(false)
            }
        }
        initData()
    }, [])

    // Filter Logic
    useEffect(() => {
        let filtered = [...flights]

        // 1. Quick Filter (Region/Country)
        if (quickFilter === 'japan') {
            filtered = filtered.filter((f) => airportMappings[f.outbound_arrival_airport]?.country === '일본')
        } else if (quickFilter === 'europe') {
            filtered = filtered.filter((f) => f.region === '유럽미주')
        } else if (quickFilter === 'southeast') {
            filtered = filtered.filter((f) => f.region === '동남아')
        }

        // 2. Date Range
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

        // 3. Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter((f) => {
                const cityName = (airportMappings[f.outbound_arrival_airport]?.city || '').toLowerCase()
                const airportCode = f.outbound_arrival_airport.toLowerCase()
                const country = (airportMappings[f.outbound_arrival_airport]?.country || '').toLowerCase()
                return cityName.includes(query) || airportCode.includes(query) || country.includes(query)
            })
        }

        // 4. Weekend Filter
        const isEuropeAmerica = quickFilter === 'europe' || region === '유럽미주'
        if (!isEuropeAmerica && !includeWeekend) {
            filtered = filtered.filter((f) => f.has_weekend === false)
        }

        // 5. Sort by Price
        filtered.sort((a, b) => a.price - b.price)

        setFilteredFlights(filtered)
    }, [flights, quickFilter, dateRange, searchQuery, includeWeekend, airportMappings])

    // Fetch Products when Flight Selected
    useEffect(() => {
        if (!selectedFlightId) {
            setProducts([])
            return
        }

        const fetchProducts = async () => {
            setLoadingProducts(true)
            setSelectedProductIds(new Set())
            try {
                const flight = flights.find(f => f.id === selectedFlightId)
                if (!flight) return

                const mapping = airportMappings[flight.outbound_arrival_airport]
                if (!mapping) {
                    console.warn(`No mapping found for ${flight.outbound_arrival_airport}`)
                    setProducts([])
                    return
                }

                const cityName = mapping.city

                const { data } = await supabase
                    .from('affiliate_products')
                    .select('*')
                    .eq('city', cityName)

                if (data) setProducts(data)
                else setProducts([])

            } catch (e) {
                console.error('Product fetch error:', e)
            } finally {
                setLoadingProducts(false)
            }
        }

        fetchProducts()
    }, [selectedFlightId, flights, airportMappings])

    // Handlers
    const handleToggleProduct = (id: number) => {
        const newSet = new Set(selectedProductIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedProductIds(newSet)
    }

    const getSkyscannerLink = (flight: Flight) => {
        const formatDate = (dateStr: string) => {
            return dateStr.slice(2).replace(/-/g, '') // 2025-12-09 -> 251209
        }

        const origin = flight.outbound_departure_airport.toLowerCase()
        const dest = flight.outbound_arrival_airport.toLowerCase()
        const outDate = formatDate(flight.outbound_date)
        const inDate = formatDate(flight.inbound_date)

        return `https://www.skyscanner.co.kr/transport/flights/${origin}/${dest}/${outDate}/${inDate}/?adultsv2=1&childrenv2=&cabinclass=economy&rtn=1&preferdirects=${flight.is_direct}&outboundaltsenabled=false&inboundaltsenabled=false`
    }

    const handleCopy = () => {
        const flight = flights.find(f => f.id === selectedFlightId)
        if (!flight) return

        const selectedProds = products.filter(p => selectedProductIds.has(p.id))

        const cityName = airportMappings[flight.outbound_arrival_airport]?.city || flight.outbound_arrival_airport
        const dateRange = `${flight.outbound_date} ~ ${flight.inbound_date}`

        // Round to nearest 100
        const rawPrice = flight.price
        const roundedPrice = Math.round(rawPrice / 100) * 100
        const priceStr = roundedPrice.toLocaleString()

        let text = `✈️ [${cityName}] 항공권 특가\n`
        text += `일정: ${dateRange} (${flight.trip_nights}박)\n`
        text += `가격: ${priceStr}원~\n`
        text += `직항여부: ${flight.is_direct ? '직항' : '경유'}\n`
        text += `👉 ${getSkyscannerLink(flight)}\n\n`

        if (selectedProds.length > 0) {
            text += `🎡 추천 액티비티\n`
            selectedProds.forEach(p => {
                text += `- ${p.title} (⭐${p.rating}) : ${parseInt(p.price).toLocaleString()}원~\n`
                text += `  👉 ${p.original_url}\n`
            })
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopyNotification('복사되었습니다! 🎉')
            setTimeout(() => setCopyNotification(null), 2000)
        })
    }

    const getSelectedCityName = () => {
        if (!selectedFlightId) return null
        const flight = flights.find(f => f.id === selectedFlightId)
        if (!flight) return null
        return airportMappings[flight.outbound_arrival_airport]?.city
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {copyNotification && (
                <div className="fixed top-20 right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-in-down font-bold">
                    {copyNotification}
                </div>
            )}

            {/* Left Panel: Flights (40%) */}
            <div className="w-2/5 h-full flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {/* Filter Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                    {/* Region Buttons */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button onClick={() => setQuickFilter('all')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${quickFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>전체</button>
                        <button onClick={() => setQuickFilter('japan')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${quickFilter === 'japan' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>🇯🇵 일본</button>
                        <button onClick={() => setQuickFilter('europe')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${quickFilter === 'europe' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>🌍 유럽·미주</button>
                        <button onClick={() => setQuickFilter('southeast')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${quickFilter === 'southeast' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>🌴 동남아</button>
                    </div>

                    {/* Date & Search */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <DateRangePicker dateRange={dateRange} onSelect={setDateRange} />
                        </div>
                        <button
                            onClick={() => setIncludeWeekend(!includeWeekend)}
                            disabled={quickFilter === 'europe'}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${quickFilter === 'europe' ? 'bg-blue-500 text-white opacity-50 cursor-not-allowed' : includeWeekend ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}
                        >
                            {includeWeekend ? '주말 포함' : '평일만'}
                        </button>
                    </div>
                </div>

                <FlightList
                    flights={filteredFlights}
                    selectedFlightId={selectedFlightId}
                    onSelectFlight={(f) => setSelectedFlightId(f.id)}
                    airportMappings={airportMappings}
                />
            </div>

            {/* Right Panel: Activities (60%) */}
            <div className="w-3/5 h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                            {getSelectedCityName() ? `${getSelectedCityName()} 콘텐츠 만들기` : '콘텐츠 제작소'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            disabled={!selectedFlightId}
                            className={`px-4 py-2 rounded-lg font-bold text-white transition-all ${selectedFlightId ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg' : 'bg-gray-300 cursor-not-allowed'}`}
                        >
                            📋 텍스트 복사
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ActivityList
                        city={getSelectedCityName() || null}
                        products={products}
                        selectedProductIds={selectedProductIds}
                        onToggleProduct={handleToggleProduct}
                        loading={loadingProducts}
                    />
                </div>
            </div>
        </div>
    )
}
