'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { createClient } from '@/utils/supabase/client'; // Assuming this utility exists or I'll create it
import 'react-day-picker/dist/style.css';

export default function AdBookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBookedDates() {
      const { data, error } = await supabase
        .from('ad_bookings')
        .select('selected_date')
        .eq('status', 'paid');

      if (error) {
        console.error('Error fetching booked dates:', error);
      } else if (data) {
        setBookedDates(data.map((booking: any) => new Date(booking.selected_date)));
      }
      setLoading(false);
    }

    fetchBookedDates();

    // Realtime subscription
    const channel = supabase
      .channel('ad_bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ad_bookings',
          filter: "status=eq.paid",
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchBookedDates(); // Refresh on change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePurchase = async () => {
    if (!selectedDate) return;

    // 1. Create a checkout URL via our API (which talks to Lemon Squeezy)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        alert('결제 생성 중 오류가 발생했습니다: ' + error);
        return;
      }

      if (url) {
        window.location.href = url; // Redirect to Lemon Squeezy
      }
    } catch (err) {
      console.error(err);
      alert('결제 요청 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          광고 슬롯 예약하기 🚀
        </h1>
        
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={bookedDates}
              footer={
                selectedDate ? (
                  <p className="mt-4 text-center text-sm font-medium text-blue-600">
                    선택된 날짜: {format(selectedDate, 'yyyy년 MM월 dd일')}
                  </p>
                ) : (
                  <p className="mt-4 text-center text-sm text-gray-500">
                    날짜를 선택해주세요.
                  </p>
                )
              }
            />
          </div>

          <div className="w-full">
            <button
              onClick={handlePurchase}
              disabled={!selectedDate || loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${!selectedDate || loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                } transition-colors duration-200`}
            >
              {loading ? '로딩 중...' : selectedDate ? `${format(selectedDate, 'MM월 dd일')} 광고 구매하기 (10,000원)` : '날짜를 먼저 선택하세요'}
            </button>
            <p className="mt-2 text-xs text-center text-gray-400">
              * 결제는 Lemon Squeezy를 통해 안전하게 처리됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
