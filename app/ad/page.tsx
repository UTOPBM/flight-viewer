'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createClient } from '@/utils/supabase/client';
import 'react-day-picker/dist/style.css';

export default function AdBookingPage() {
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([]);
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
        () => {
          fetchBookedDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePurchase = async () => {
    if (!selectedDates || selectedDates.length === 0) return;

    // Sort dates to show range in checkout
    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const dateStrings = sortedDates.map(d => format(d, 'yyyy-MM-dd'));

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dates: dateStrings, // Send array of dates
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      const { url, error } = await response.json();

      if (error) {
        alert('결제 생성 중 오류가 발생했습니다: ' + error);
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error(err);
      alert('결제 요청 실패: ' + err.message);
    }
  };

  const totalPrice = (selectedDates?.length || 0) * 10000;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          {/* Left Side: Calendar */}
          <div className="md:w-1/2 p-8 border-r border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">날짜 선택</h2>
            <p className="text-gray-500 text-sm mb-6">광고를 게시할 날짜를 모두 선택해주세요.</p>

            <div className="flex justify-center">
              <style>{`
                .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #FF385C; --rdp-background-color: #F7F7F7; }
                .rdp-day_selected:not(.rdp-day_disabled) { background-color: #FF385C; color: white; font-weight: bold; }
                .rdp-day_selected:hover:not(.rdp-day_disabled) { background-color: #E00B41; }
                .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #F7F7F7; color: #FF385C; }
              `}</style>
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={setSelectedDates}
                disabled={bookedDates}
                locale={ko}
                modifiersStyles={{
                  disabled: { color: '#d1d5db', textDecoration: 'line-through' }
                }}
              />
            </div>
          </div>

          {/* Right Side: Summary & Checkout */}
          <div className="md:w-1/2 p-8 bg-gray-50 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">예약 내역</h2>

              {selectedDates && selectedDates.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">선택한 날짜</span>
                      <span className="text-indigo-600 font-bold">{selectedDates.length}일</span>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => (
                        <span key={date.toISOString()} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {format(date, 'M월 d일')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold text-gray-900">
                      <span>총 합계</span>
                      <span>{totalPrice.toLocaleString()}원</span>
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">VAT 포함</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>달력에서 날짜를 선택해주세요</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={handlePurchase}
                disabled={!selectedDates || selectedDates.length === 0 || loading}
                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white 
                  ${!selectedDates || selectedDates.length === 0 || loading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FF385C] to-[#BD1E59] hover:from-[#E00B41] hover:to-[#A3164B] transform hover:-translate-y-0.5 transition-all duration-200'
                  }`}
              >
                {loading ? '로딩 중...' : '예약하기'}
              </button>
              <p className="mt-3 text-xs text-center text-gray-400">
                결제는 Lemon Squeezy를 통해 안전하게 처리됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
