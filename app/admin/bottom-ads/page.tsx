'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface AdBooking {
    id: string;
    selected_date: string;
    status: 'pending' | 'paid' | 'approved' | 'rejected';
    image_url: string;
    link_url: string;
    user_email: string;
    created_at: string;
    ad_type?: string;
}

interface Advertisement {
    id: string;
    title: string;
    image_url: string;
    link_url: string;
    is_active: boolean;
    priority: number;
    position: string;
    created_at: string;
}

export default function BottomAdsAdmin() {
    const [bookings, setBookings] = useState<AdBooking[]>([]);
    const [legacyAds, setLegacyAds] = useState<Advertisement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedBooking, setSelectedBooking] = useState<AdBooking | null>(null);
    const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);
    const supabase = createClient();

    // Legacy Ad Form State
    const [legacyForm, setLegacyForm] = useState({
        title: '',
        link_url: '',
        is_active: true,
        priority: 0,
        imageFile: null as File | null,
        previewUrl: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('admin_bottom_ads_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_bookings' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchData() {
        setLoading(true);

        // Fetch Bookings for Bottom Ads
        const { data: bookingData, error: bookingError } = await supabase
            .from('ad_bookings')
            .select('*')
            .eq('ad_type', 'bottom')
            .order('selected_date', { ascending: true });

        if (bookingError && bookingError.code !== 'PGRST204') {
            console.error('Error fetching bookings:', bookingError);
        }

        // Fetch Default/Legacy Ads
        const { data: legacyData, error: legacyError } = await supabase
            .from('advertisements')
            .select('*')
            .eq('position', 'banner-bottom')
            .order('created_at', { ascending: false });

        if (legacyError) {
            console.error('Error fetching legacy ads:', legacyError);
        }

        if (bookingData) setBookings(bookingData as AdBooking[]);
        if (legacyData) setLegacyAds(legacyData as Advertisement[]);
        setLoading(false);
    }

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
        if (date) {
            const booking = bookings.find(b => isSameDay(parseISO(b.selected_date), date));
            setSelectedBooking(booking || null);
        } else {
            setSelectedBooking(null);
        }
    };

    const updateBookingStatus = async (id: string, status: AdBooking['status']) => {
        const { error } = await supabase
            .from('ad_bookings')
            .update({ status })
            .eq('id', id);

        if (error) {
            alert('상태 업데이트 실패: ' + error.message);
        } else {
            fetchData();
            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking({ ...selectedBooking, status });
            }
        }
    };

    const deleteBooking = async (id: string) => {
        if (!confirm('정말 이 예약을 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('ad_bookings')
            .delete()
            .eq('id', id);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            fetchData();
            setSelectedBooking(null);
        }
    };

    // Legacy Ad Functions
    const handleLegacyImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLegacyForm({ ...legacyForm, imageFile: file, previewUrl: URL.createObjectURL(file) });
        }
    };

    const saveLegacyAd = async () => {
        if (!legacyForm.imageFile && !legacyForm.previewUrl) return alert('이미지를 선택해주세요.');
        setUploading(true);

        let imageUrl = legacyForm.previewUrl;
        if (legacyForm.imageFile) {
            const fileExt = legacyForm.imageFile.name.split('.').pop();
            const fileName = `legacy-bottom-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('ad-images').upload(fileName, legacyForm.imageFile);
            if (uploadError) {
                alert('이미지 업로드 실패');
                setUploading(false);
                return;
            }
            const { data } = supabase.storage.from('ad-images').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const { error } = await supabase.from('advertisements').insert({
            title: legacyForm.title || '하단 배너',
            link_url: legacyForm.link_url,
            image_url: imageUrl,
            is_active: legacyForm.is_active,
            priority: legacyForm.priority,
            position: 'banner-bottom'
        });

        if (error) alert('저장 실패: ' + error.message);
        else {
            setIsLegacyModalOpen(false);
            fetchData();
            setLegacyForm({ title: '', link_url: '', is_active: true, priority: 0, imageFile: null, previewUrl: '' });
        }
        setUploading(false);
    };

    const toggleLegacyAdStatus = async (id: string, currentStatus: boolean) => {
        await supabase.from('advertisements').update({ is_active: !currentStatus }).eq('id', id);
        fetchData();
    };

    const deleteLegacyAd = async (id: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await supabase.from('advertisements').delete().eq('id', id);
        fetchData();
    };

    // Calendar Modifiers
    const bookedDays = bookings.filter(b => b.status === 'paid' || b.status === 'approved').map(b => parseISO(b.selected_date));
    const pendingDays = bookings.filter(b => b.status === 'pending').map(b => parseISO(b.selected_date));

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">하단 배너 광고 관리</h1>
                <button
                    onClick={() => setIsLegacyModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
                >
                    + 기본 광고 추가
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Calendar & Booking Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">📅 예약 현황</h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-center">
                                <style>{`
                  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #4F46E5; --rdp-background-color: #EEF2FF; }
                  .rdp-day_selected:not(.rdp-day_disabled) { background-color: #4F46E5; color: white; font-weight: bold; }
                `}</style>
                                <DayPicker
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    modifiers={{ booked: bookedDays, pending: pendingDays }}
                                    modifiersStyles={{
                                        booked: { border: '2px solid #4F46E5', color: '#4F46E5', fontWeight: 'bold' },
                                        pending: { border: '2px solid #F59E0B', color: '#F59E0B' }
                                    }}
                                    locale={ko}
                                />
                            </div>

                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-gray-500 mb-3">
                                    {selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일') : '날짜를 선택하세요'}
                                </h3>

                                {selectedBooking ? (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="h-32 bg-gray-100 relative">
                                            <img src={selectedBooking.image_url} alt="Ad" className="w-full h-full object-cover" />
                                            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white
                        ${selectedBooking.status === 'approved' ? 'bg-green-500' :
                                                    selectedBooking.status === 'paid' ? 'bg-blue-500' :
                                                        selectedBooking.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                                {selectedBooking.status.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div>
                                                <p className="text-xs text-gray-500">링크 URL</p>
                                                <a href={selectedBooking.link_url} target="_blank" className="text-sm text-blue-600 hover:underline truncate block">
                                                    {selectedBooking.link_url}
                                                </a>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">예약자</p>
                                                <p className="text-sm text-gray-900">{selectedBooking.user_email || '비회원'}</p>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                {selectedBooking.status !== 'approved' && (
                                                    <button onClick={() => updateBookingStatus(selectedBooking.id, 'approved')} className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100">승인</button>
                                                )}
                                                {selectedBooking.status !== 'rejected' && (
                                                    <button onClick={() => updateBookingStatus(selectedBooking.id, 'rejected')} className="flex-1 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100">거절</button>
                                                )}
                                                <button onClick={() => deleteBooking(selectedBooking.id)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">삭제</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-8">
                                        <span className="text-2xl mb-2">📭</span>
                                        <p className="text-sm">해당 날짜에 예약된 광고가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Legacy/Default Ads List */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">🖼️ 기본 광고 목록</h2>
                        <p className="text-xs text-gray-500 mb-4">예약이 없는 날짜에 랜덤으로 노출됩니다.</p>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {legacyAds.map(ad => (
                                <div key={ad.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                                    <div className="flex gap-3 mb-3">
                                        <div className="w-20 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                            <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 truncate">{ad.title}</h4>
                                            <a href={ad.link_url} target="_blank" className="text-xs text-blue-500 hover:underline truncate block">
                                                {ad.link_url}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => toggleLegacyAdStatus(ad.id, ad.is_active)}
                                            className={`px-2 py-1 rounded text-xs font-bold ${ad.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                        >
                                            {ad.is_active ? '활성' : '비활성'}
                                        </button>
                                        <button onClick={() => deleteLegacyAd(ad.id)} className="text-xs text-red-500 hover:text-red-700">삭제</button>
                                    </div>
                                </div>
                            ))}
                            {legacyAds.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-4">등록된 기본 광고가 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legacy Ad Modal */}
            {isLegacyModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">기본 광고 추가 (하단)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">이미지</label>
                                <input type="file" accept="image/*" onChange={handleLegacyImageSelect} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                {legacyForm.previewUrl && (
                                    <div className="mt-2 h-20 bg-gray-100 rounded overflow-hidden">
                                        <img src={legacyForm.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">제목 (관리용)</label>
                                <input type="text" value={legacyForm.title} onChange={e => setLegacyForm({ ...legacyForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="예: 쿠팡 파트너스 배너" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">링크 URL</label>
                                <input type="url" value={legacyForm.link_url} onChange={e => setLegacyForm({ ...legacyForm, link_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => setIsLegacyModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">취소</button>
                                <button onClick={saveLegacyAd} disabled={uploading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                                    {uploading ? '저장 중...' : '저장하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
