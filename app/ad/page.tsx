'use client';

import { useState, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, addDays, isSameDay, differenceInDays, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createClient } from '@/utils/supabase/client';
import 'react-day-picker/dist/style.css';

export default function AdBookingPage() {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `ads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ad-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      throw new Error('이미지 업로드 실패: ' + uploadError.message);
    }

    const { data } = supabase.storage.from('ad-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePurchase = async () => {
    if (!selectedRange?.from || !selectedRange?.to) return;
    if (!imageFile) {
      alert('광고 배너 이미지를 업로드해주세요.');
      return;
    }

    setUploading(true);

    try {
      // 1. Upload Image
      const imageUrl = await uploadImage();
      if (!imageUrl) throw new Error('이미지 URL 생성 실패');

      // Expand range to array of dates
      const dates = eachDayOfInterval({ start: selectedRange.from, end: selectedRange.to });
      const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));

      // 2. Create Checkout
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dates: dateStrings,
          imageUrl: imageUrl, // Pass image URL
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      const { url, error } = await response.json() as { url?: string, error?: string };

      if (error) {
        alert('결제 생성 중 오류가 발생했습니다: ' + error);
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error(err);
      alert('처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const calculateDays = () => {
    if (!selectedRange?.from || !selectedRange?.to) return 0;
    return differenceInDays(selectedRange.to, selectedRange.from) + 1;
  };

  const daysCount = calculateDays();
  const totalPrice = daysCount * 10000;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          {/* Left Side: Calendar */}
          <div className="md:w-1/2 p-8 border-r border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">날짜 선택</h2>
            <p className="text-gray-500 text-sm mb-6">시작일과 종료일을 클릭하여 기간을 선택해주세요.</p>

            <div className="flex justify-center">
              <style>{`
                .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #FF385C; --rdp-background-color: #F7F7F7; }
                .rdp-day_selected:not(.rdp-day_disabled) { background-color: #FF385C; color: white; font-weight: bold; }
                .rdp-day_selected:hover:not(.rdp-day_disabled) { background-color: #E00B41; }
                .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #F7F7F7; color: #FF385C; }
              `}</style>
              <DayPicker
                mode="range"
                selected={selectedRange}
                onSelect={setSelectedRange}
                disabled={bookedDates}
                locale={ko}
                modifiersStyles={{
                  disabled: { color: '#d1d5db', textDecoration: 'line-through' }
                }}
              />
            </div>

            {/* Image Upload Section */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">광고 배너 이미지</h3>

              <div className="mb-4">
                <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  <span className="mr-2">📁</span> 이미지 파일 선택
                  <input
                    accept="image/*"
                    className="hidden"
                    type="file"
                    onChange={handleImageSelect}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  권장: <strong>2560×224px</strong> (레티나 대응) | 최소: 1920×140px | 최대: 5MB
                </p>
              </div>

              {previewUrl && (
                <div className="space-y-4 mb-3 animate-fade-in">
                  <div className="border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-2 font-medium">📷 원본 이미지:</p>
                    <img alt="Preview" className="max-w-full max-h-48 rounded border border-gray-200 object-contain" src={previewUrl} />
                  </div>

                  <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
                    <p className="text-xs text-blue-700 mb-3 font-medium">👁️ 실제 사이트에서 보이는 모습 (크롭 적용):</p>

                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">📱 모바일 (70px 높이):</p>
                      <div className="bg-gray-100 rounded overflow-hidden max-w-[375px]">
                        <div className="h-[70px] overflow-hidden">
                          <img alt="Mobile preview" className="w-full h-full object-cover" src={previewUrl} />
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">💻 태블릿 (96px 높이):</p>
                      <div className="bg-gray-100 rounded overflow-hidden max-w-[768px]">
                        <div className="h-24 overflow-hidden">
                          <img alt="Tablet preview" className="w-full h-full object-cover" src={previewUrl} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 mb-1">🖥️ 데스크톱 (112px 높이):</p>
                      <div className="bg-gray-100 rounded overflow-hidden">
                        <div className="h-28 overflow-hidden">
                          <img alt="Desktop preview" className="w-full h-full object-cover" src={previewUrl} />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-orange-600 mt-3 flex items-start gap-1">
                      <span>⚠️</span><span>좌우가 잘릴 수 있습니다. 중요한 내용은 이미지 중앙에 배치하세요!</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Summary & Checkout */}
          <div className="md:w-1/2 p-8 bg-gray-50 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">예약 내역</h2>

              {selectedRange?.from ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">선택한 기간</span>
                      <span className="text-indigo-600 font-bold">{daysCount}일</span>
                    </div>
                    <div className="text-sm text-gray-800">
                      {format(selectedRange.from, 'yyyy.MM.dd')}
                      {selectedRange.to && ` ~ ${format(selectedRange.to, 'yyyy.MM.dd')}`}
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
                  <p>달력에서 기간을 선택해주세요</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={handlePurchase}
                disabled={!selectedRange?.from || !selectedRange?.to || loading || uploading || !imageFile}
                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white 
                  ${!selectedRange?.from || !selectedRange?.to || loading || uploading || !imageFile
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FF385C] to-[#BD1E59] hover:from-[#E00B41] hover:to-[#A3164B] transform hover:-translate-y-0.5 transition-all duration-200'
                  }`}
              >
                {uploading ? '이미지 업로드 중...' : loading ? '로딩 중...' : '예약하기'}
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
