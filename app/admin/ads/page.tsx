'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
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

    // 1. Update DB Status
    const { error } = await supabase
      .from('ad_bookings')
      .update({ status: 'approved' })
      .eq('id', booking.id);

    if (error) {
      alert('상태 업데이트 실패');
      return;
    }

    // 2. Open Mail Client
    const subject = `[Flight Viewer] 광고 예약이 승인되었습니다 (${booking.selected_date})`;
    const body = `안녕하세요, ${booking.buyer_name}님.\n\n신청하신 ${booking.selected_date} 광고 예약이 승인되었습니다.\n감사합니다.\n\nFlight Viewer 드림`;
    window.location.href = `mailto:${booking.buyer_contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    fetchBookings();
  };

  const handleReject = async (booking: AdBooking) => {
    if (!confirm('거절하고 환불 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    if (!booking.order_id) {
      alert('주문 ID가 없어서 자동 환불을 할 수 없습니다. 수동으로 처리해주세요.');
      return;
    }

    // 1. Call Refund API
    try {
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: booking.order_id })
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Refund failed');
      }

      // 2. Update DB Status
      const { error } = await supabase
        .from('ad_bookings')
        .update({ status: 'rejected' })
        .eq('id', booking.id);

      if (error) throw error;

      alert('환불 및 거절 처리가 완료되었습니다.');
      fetchBookings();

    } catch (err: any) {
      console.error(err);
      alert('환불 처리 중 오류 발생: ' + err.message);
    }
  };

  const openEditBooking = (booking: AdBooking) => {
    setEditingBooking(booking);
    setEditForm({
      link_url: booking.link_url || '',
      image_url: booking.image_url || ''
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
      const { error } = await supabase
        .from('ad_bookings')
        .update({
          link_url: editForm.link_url,
          image_url: editForm.image_url
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">광고 예약 관리</h1>
          <button onClick={fetchBookings} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            새로고침
          </button>
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
                          <a href={booking.link_url} target="_blank" rel="noreferrer" className="hover:underline">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
                <input
                  type="text"
                  value={editForm.image_url || ''}
                  onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
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
                      value={editForm.priority || 0}
                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
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
