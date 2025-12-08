'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flight, AirportMapping } from '@/lib/types'
import FlightList from '@/components/admin/FlightList'
import ActivityList from '@/components/admin/ActivityList'

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
    const [airportMappings, setAirportMappings] = useState<Record<string, AirportMapping>>({})
    const [products, setProducts] = useState<Product[]>([])

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
                    .order('created_at', { ascending: false }) // Newest first

                // 2. Fetch Mappings
                const { data: mappingsData } = await supabase
                    .from('city_mappings')
                    .select('*')

                if (flightsData) setFlights(flightsData)

                if (mappingsData) {
                    const map: Record<string, AirportMapping> = {}
                    mappingsData.forEach((m: any) => {
                        // Map using airport_code as key. 
                        // Note: The table is city_mappings(airport_code, city_name_ko, ...)
                        // The FlightTable uses airport_regions table. 
                        // We should align. Let's use city_mappings as it's what we built for this.
                        // But FlightList expects AirportMapping type which has { city, country }.
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

    // Fetch Products when Flight Selected
    useEffect(() => {
        if (!selectedFlightId) {
            setProducts([])
            return
        }

        const fetchProducts = async () => {
            setLoadingProducts(true)
            setSelectedProductIds(new Set()) // Reset selection
            try {
                const flight = flights.find(f => f.id === selectedFlightId)
                if (!flight) return

                // Find mapped city name
                const mapping = airportMappings[flight.outbound_arrival_airport]
                if (!mapping) {
                    console.warn(`No mapping found for ${flight.outbound_arrival_airport}`)
                    setProducts([])
                    return
                }

                const cityName = mapping.city // e.g., '오사카'

                const { data } = await supabase
                    .from('affiliate_products')
                    .select('*')
                    .eq('city', cityName)
                // .order('rating', { ascending: false }) // Optional: sort by rating

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

    const handleCopy = () => {
        const flight = flights.find(f => f.id === selectedFlightId)
        if (!flight) return

        const selectedProds = products.filter(p => selectedProductIds.has(p.id))

        // Format Text
        const cityName = airportMappings[flight.outbound_arrival_airport]?.city || flight.outbound_arrival_airport
        const dateRange = `${flight.outbound_date} ~ ${flight.inbound_date}`
        const price = parseInt(flight.price.toString()).toLocaleString()

        let text = `✈️ [${cityName}] 항공권 특가\n`
        text += `일정: ${dateRange} (${flight.trip_nights}박)\n`
        text += `가격: ${price}원~\n`
        text += `직항여부: ${flight.is_direct ? '직항' : '경유'}\n\n`

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
            {/* Notification Toast */}
            {copyNotification && (
                <div className="fixed top-20 right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-fade-in-down font-bold">
                    {copyNotification}
                </div>
            )}

            {/* Left Panel: Flights (40%) */}
            <div className="w-2/5 h-full flex flex-col border-r border-gray-200 dark:border-gray-800">
                <FlightList
                    flights={flights}
                    selectedFlightId={selectedFlightId}
                    onSelectFlight={(f) => setSelectedFlightId(f.id)}
                    airportMappings={airportMappings}
                />
            </div>

            {/* Right Panel: Activities (60%) */}
            <div className="w-3/5 h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                {/* Action Bar */}
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
                            className={`px-4 py-2 rounded-lg font-bold text-white transition-all ${selectedFlightId
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    : 'bg-gray-300 cursor-not-allowed'
                                }`}
                        >
                            📋 텍스트 복사
                        </button>
                    </div>
                </div>

                {/* Content Area */}
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
