'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Advertisement {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string
  position: string
  priority: number
  click_count: number
  view_count: number
}

interface AdBannerProps {
  position: 'banner-top' | 'banner-bottom' | 'sidebar'
  className?: string
}

export default function AdBanner({ position, className = '' }: AdBannerProps) {
  const [ad, setAd] = useState<Advertisement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAd()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('ad_banner_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_bookings'
        },
        () => {
          fetchAd()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [position])

  const fetchAd = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // 1. Check for Booked Ads (Priority)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: bookingData, error: bookingError } = await supabase
        .from('ad_bookings')
        .select('*')
        .eq('selected_date', today)
        .eq('status', 'approved') // Only approved ads
        .maybeSingle();

      if (bookingData) {
        setAd({
          id: bookingData.id,
          title: 'Sponsored Ad',
          description: null,
          image_url: bookingData.image_url,
          link_url: bookingData.link_url || '#', // Use link_url from DB
          position: position,
          priority: 100,
          click_count: 0,
          view_count: 0
        });
        setLoading(false);
        return;
      }

      // 2. Fallback to Default Ads (Legacy)
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('position', position)
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('priority', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // console.error('Failed to fetch ad:', error) // Suppress error if no default ad
        setLoading(false)
        return
      }

      if (data) {
        setAd(data)
        incrementViewCount(data.id)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error fetching ad:', err)
      setLoading(false)
    }
  }

  const incrementViewCount = async (adId: string) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Service Role Key가 필요하므로 API 라우트를 통해 처리해야 함
      // 여기서는 일단 클라이언트에서 시도 (RLS 때문에 실패할 수 있음)
      await supabase.rpc('increment_ad_view_count', { ad_id: adId })
    } catch (err) {
      // 조용히 실패 처리 (노출 수 카운트는 필수가 아님)
      console.debug('View count increment failed:', err)
    }
  }

  const handleClick = async () => {
    if (!ad) return

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // 클릭 수 증가
      await supabase.rpc('increment_ad_click_count', { ad_id: ad.id })
    } catch (err) {
      console.debug('Click count increment failed:', err)
    }

    // 새 탭에서 링크 열기
    window.open(ad.link_url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`}>
        <div className="h-24"></div>
      </div>
    )
  }

  if (!ad) {
    return null
  }

  return (
    <div className={`relative overflow-hidden rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={handleClick}
        className="w-full text-left transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {ad.image_url ? (
          <div className="relative w-full bg-gray-100 dark:bg-gray-800">
            <div className="w-full h-[70px] md:h-24 lg:h-28 overflow-hidden">
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 이미지 로드 실패 시 fallback
                  e.currentTarget.style.display = 'none'
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex flex-col justify-center">
                        <h3 class="text-xl font-bold mb-2">${ad.title}</h3>
                        ${ad.description ? `<p class="text-sm opacity-90">${ad.description}</p>` : ''}
                      </div>
                    `
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-[70px] md:h-24 lg:h-28 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 md:p-6 flex flex-col justify-center overflow-hidden">
            <h3 className="text-base md:text-xl font-bold mb-1 md:mb-2">{ad.title}</h3>
            {ad.description && (
              <p className="text-xs md:text-sm opacity-90 line-clamp-1">{ad.description}</p>
            )}
          </div>
        )}
      </button>
      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
        광고
      </div>
    </div>
  )
}
