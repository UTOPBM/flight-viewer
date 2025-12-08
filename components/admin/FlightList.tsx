'use client'

import { Flight, AirportMapping } from '@/lib/types'

interface FlightListProps {
    flights: Flight[]
    selectedFlightId: number | null
    onSelectFlight: (flight: Flight) => void
    airportMappings: Record<string, AirportMapping>
}

export default function FlightList({
    flights,
    selectedFlightId,
    onSelectFlight,
    airportMappings
}: FlightListProps) {

    const getCityName = (code: string) => airportMappings[code]?.city || code

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return `${date.getMonth() + 1}/${date.getDate()}`
    }

    const formatPrice = (price: number) => {
        return Math.round(price / 100) * 100
    }

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h2 className="font-bold text-lg">✈️ 항공권 선택 ({flights.length})</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {flights.map((flight) => {
                    const isSelected = selectedFlightId === flight.id
                    return (
                        <div
                            key={flight.id}
                            onClick={() => onSelectFlight(flight)}
                            className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {getCityName(flight.outbound_arrival_airport)}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400 font-bold">
                                    {formatPrice(flight.price).toLocaleString()}원
                                </div>
                            </div>

                            <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-between">
                                <span>
                                    {formatDate(flight.outbound_date)} - {formatDate(flight.inbound_date)}
                                </span>
                                <span>
                                    {flight.trip_nights}박 {flight.trip_nights + 1}일
                                </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                <span className={`px-1.5 py-0.5 rounded ${flight.is_direct ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {flight.is_direct ? '직항' : '경유'}
                                </span>
                                <span>{flight.outbound_departure_airport} → {flight.outbound_arrival_airport}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
