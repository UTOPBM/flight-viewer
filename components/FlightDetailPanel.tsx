'use client'

import { useEffect, useState, useRef } from 'react'
import { Flight, AirportMapping } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { getCityEmoji } from '@/utils/cityEmojis'

interface FlightDetailPanelProps {
    isOpen: boolean
    onClose: () => void
    flight: Flight | null
    airportMappings: Record<string, AirportMapping>
    getSkyscannerUrl: (flight: Flight) => string
    formatPrice: (price: number) => string
    formatDateWithDay: (dateStr: string) => string
    getCityName: (code: string) => string
}

interface AffiliateProduct {
    id: string
    title: string
    image_url: string
    price: string
    rating: number
    review_count: number
    partner_url: string
    original_url: string
}

export default function FlightDetailPanel({
    isOpen,
    onClose,
    flight,
    airportMappings,
    getSkyscannerUrl,
    formatPrice,
    formatDateWithDay,
    getCityName
}: FlightDetailPanelProps) {
    const [products, setProducts] = useState<AffiliateProduct[]>([])
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [visibleItems, setVisibleItems] = useState(5)
    const panelRef = useRef<HTMLDivElement>(null)

    // Prevent background scrolling when panel is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Fetch affiliate products when flight changes
    useEffect(() => {
        if (flight) {
            fetchAffiliateProducts(flight.outbound_arrival_airport)
            // Reset scroll position when flight changes or panel opens
            if (panelRef.current) {
                panelRef.current.scrollTop = 0
            }
        }
    }, [flight, isOpen])

    const fetchAffiliateProducts = async (airportCode: string) => {
        setLoadingProducts(true)
        try {
            const city = airportMappings[airportCode]?.city
            if (!city) {
                setProducts([])
                return
            }

            // Fetch products that match the city
            // Note: This relies on the city name in airport_regions matching the city column in affiliate_products
            // We might need to refine this matching logic if names differ (e.g., "Fukuoka" vs "Fukuoka-si")
            const { data, error } = await supabase
                .from('affiliate_products')
                .select('*')
                .eq('city', city)
                .order('review_count', { ascending: false })
                .limit(20)

            if (error) throw error
            setProducts(data || [])
        } catch (err) {
            console.error('Error fetching affiliate products:', err)
            // On error, just show empty list, don't break UI
            setProducts([])
        } finally {
            setLoadingProducts(false)
        }
    }

    const formatAffiliatePrice = (priceStr: string) => {
        // "188,800" or "188800" -> "188,800원"
        // If already has '원', leave it.
        if (!priceStr) return ''
        if (priceStr.includes('원')) return priceStr

        // Remove non-digits
        const num = parseInt(priceStr.replace(/[^0-9]/g, ''))
        if (isNaN(num)) return priceStr

        return num.toLocaleString() + '원'
    }

    if (!flight) return null

    const days = flight.trip_nights + 1
    const city = getCityName(flight.outbound_arrival_airport)

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header / Main Card */}
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-2xl">{getCityEmoji(city)}</span>
                                <h2 className="text-2xl font-bold dark:text-white leading-tight">
                                    {city} 여행
                                </h2>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full w-fit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>
                                    {formatDateWithDay(flight.outbound_date)} - {formatDateWithDay(flight.inbound_date)}
                                </span>
                                <span className="w-1 h-1 bg-gray-400 rounded-full mx-0.5"></span>
                                <span>{flight.trip_nights}박 {days}일</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 -mt-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Flight Detail Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">

                        {/* Route Visualization */}
                        <div className="p-5 pb-4">
                            <div className="flex justify-between items-center mb-1">
                                {/* Departure */}
                                <div className="text-center w-28">
                                    <div className="font-bold text-2xl dark:text-white mb-0.5">{flight.outbound_departure_airport}</div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">서울</div>
                                    <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full inline-block">
                                        {formatDateWithDay(flight.outbound_date)}
                                    </div>
                                </div>

                                {/* Arrows */}
                                <div className="flex-1 flex flex-col items-center justify-center px-2 gap-1.5 pt-1">
                                    <div className="text-[10px] font-bold text-blue-500/80 tracking-wider">
                                        {flight.is_direct ? '직항' : '경유'}
                                    </div>

                                    <div className="w-full relative h-[20px]">
                                        {/* Top Arrow (Right) */}
                                        <div className="absolute top-0 left-0 w-full flex items-center text-gray-300 dark:text-gray-600">
                                            <div className="h-[2px] w-full bg-current relative">
                                                <svg className="absolute -right-[1px] -top-[4px] w-3 h-3 text-current overflow-visible" viewBox="0 0 12 12" fill="currentColor">
                                                    <path d="M0 0 L6 6 L0 12" stroke="currentColor" strokeWidth="2.5" fill="none" />
                                                </svg>
                                            </div>
                                        </div>
                                        {/* Bottom Arrow (Left) */}
                                        <div className="absolute bottom-0 left-0 w-full flex items-center text-gray-300 dark:text-gray-600">
                                            <div className="h-[2px] w-full bg-current relative">
                                                <svg className="absolute -left-[1px] -top-[4px] w-3 h-3 text-current overflow-visible transform rotate-180" viewBox="0 0 12 12" fill="currentColor">
                                                    <path d="M0 0 L6 6 L0 12" stroke="currentColor" strokeWidth="2.5" fill="none" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-[10px] font-bold text-blue-500/80 tracking-wider">
                                        {flight.is_direct ? '직항' : '경유'}
                                    </div>
                                </div>

                                {/* Arrival */}
                                <div className="text-center w-28">
                                    <div className="font-bold text-2xl dark:text-white mb-0.5">{flight.outbound_arrival_airport}</div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">{city}</div>
                                    <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full inline-block">
                                        {formatDateWithDay(flight.inbound_date)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                            <a
                                href={getSkyscannerUrl(flight)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-5 rounded-xl flex items-center justify-between transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 group"
                            >
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] opacity-80 font-normal mb-1">왕복 최저가</span>
                                    <span className="text-lg">{formatPrice(flight.price)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-medium">
                                    스카이스캐너에서 예약하기
                                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-8">

                    {/* Disclosure Text */}
                    <div className="mt-1 mb-6 px-4 text-center">
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed break-keep">
                            항공권은 최저가 그대로 제공되며, 아래의 <strong>숙소, 액티비티, 여행 필수품</strong> 구매 시에만 마케팅 파트너십을 통해 소정의 수수료를 제공받습니다.
                        </p>
                    </div>

                    {/* Essentials Section */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3 dark:text-gray-200">🎒 여행 필수 준비물</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="https://www.myrealtrip.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50 hover:border-purple-300 transition-colors"
                            >
                                <div className="text-2xl mb-1">📶</div>
                                <div className="font-medium text-purple-900 dark:text-purple-100">eSIM/유심</div>
                                <div className="text-xs text-purple-600 dark:text-purple-300">로밍보다 저렴하게</div>
                            </a>
                            <a
                                href="https://www.myrealtrip.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/50 hover:border-orange-300 transition-colors"
                            >
                                <div className="text-2xl mb-1">🛡️</div>
                                <div className="font-medium text-orange-900 dark:text-orange-100">여행자 보험</div>
                                <div className="text-xs text-orange-600 dark:text-orange-300">안전한 여행을 위해</div>
                            </a>
                        </div>
                    </section>

                    {/* Affiliate Products Section (Activities) */}
                    {products.length > 0 ? (
                        <section>
                            <h3 className="text-lg font-semibold mb-3 dark:text-gray-200">🎟️ {city} 추천 액티비티</h3>
                            <div className="space-y-3">
                                {products.slice(0, visibleItems).map((product) => (
                                    <a
                                        key={product.id}
                                        href={product.partner_url || product.original_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                                    >
                                        {product.image_url && (
                                            <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                                <img
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                                            <div>
                                                <div className="text-xs text-gray-500 mb-1">{city}</div>
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 text-sm leading-tight">
                                                    {product.title}
                                                </h4>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <span>⭐ {product.rating || 'New'}</span>
                                                    <span>({product.review_count || 0})</span>
                                                </div>
                                                <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                    {formatAffiliatePrice(product.price)}
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                                {products.length > visibleItems && (
                                    <button
                                        onClick={() => setVisibleItems(prev => prev + 5)}
                                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        더보기 ({products.length - visibleItems}+)
                                    </button>
                                )}
                            </div>
                        </section>
                    ) : (
                        <section className="text-center py-8">
                            <p className="text-gray-500 text-sm">
                                {loadingProducts ? '추천 상품을 불러오는 중...' : '이 도시에 대한 추천 상품이 곧 업데이트됩니다!'}
                            </p>
                        </section>
                    )}

                    {/* Footer Ad Area */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center">
                        <p className="font-bold text-sm mb-1">숙소 예약을 아직 안 하셨나요?</p>
                        <a href="https://www.agoda.com" target="_blank" rel="noreferrer" className="text-xs underline opacity-90 hover:opacity-100">
                            {city} 인기 호텔 보러가기 →
                        </a>
                    </div>



                </div>
            </div>
        </>
    )
}
