
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY')!
const RAPIDAPI_HOST = Deno.env.get('RAPIDAPI_HOST') || 'flights-search3.p.rapidapi.com'
const FLIGHTS_SUPABASE_URL = Deno.env.get('FLIGHTS_SUPABASE_URL')!
const FLIGHTS_SUPABASE_KEY = Deno.env.get('FLIGHTS_SUPABASE_KEY')!
const FLIGHT_FILTER_API_URL = Deno.env.get('FLIGHT_FILTER_API_URL') || 'https://flight-filter-api-199254632639.asia-northeast3.run.app'

// Client for the database where 'flight_prices' lives (Source DB)
const flightsSupabase = createClient(FLIGHTS_SUPABASE_URL, FLIGHTS_SUPABASE_KEY)

// Client for the database where 'frequent_cities' lives (Current DB)
const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
    try {
        console.log("🚀 Starting frequent-flights-worker")

        // 1. Get active frequent cities
        const { data: cities, error: cityError } = await supabase
            .from('frequent_cities')
            .select('airport_code')
            .eq('is_active', true)

        if (cityError) throw new Error(`Failed to fetch cities: ${cityError.message}`)
        if (!cities || cities.length === 0) {
            return new Response(JSON.stringify({ message: "No active cities found" }), { headers: { "Content-Type": "application/json" } })
        }

        const cityCodes = cities.map(c => c.airport_code)
        console.log(`📍 Target Cities: ${cityCodes.join(', ')}`)

        // 2. Determine months to search (Logic from worker.py)
        const now = new Date()
        const currentDay = now.getDate()
        let startMonthOffset = currentDay > 15 ? 1 : 0
        const monthsToSearch = []

        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + startMonthOffset + i, 1)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            monthsToSearch.push(`${year}-${month}`)
        }
        console.log(`📅 Target Months: ${monthsToSearch.join(', ')}`)

        // 3. Search and Collect Data (Parallel Processing)
        const allSearchTasks = []
        for (const city of cityCodes) {
            for (const month of monthsToSearch) {
                allSearchTasks.push({ city, month })
            }
        }

        console.log(`🚀 Starting processing for ${allSearchTasks.length} search tasks...`)

        let totalSaved = 0
        const BATCH_SIZE = 4 // Concurrency limit (Safe under 5 req/s)

        for (let i = 0; i < allSearchTasks.length; i += BATCH_SIZE) {
            const batch = allSearchTasks.slice(i, i + BATCH_SIZE)
            console.log(`📦 Processing Batch ${i / BATCH_SIZE + 1}/${Math.ceil(allSearchTasks.length / BATCH_SIZE)} (${batch.length} tasks)...`)

            const results = await Promise.allSettled(
                batch.map(async (task) => {
                    console.log(`🔍 Searching ${task.city} for ${task.month}...`)
                    const flights = await searchFlights(task.city, task.month)
                    if (flights.length > 0) {
                        const saved = await saveFlights(flights, task.city)
                        return saved
                    }
                    return 0
                })
            )

            for (const res of results) {
                if (res.status === 'fulfilled') {
                    totalSaved += res.value
                } else {
                    console.error(`❌ Task failed:`, res.reason)
                }
            }

            // Rate limiting wait
            if (i + BATCH_SIZE < allSearchTasks.length) {
                console.log("⏳ Waiting 1.5s for rate limit...")
                await new Promise(resolve => setTimeout(resolve, 1500))
            }
        }

        // 4. Trigger Flight Filter API
        console.log("⚡ Triggering Flight Filter API...")
        const filterResp = await fetch(`${FLIGHT_FILTER_API_URL}/filter-flights?clear=false`, {
            method: 'POST'
        })
        const filterResult = await filterResp.text()
        console.log("Filter API Response:", filterResult)

        return new Response(
            JSON.stringify({
                message: "Success",
                processed_cities: cityCodes.length,
                total_saved: totalSaved
            }),
            { headers: { "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.error(err)
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
})

async function searchFlights(toEntityId: string, month: string) {
    const url = `https://${RAPIDAPI_HOST}/flights/search-roundtrip`
    const params = new URLSearchParams({
        fromEntityId: 'ICN',
        toEntityId: toEntityId,
        wholeMonthDepart: month,
        wholeMonthReturn: month,
        adults: '1',
        market: 'KR',
        locale: 'ko-KR',
        currency: 'KRW',
        sort: 'cheapest_first',
        cabinClass: 'economy'
    })

    const response = await fetch(`${url}?${params}`, {
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        }
    })

    if (!response.ok) {
        throw new Error(`RapidAPI Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform data to match flight_prices schema
    // Based on worker.py format_prices logic
    const results = data.data?.flightQuotes?.results || []
    return results.map((result: any) => {
        const content = result.content
        const price = content.rawPrice
        const outbound = content.outboundLeg
        const inbound = content.inboundLeg
        const kstNow = new Date().toISOString().replace('T', ' ').substring(0, 19) // Approximate

        if (!price || !outbound || !inbound) return null

        return {
            price: Math.floor(price),
            formatted_price: `${Math.floor(price).toLocaleString()}원`,
            outbound_date: outbound.localDepartureDate,
            formatted_outbound_date: formatDate(outbound.localDepartureDate),
            inbound_date: inbound.localDepartureDate,
            formatted_inbound_date: formatDate(inbound.localDepartureDate),
            outbound_carrier: '알 수 없음',
            inbound_carrier: '알 수 없음',
            outbound_carrier_code: `ICN-${toEntityId}`,
            inbound_carrier_code: `${toEntityId}-ICN`,
            outbound_departure_airport: 'ICN',
            outbound_arrival_airport: toEntityId,
            inbound_departure_airport: toEntityId,
            inbound_arrival_airport: 'ICN',
            is_direct: content.direct || false,
            created_at: kstNow
        }
    }).filter((f: any) => f !== null)
}

async function saveFlights(flights: any[], region: string) {
    // Save in chunks of 100
    let savedCount = 0
    for (let i = 0; i < flights.length; i += 100) {
        const chunk = flights.slice(i, i + 100)
        const { data, error } = await flightsSupabase
            .table('flight_prices')
            .upsert(chunk)
            .select()

        if (error) {
            console.error(`Error saving chunk for ${region}:`, error)
        } else {
            savedCount += data?.length || 0
        }
    }
    return savedCount
}

function formatDate(dateStr: string) {
    // 2024-12-01 -> 2024년 12월 01일
    const [y, m, d] = dateStr.split('-')
    return `${y}년 ${m}월 ${d}일`
}
