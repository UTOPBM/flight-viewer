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

    // Body Scroll Lock with Padding Compensation
    const [isLocked, setIsLocked] = useState(isOpen)

    // Sync isLocked with isOpen (with delay on close)
    useEffect(() => {
        if (isOpen) {
            setIsLocked(true)
        } else {
            const timer = setTimeout(() => {
                setIsLocked(false)
            }, 300) // Match animation duration
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    // Apply styles based on isLocked
    useEffect(() => {
        if (isLocked) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`
            }
            document.body.style.overflow = 'hidden'
        }

        return () => {
            // Cleanup: Reset styles
            // This runs on unmount OR when isLocked changes to false
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
        }
    }, [isLocked])

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

    const [randomQuote, setRandomQuote] = useState('')

    const FOOTER_QUOTES = [
        "열심히 일한 우리, 이제는 힐링하러 떠날 시간🌿",
        "가장 완벽한 여행 타이밍은?\n에라 모르겠다 하고 결제했을 때🍉",
        "'여행 가고 싶다' 병, 더는 약도 없죠.\n그냥 떠나는 게 답입니다.✈️",
        "쉼 없이 달려온 당신의 캘린더에,\n가장 설레는 빈칸 하나를 선물해요."
    ]

    useEffect(() => {
        if (isOpen) {
            const randomIndex = Math.floor(Math.random() * FOOTER_QUOTES.length)
            setRandomQuote(FOOTER_QUOTES[randomIndex])
        }
    }, [isOpen])

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
                <div className="z-10 bg-white dark:bg-gray-900 px-5 pt-6 pb-4">
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
                        <h3 className="text-lg font-bold mb-3 dark:text-gray-200 flex items-center gap-2">
                            <span>🎒</span>
                            <span>여행 필수 준비물</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="https://3ha.in/r/293861"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100 mb-0.5">유심사 eSIM</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">로밍보다 저렴하게</div>
                                </div>
                            </a>

                            <a
                                href="https://3ha.in/r/293862"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100 mb-0.5">클룩 여행자 보험</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">안전한 여행을 위해</div>
                                </div>
                            </a>
                        </div>
                    </section>

                    {/* Affiliate Products Section (Activities) */}
                    {products.length > 0 ? (
                        <section>
                            <h3 className="text-lg font-bold mb-3 dark:text-gray-200 flex items-center gap-2">
                                <span>🎟️</span>
                                <span>{city} 추천 액티비티</span>
                            </h3>
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

                    {/* Accommodation Section */}
                    <section>
                        <h3 className="text-lg font-bold mb-3 dark:text-gray-200 flex items-center gap-2">
                            <span>🛏️</span>
                            <span>여행의 밤, 아늑한 쉼표</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="https://3ha.in/r/293885"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white hover:shadow-md transition-all duration-200 group border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                            >
                                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                    <img src="/images/partners/tripcom.png" alt="Trip.com" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">트립닷컴</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">압도적인 호텔 특가</span>
                                </div>
                            </a>
                            <a
                                href="https://3ha.in/r/293890"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white hover:shadow-md transition-all duration-200 group border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                            >
                                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                    <img src="/images/partners/agoda.jpeg" alt="Agoda" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">아고다</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">전 세계 최저가 보장</span>
                                </div>
                            </a>
                            <a
                                href="https://3ha.in/r/293892"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white hover:shadow-md transition-all duration-200 group border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                            >
                                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                    <img src="/images/partners/myrealtrip.png" alt="MyRealTrip" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">마이리얼트립</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">취향 저격 감성 숙소</span>
                                </div>
                            </a>
                            <a
                                href="https://3ha.in/r/293900"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-white hover:shadow-md transition-all duration-200 group border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                            >
                                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center">
                                    <img src="/images/partners/yeogi.jpg" alt="YeogiEottae" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">여기어때</span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">해외 숙소도 최저가</span>
                                </div>
                            </a>
                        </div>
                    </section>

                    {/* Footer Quote */}
                    <div className="mt-12 pb-8 text-center space-y-2">
                        <p className="text-sm font-medium text-gray-400 dark:text-gray-500 whitespace-pre-line">
                            {randomQuote}
                        </p>
                    </div>

                </div>
            </div>
        </>
    )
}
