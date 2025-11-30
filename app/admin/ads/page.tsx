'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface AdBooking {
  id: string;
  selected_date: string;
  status: 'pending' | 'paid' | 'approved' | 'rejected';
  buyer_name: string;
  buyer_contact: string;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
  order_id: string | null;
}

interface LegacyAd {
  id: string;
  title: string;
  position: string;
  image_url: string | null;
  link_url: string;
  is_active: boolean;
  priority: number;
}

export default function AdminAdsPage() {
  const [bookings, setBookings] = useState<AdBooking[]>([]);
  const [legacyAds, setLegacyAds] = useState<LegacyAd[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Edit State
  const [editingBooking, setEditingBooking] = useState<AdBooking | null>(null);
  const [editingLegacy, setEditingLegacy] = useState<LegacyAd | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const supabase = createClient();

  const fetchBookings = async () => {
    setLoading(true);

    // 1. Fetch Bookings
    const { data: bookingData, error: bookingError } = await supabase
      .from('ad_bookings')
      .select('*')
      .order('selected_date', { ascending: false });

    if (bookingError) {
      console.error('Error fetching bookings:', bookingError);
      alert('데이터를 불러오는데 실패했습니다.');
    } else {
      setBookings(bookingData as AdBooking[]);
    }

    // 2. Fetch Legacy Ads
    const { data: legacyData, error: legacyError } = await supabase
      .from('advertisements')
      .select('*')
      .eq('position', 'banner-top')
      .order('created_at', { ascending: false });

    if (legacyError) {
      console.error('Error fetching legacy ads:', legacyError);
    } else {
      setLegacyAds(legacyData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleApprove = async (booking: AdBooking) => {
    if (!confirm('승인하시겠습니까? 승인 메일 발송 창이 열립니다.')) return;

    // 1. Call Approve API
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id })
      });

      if (!response.ok) {
        throw new Error('Approval failed');
      }

      // 2. Optimistic Update
      setBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, status: 'approved' } : b
      ));

      // 3. Open Mail Client
      const subject = `[Flight Viewer] 광고 예약이 승인되었습니다 (${booking.selected_date})`;
      const body = `안녕하세요, ${booking.buyer_name}님.\n\n신청하신 ${booking.selected_date} 광고 예약이 승인되었습니다.\n감사합니다.\n\nFlight Viewer 드림`;

      // Use Gmail Compose URL
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${booking.buyer_contact}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');

      // 4. Background Fetch
      fetchBookings();

    } catch (error) {
      console.error(error);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (booking: AdBooking) => {
    if (!confirm('거절하고 환불 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    if (!booking.order_id) {
      alert('주문 ID가 없어서 자동 환불을 할 수 없습니다. 수동으로 처리해주세요.');
      return;
    }

    // 1. Call Reject API (Refund + DB Update)
    try {
      const response = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          orderId: booking.order_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Reject failed');
      }

      // Optimistic Update
      setBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, status: 'rejected' } : b
      ));

      alert('환불 및 거절 처리가 완료되었습니다.');
      fetchBookings(); // Refresh to be sure

    } catch (err: any) {
      console.error(err);
      alert('거절 처리 중 오류 발생: ' + err.message);
    }

  };

  const handleDelete = async (booking: AdBooking) => {
    if (!confirm('정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id })
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Delete failed');
      }

      setBookings(prev => prev.filter(b => b.id !== booking.id));
      alert('삭제되었습니다.');
    } catch (err: any) {
      console.error(err);
      alert('삭제 실패: ' + err.message);
    }
  };

  const openEditBooking = (booking: AdBooking) => {
    setEditingBooking(booking);
    setEditForm({
      link_url: booking.link_url || '',
      image_url: booking.image_url || '',
      selected_date: booking.selected_date // Add date to form
    });
  };

  const openEditLegacy = (ad: LegacyAd) => {
    setEditingLegacy(ad);
    setEditForm({
      title: ad.title,
      link_url: ad.link_url,
      image_url: ad.image_url || '',
      is_active: ad.is_active,
      priority: ad.priority
    });
  };

  const closeEdit = () => {
    setEditingBooking(null);
    setEditingLegacy(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (editingBooking) {
      // Conflict Check if date changed
      if (editForm.selected_date !== editingBooking.selected_date) {
        const conflict = bookings.find(b =>
          b.selected_date === editForm.selected_date &&
          b.status !== 'rejected' &&
          b.id !== editingBooking.id
        );

        if (conflict) {
          alert(`해당 날짜(${editForm.selected_date})에는 이미 다른 예약이 있습니다.`);
          return;
        }
      }

      const { error } = await supabase
        .from('ad_bookings')
        .update({
          link_url: editForm.link_url,
          image_url: editForm.image_url,
          selected_date: editForm.selected_date
        })
        .eq('id', editingBooking.id);

      if (error) {
        alert('수정 실패: ' + error.message);
        return;
      }
    } else if (editingLegacy) {
      const { error } = await supabase
        .from('advertisements')
        .update({
          title: editForm.title,
          link_url: editForm.link_url,
          image_url: editForm.image_url,
          is_active: editForm.is_active,
          priority: editForm.priority
        })
        .eq('id', editingLegacy.id);

      if (error) {
        alert('수정 실패: ' + error.message);
        return;
      }
    }

    alert('수정되었습니다.');
    closeEdit();
    fetchBookings();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">결제완료 (승인대기)</span>;
      case 'approved': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">승인됨</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">거절됨 (환불완료)</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  // Calendar Helpers
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const today = new Date();

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">광고 예약 관리</h1>
          <button onClick={fetchBookings} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            새로고침
          </button>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-12 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">📅 예약 현황 ({format(currentMonth, 'yyyy년 M월')})</h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">◀</button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm hover:bg-gray-100 rounded">오늘</button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            {eachDayOfInterval({
              start: startOfWeek(startOfMonth(currentMonth)),
              end: endOfWeek(endOfMonth(currentMonth))
            }).map((day, idx) => {
              const dayBookings = bookings.filter(b => isSameDay(parseISO(b.selected_date), day) && b.status !== 'rejected');
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);

              return (
                <div key={day.toISOString()} className={`bg-white min-h-[120px] p-2 ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}`}>
                  <div className={`text-sm mb-1 ${isToday ? 'font-bold text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayBookings.map(booking => {
                      const bgColor = booking.status === 'approved' ? '#dcfce7' : booking.status === 'paid' ? '#fef9c3' : '#f3f4f6';
                      const textColor = booking.status === 'approved' ? '#166534' : booking.status === 'paid' ? '#854d0e' : '#1f2937';
                      const borderColor = stringToColor(booking.buyer_name); // Unique color border

                      return (
                        <div
                          key={booking.id}
                          onClick={() => openEditBooking(booking)}
                          className="text-xs p-1 rounded cursor-pointer truncate transition-all group relative border-l-4 hover:shadow-md"
                          style={{ backgroundColor: bgColor, color: textColor, borderLeftColor: borderColor }}
                        >
                          {booking.buyer_name}

                          {/* Tooltip */}
                          <div className="hidden group-hover:block absolute z-20 left-0 top-full mt-1 w-64 bg-white text-gray-800 text-xs rounded-lg p-3 shadow-xl border border-gray-200">
                            <div className="flex gap-3">
                              {booking.image_url ? (
                                <img src={booking.image_url} alt="Ad" className="w-16 h-16 object-cover rounded bg-gray-100" />
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">No Img</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm mb-1">{booking.buyer_name}</p>
                                <p className="text-gray-500 mb-1">{booking.buyer_contact}</p>
                                <div className="flex items-center gap-1 mb-1">
                                  <span className={`w-2 h-2 rounded-full ${booking.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                  <span>{booking.status}</span>
                                </div>
                                {booking.link_url && <a href={booking.link_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate block" onClick={e => e.stopPropagation()}>{booking.link_url}</a>}
                              </div>
                            </div>
                            <p className="text-gray-400 mt-2 text-[10px] text-right">클릭하여 수정</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 1: Bookings */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">📅 날짜별 예약 광고</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden mb-12">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : bookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">예약 내역이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이미지</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">링크</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구매자 정보</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(booking.selected_date), 'yyyy-MM-dd (eee)', { locale: ko })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {booking.image_url ? (
                          <a href={booking.image_url} target="_blank" rel="noreferrer" className="block w-24 h-12 bg-gray-100 rounded overflow-hidden relative group">
                            <img src={booking.image_url} alt="Ad" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 text-xs">확대</span>
                            </div>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">이미지 없음</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 truncate max-w-xs">
                        {booking.link_url ? (
                          <a
                            href={booking.link_url.startsWith('http') ? booking.link_url : `https://${booking.link_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {booking.link_url}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="font-medium text-gray-900">{booking.buyer_name}</div>
                        <div className="text-xs">{booking.buyer_contact}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() => openEditBooking(booking)}
                            className="text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200"
                          >
                            수정
                          </button>
                          {booking.status === 'paid' && (
                            <>
                              <button
                                onClick={() => handleApprove(booking)}
                                className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs"
                              >
                                승인
                              </button>
                              <button
                                onClick={() => handleReject(booking)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs"
                              >
                                거절
                              </button>
                            </>
                          )}
                          {booking.status === 'approved' && (
                            <button
                              onClick={() => handleReject(booking)}
                              className="text-gray-400 hover:text-red-600 text-xs underline ml-2"
                            >
                              환불
                            </button>
                          )}
                          {booking.status === 'rejected' && (
                            <button
                              onClick={() => handleDelete(booking)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs ml-2"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Legacy Ads */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">🖼️ 기본 광고 (예약 없을 때 노출)</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {legacyAds.length === 0 ? (
            <div className="p-8 text-center text-gray-500">등록된 기본 광고가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">위치</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이미지</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">링크</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {legacyAds.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ad.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ad.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ad.image_url ? (
                          <a href={ad.image_url} target="_blank" rel="noreferrer" className="block w-24 h-12 bg-gray-100 rounded overflow-hidden relative group">
                            <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover" />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 truncate max-w-xs">
                        <a href={ad.link_url} target="_blank" rel="noreferrer" className="hover:underline">{ad.link_url}</a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {ad.is_active ? <span className="text-green-600 font-bold">활성</span> : <span className="text-gray-400">비활성</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditLegacy(ad)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {(editingBooking || editingLegacy) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingBooking ? '예약 정보 수정' : '기본 광고 수정'}
            </h3>

            <div className="space-y-4">
              {editingBooking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">날짜 (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={editForm.selected_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, selected_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-red-500 mt-1">⚠️ 날짜 변경 시 다른 예약과 겹치면 저장되지 않습니다.</p>
                </div>
              )}

              {editingLegacy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL</label>
                <input
                  type="url"
                  value={editForm.link_url || ''}
                  onChange={(e) => setEditForm({ ...editForm, link_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이미지</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="이미지 URL 입력"
                    value={editForm.image_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">또는 파일 업로드:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                          const filePath = `ads/${fileName}`;

                          const { error: uploadError } = await supabase.storage
                            .from('ad-images')
                            .upload(filePath, file);

                          if (uploadError) throw uploadError;

                          const { data: { publicUrl } } = supabase.storage
                            .from('ad-images')
                            .getPublicUrl(filePath);

                          setEditForm({ ...editForm, image_url: publicUrl });
                        } catch (error: any) {
                          alert('이미지 업로드 실패: ' + error.message);
                        }
                      }}
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {editForm.image_url && (
                    <img src={editForm.image_url} alt="Preview" className="h-20 w-auto object-contain rounded border border-gray-200" />
                  )}
                </div>
              </div>

              {editingLegacy && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_active || false}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">활성화</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700">우선순위:</label>
                    <input
                      type="number"
                      value={editForm.priority ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                취소
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
