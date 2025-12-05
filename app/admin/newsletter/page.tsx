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

interface NewsletterSchedule {
    id: number;
    send_date: string;
    email_subject: string | null;
    intro_text: string | null;
    outro_text: string | null;
    ad_title: string | null;
    ad_description: string | null;
    ad_link_url: string | null;
    status: string;
    created_at: string;
}

interface ListmonkCampaign {
    id: number;
    name: string;
    subject: string;
    body: string;
    status: string;
    tags: string[];
}

export default function NewsletterAdminPage() {
    const [bookings, setBookings] = useState<AdBooking[]>([]);
    const [legacyAds, setLegacyAds] = useState<Advertisement[]>([]);
    const [schedules, setSchedules] = useState<NewsletterSchedule[]>([]);
    const [campaigns, setCampaigns] = useState<ListmonkCampaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<ListmonkCampaign | null>(null);
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

    // Newsletter Schedule Form State
    const [scheduleForm, setScheduleForm] = useState({
        send_date: '',
        send_time: '09:00', // Default time
        email_subject: '',
        intro_text: '',
        outro_text: '',
        ad_title: '',
        ad_description: '',
        ad_link_url: ''
    });

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('admin_newsletter_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_bookings' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'newsletter_schedule' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchData() {
        setLoading(true);

        // Fetch Bookings for Newsletter Ads
        const { data: bookingData, error: bookingError } = await supabase
            .from('ad_bookings')
            .select('*')
            .eq('ad_type', 'newsletter')
            .order('selected_date', { ascending: true });

        if (bookingError && bookingError.code !== 'PGRST204') {
            console.error('Error fetching bookings:', bookingError);
        }

        // Fetch Default/Legacy Ads
        const { data: legacyData, error: legacyError } = await supabase
            .from('advertisements')
            .select('*')
            .eq('position', 'newsletter')
            .order('created_at', { ascending: false });

        if (legacyError) {
            console.error('Error fetching legacy ads:', legacyError);
        }

        // Fetch Newsletter Schedules
        const { data: scheduleData, error: scheduleError } = await supabase
            .from('newsletter_schedule')
            .select('*')
            .order('send_date', { ascending: true });

        if (scheduleError) {
            console.error('Error fetching schedules:', scheduleError);
        }

        if (bookingData) setBookings(bookingData as AdBooking[]);
        if (legacyData) setLegacyAds(legacyData as Advertisement[]);
        if (scheduleData) setSchedules(scheduleData as NewsletterSchedule[]);

        // Fetch Listmonk Campaigns
        try {
            console.log('Fetching Listmonk campaigns...');
            const res = await fetch('/api/admin/newsletter/campaigns?status=draft');
            if (res.ok) {
                const data = await res.json() as { results: ListmonkCampaign[] };
                console.log('Campaigns fetched:', data.results);
                setCampaigns(data.results || []);
            } else {
                const errText = await res.text();
                console.error('Failed to fetch campaigns:', res.status, res.statusText, errText);
            }
        } catch (e) {
            console.error('Exception fetching campaigns:', e);
        }

        setLoading(false);
    }

    const handleDateSelect = (date: Date | undefined) => {
        setSelectedDate(date);
        if (date) {
            const booking = bookings.find(b => isSameDay(parseISO(b.selected_date), date));
            setSelectedBooking(booking || null);
            // Auto-fill schedule form date if selected
            setScheduleForm(prev => ({ ...prev, send_date: format(date, 'yyyy-MM-dd') }));
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
            const fileName = `legacy-newsletter-${Date.now()}.${fileExt}`;
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
            title: legacyForm.title || '뉴스레터 배너',
            link_url: legacyForm.link_url,
            image_url: imageUrl,
            is_active: legacyForm.is_active,
            priority: legacyForm.priority,
            position: 'newsletter'
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

    // Schedule Functions
    const handleScheduleSubmit = async () => {
        if (!scheduleForm.send_date) {
            alert('발송 날짜를 선택해주세요.');
            return;
        }

        // If a Listmonk campaign is selected, update and schedule it
        if (selectedCampaign) {
            if (!confirm(`'${selectedCampaign.name}' 캠페인을 ${scheduleForm.send_date} ${scheduleForm.send_time}에 발송 예약하시겠습니까?`)) return;

            try {
                // 1. Update Campaign Content
                // Calculate send_at first to include in update (to pass validation)
                const dateTimeStr = `${scheduleForm.send_date}T${scheduleForm.send_time || '09:00'}:00`;
                const sendAt = new Date(dateTimeStr).toISOString();

                const updateRes = await fetch('/api/admin/newsletter/campaigns', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: selectedCampaign.id,
                        name: selectedCampaign.name, // Keep existing name
                        subject: scheduleForm.email_subject,
                        body: scheduleForm.intro_text, // Simplified mapping
                        tags: selectedCampaign.tags,
                        send_at: sendAt // Include future date to allow update
                    })
                });

                if (!updateRes.ok) {
                    const errJson = await updateRes.json().catch(() => ({ error: '수정 응답 파싱 실패' })) as any;
                    throw new Error(`캠페인 수정 실패: ${errJson.error || updateRes.statusText}`);
                }

                // 2. Schedule Campaign (Status Change)
                const scheduleRes = await fetch('/api/admin/newsletter/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: selectedCampaign.id,
                        send_at: sendAt
                    })
                });

                if (!scheduleRes.ok) {
                    const errJson = await scheduleRes.json().catch(() => ({ error: '예약 응답 파싱 실패' })) as any;
                    throw new Error(`캠페인 예약 실패: ${errJson.error || scheduleRes.statusText}`);
                }

                alert('Listmonk 캠페인이 성공적으로 예약되었습니다!');
                fetchData();
                setSelectedCampaign(null);
                setScheduleForm({
                    send_date: '',
                    send_time: '09:00',
                    email_subject: '',
                    intro_text: '',
                    outro_text: '',
                    ad_title: '',
                    ad_description: '',
                    ad_link_url: ''
                });

            } catch (e: any) {
                console.error(e);
                alert('오류 발생: ' + e.message);
            }
            return;
        }

        // Original Logic (Supabase Schedule)
        const { error } = await supabase
            .from('newsletter_schedule')
            .insert([{
                send_date: scheduleForm.send_date,
                email_subject: scheduleForm.email_subject || null,
                intro_text: scheduleForm.intro_text || null,
                outro_text: scheduleForm.outro_text || null,
                ad_title: scheduleForm.ad_title || null,
                ad_description: scheduleForm.ad_description || null,
                ad_link_url: scheduleForm.ad_link_url || null,
                status: 'pending'
            }]);

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            alert('저장되었습니다! 🎉');
            setScheduleForm({
                send_date: '',
                send_time: '09:00',
                email_subject: '',
                intro_text: '',
                outro_text: '',
                ad_title: '',
                ad_description: '',
                ad_link_url: ''
            });
            fetchData();
        }
    };

    const deleteSchedule = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('newsletter_schedule').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchData();
    };


    // Calendar Modifiers
    const bookedDays = bookings.filter(b => b.status === 'paid' || b.status === 'approved').map(b => parseISO(b.selected_date));
    const pendingDays = bookings.filter(b => b.status === 'pending').map(b => parseISO(b.selected_date));
    const scheduledDays = schedules.map(s => parseISO(s.send_date));

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">뉴스레터 관리</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsLegacyModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        + 기본 광고 추가
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Calendar & Booking Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">📅 예약 및 발송 현황</h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-center">
                                <style>{`
                  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #4F46E5; --rdp-background-color: #EEF2FF; }
                  .rdp-day_selected:not(.rdp-day_disabled) { background-color: #4F46E5; color: white; font-weight: bold; }
                  .rdp-day_scheduled { border-bottom: 2px solid #10B981; }
                `}</style>
                                <DayPicker
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    modifiers={{ booked: bookedDays, pending: pendingDays, scheduled: scheduledDays }}
                                    modifiersStyles={{
                                        booked: { border: '2px solid #4F46E5', color: '#4F46E5', fontWeight: 'bold' },
                                        pending: { border: '2px solid #F59E0B', color: '#F59E0B' },
                                        scheduled: { textDecoration: 'underline', textDecorationColor: '#10B981', textDecorationThickness: '3px' }
                                    }}
                                    locale={ko}
                                />
                            </div>

                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 mb-3">
                                        {selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일') : '날짜를 선택하세요'}
                                    </h3>

                                    {selectedBooking ? (
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
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
                                        <div className="h-24 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl mb-4">
                                            <span className="text-xl mb-1">📭</span>
                                            <p className="text-xs">예약된 광고 없음</p>
                                        </div>
                                    )}
                                </div>

                                {/* Newsletter Schedule Form for Selected Date */}
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="text-sm font-bold text-blue-900 mb-3">📧 뉴스레터 발송 예약</h4>

                                    {/* Campaign Selector */}
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-blue-800 mb-1">Listmonk 캠페인 연동 (선택)</label>
                                        <select
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white text-gray-900"
                                            value={selectedCampaign?.id || ''}
                                            onChange={(e) => {
                                                const campaign = campaigns.find(c => c.id === Number(e.target.value));
                                                setSelectedCampaign(campaign || null);
                                                if (campaign) {
                                                    setScheduleForm(prev => ({
                                                        ...prev,
                                                        email_subject: campaign.subject,
                                                        intro_text: campaign.body
                                                    }));
                                                }
                                            }}
                                        >
                                            <option value="">-- 연동 안함 (직접 입력) --</option>
                                            {campaigns.map(c => (
                                                <option key={c.id} value={c.id}>[{c.id}] {c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">발송 날짜</label>
                                                <input
                                                    type="date"
                                                    value={scheduleForm.send_date}
                                                    onChange={(e) => setScheduleForm({ ...scheduleForm, send_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div className="w-1/3">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">시간</label>
                                                <input
                                                    type="time"
                                                    value={scheduleForm.send_time}
                                                    onChange={(e) => setScheduleForm({ ...scheduleForm, send_time: e.target.value })}
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="이메일 제목"
                                            value={scheduleForm.email_subject}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, email_subject: e.target.value })}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                        />
                                        <textarea
                                            placeholder="상단 인사말 (Intro)"
                                            rows={2}
                                            value={scheduleForm.intro_text}
                                            onChange={(e) => setScheduleForm({ ...scheduleForm, intro_text: e.target.value })}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                                        />
                                        <button onClick={handleScheduleSubmit} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                                            예약 저장
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">발송 예약 목록</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {schedules.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {format(new Date(item.send_date), 'yyyy-MM-dd')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {item.email_subject || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'sent' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {item.status === 'sent' ? '발송됨' : '대기중'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => deleteSchedule(item.id)} className="text-red-600 hover:text-red-900">삭제</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                        <h3 className="text-lg font-bold text-gray-900 mb-4">기본 광고 추가 (뉴스레터)</h3>
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
                                <input type="text" value={legacyForm.title} onChange={e => setLegacyForm({ ...legacyForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="예: 제휴 프로모션" />
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
