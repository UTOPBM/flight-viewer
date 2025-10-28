export interface Flight {
  id: number
  original_flight_id: number
  price: number
  formatted_price: string
  outbound_date: string
  inbound_date: string
  outbound_departure_airport: string
  outbound_arrival_airport: string
  inbound_departure_airport: string
  inbound_arrival_airport: string
  outbound_carrier: string
  inbound_carrier: string
  outbound_carrier_code: string
  inbound_carrier_code: string
  outbound_departure_time: string
  outbound_arrival_time: string
  inbound_departure_time: string
  inbound_arrival_time: string
  outbound_duration: number
  inbound_duration: number
  region: string
  trip_nights: number
  has_weekend: boolean
  is_monthly_cheapest: boolean
  departure_month: string
  is_direct: boolean
  trip_duration: number
  trip_com_price_with_baggage?: number
  trip_com_url?: string
  created_at?: string
  updated_at?: string
}

export type Region = '동북아' | '동남아' | '유럽미주' | 'all'
