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
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBookedDates() {
      const { data, error } = await supabase
        .from('ad_bookings')
        .select('selected_date')
        .in('status', ['paid', 'approved']); // Block both paid and approved

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
          filter: "status=in.(paid,approved)", // Filter for realtime
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
    if (!linkUrl) {
      alert('연결할 링크(URL)를 입력해주세요.');
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
          imageUrl: imageUrl,
          linkUrl: linkUrl, // Pass link URL
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">광고 슬롯 예약하기</h1>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="lg:grid lg:grid-cols-12 lg:divide-x lg:divide-gray-100">

            {/* Column 1: Calendar (4 cols) */}
            <div className="lg:col-span-4 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold mr-3">1</span>
                날짜 선택
              </h2>
              <p className="text-gray-500 text-sm mb-6">시작일과 종료일을 클릭하여 광고를 게시할 기간을 선택해주세요.</p>

              <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-3">
                <span className="text-xl">💎</span>
                <div>
                  <h3 className="text-sm font-bold text-indigo-900">하루 단 하나의 브랜드만!</h3>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    해당 날짜는 오직 귀사의 광고만 독점 게시됩니다.<br />
                    방해받지 않는 최고의 주목도를 경험하세요.
                  </p>
                </div>
              </div>

              <div className="flex justify-center border border-gray-100 rounded-xl p-4 bg-gray-50/50">
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
            </div>

            {/* Column 2: Image Upload (4 cols) */}
            <div className="lg:col-span-4 p-6 sm:p-8 bg-gray-50/30">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold mr-3">2</span>
                이미지 업로드
              </h2>
              <p className="text-gray-500 text-sm mb-6">광고 배너로 사용할 이미지를 업로드하고 미리보기를 확인하세요.</p>

              <div className="mb-4">
                <label className={`w-full flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imageFile ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}>
                  <div className="flex flex-col items-center justify-center pt-4 pb-4">
                    <span className="text-2xl mb-2">📁</span>
                    <p className="mb-1 text-sm text-gray-500"><span className="font-semibold">클릭하여 업로드</span></p>
                    <p className="text-xs text-gray-400">PNG, JPG (최대 5MB)</p>
                  </div>
                  <input
                    accept="image/*"
                    className="hidden"
                    type="file"
                    onChange={handleImageSelect}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  권장 사이즈: <strong>2560×224px</strong> (최소 1920×140px)
                </p>
              </div>

              {previewUrl ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="border border-blue-200 rounded-lg p-3 bg-white shadow-sm">
                    <p className="text-xs text-blue-600 mb-2 font-bold flex items-center">
                      👁️ 미리보기 (자동 크롭)
                    </p>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">모바일 (70px)</p>
                        <div className="bg-gray-100 rounded overflow-hidden mx-auto max-w-[300px]">
                          <div className="h-[70px] overflow-hidden relative">
                            <img alt="Mobile" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover" src={previewUrl} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">태블릿 (96px)</p>
                        <div className="bg-gray-100 rounded overflow-hidden mx-auto max-w-[340px]">
                          <div className="h-[80px] overflow-hidden relative">
                            <img alt="Tablet" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover" src={previewUrl} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">데스크톱 (112px)</p>
                        <div className="bg-gray-100 rounded overflow-hidden">
                          <div className="h-[80px] overflow-hidden relative">
                            <img alt="Desktop" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover" src={previewUrl} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-orange-500 mt-2 text-center">
                      * 기기 해상도에 따라 좌우가 잘릴 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-100 rounded-lg border border-gray-200 border-dashed">
                  <p className="text-sm">이미지를 선택하면<br />미리보기가 표시됩니다.</p>
                </div>
              )}

              <div className="mt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  🔗 연결할 링크 (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  배너를 클릭했을 때 이동할 주소를 입력해주세요.
                </p>
              </div>
            </div>

            {/* Column 3: Summary & Checkout (4 cols) */}
            <div className="lg:col-span-4 p-6 sm:p-8 bg-gray-50 flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold mr-3">3</span>
                예약 확인
              </h2>

              <div className="flex-grow">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">선택 내역</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">기간</span>
                      <span className="font-medium text-gray-900">{daysCount}일</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">날짜</span>
                      <span className="font-medium text-gray-900 text-right">
                        {selectedRange?.from ? (
                          <>
                            {format(selectedRange.from, 'yyyy.MM.dd')}
                            {selectedRange.to && <br />}
                            {selectedRange.to && `~ ${format(selectedRange.to, 'yyyy.MM.dd')}`}
                          </>
                        ) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-500">이미지</span>
                      <span className="font-medium text-gray-900">
                        {imageFile ? <span className="text-green-600 flex items-center">✅ 업로드됨</span> : <span className="text-gray-400">미선택</span>}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 my-4"></div>

                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">총 결제 금액</span>
                    <span className="text-xl font-bold text-indigo-600">{totalPrice.toLocaleString()}원</span>
                  </div>
                  <p className="text-right text-xs text-gray-400 mt-1">VAT 포함</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                  <h4 className="text-xs font-bold text-blue-800 mb-2">💡 안내사항</h4>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>결제 완료 후 예약이 확정됩니다.</li>
                    <li>이미지는 관리자 승인 후 게시됩니다.</li>
                    <li>환불 규정은 이용약관을 참고해주세요.</li>
                  </ul>
                </div>
              </div>

              <div>
                <button
                  onClick={handlePurchase}
                  disabled={!selectedRange?.from || !selectedRange?.to || loading || uploading || !imageFile}
                  className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white transition-all duration-200
                    ${!selectedRange?.from || !selectedRange?.to || loading || uploading || !imageFile
                      ? 'bg-gray-300 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-[#FF385C] to-[#BD1E59] hover:from-[#E00B41] hover:to-[#A3164B] hover:-translate-y-1 hover:shadow-xl'
                    }`}
                >
                  {uploading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      업로드 중...
                    </span>
                  ) : loading ? '로딩 중...' : '예약 및 결제하기'}
                </button>
                <p className="mt-3 text-xs text-center text-gray-400 flex items-center justify-center gap-1">
                  🔒 Lemon Squeezy 안전 결제
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
