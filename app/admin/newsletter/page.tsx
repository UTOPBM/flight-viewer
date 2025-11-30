'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

export default function NewsletterAdminPage() {
    const [schedules, setSchedules] = useState<NewsletterSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Form State
    const [formData, setFormData] = useState({
        send_date: '',
        email_subject: '',
        intro_text: '',
        outro_text: '',
        ad_title: '',
        ad_description: '',
        ad_link_url: ''
    });

    const fetchSchedules = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('newsletter_schedule')
            .select('*')
            .order('send_date', { ascending: true });

        if (error) {
            console.error('Error fetching schedules:', error);
            alert('데이터를 불러오는데 실패했습니다: ' + error.message);
        } else {
            setSchedules(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.send_date) {
            alert('발송 날짜를 선택해주세요.');
            return;
        }

        const { error } = await supabase
            .from('newsletter_schedule')
            .insert([{
                send_date: formData.send_date,
                email_subject: formData.email_subject || null,
                intro_text: formData.intro_text || null,
                outro_text: formData.outro_text || null,
                ad_title: formData.ad_title || null,
                ad_description: formData.ad_description || null,
                ad_link_url: formData.ad_link_url || null,
                status: 'pending'
            }]);

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            alert('저장되었습니다! 🎉');
            setFormData({
                send_date: '',
                email_subject: '',
                intro_text: '',
                outro_text: '',
                ad_title: '',
                ad_description: '',
                ad_link_url: ''
            });
            fetchSchedules();
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('newsletter_schedule')
            .delete()
            .eq('id', id);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            fetchSchedules();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">뉴스레터 예약 관리</h1>
                    <button onClick={fetchSchedules} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        새로고침
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow p-6 sticky top-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">새 예약 추가</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">발송 날짜</label>
                                    <input
                                        type="date"
                                        name="send_date"
                                        value={formData.send_date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일 제목</label>
                                    <input
                                        type="text"
                                        name="email_subject"
                                        placeholder="예: 12월의 첫 특가 항공권 🎄"
                                        value={formData.email_subject}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">상단 인사말 (Intro)</label>
                                    <textarea
                                        name="intro_text"
                                        rows={3}
                                        placeholder="안녕하세요! 오늘은 일본 특가가 많습니다."
                                        value={formData.intro_text}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">하단 맺음말 (Outro)</label>
                                    <textarea
                                        name="outro_text"
                                        rows={3}
                                        placeholder="감사합니다. 내일 또 만나요!"
                                        value={formData.outro_text}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <h4 className="text-sm font-bold text-gray-900 mb-3">📢 하단 광고 설정 (선택)</h4>
                                    <div className="space-y-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">광고 제목</label>
                                            <input
                                                type="text"
                                                name="ad_title"
                                                placeholder="예: 🌏 해외여행자 보험 추천"
                                                value={formData.ad_title}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">광고 설명</label>
                                            <input
                                                type="text"
                                                name="ad_description"
                                                placeholder="예: 안전한 여행을 위한 필수 보험"
                                                value={formData.ad_description}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">링크 URL</label>
                                            <input
                                                type="text"
                                                name="ad_link_url"
                                                placeholder="https://..."
                                                value={formData.ad_link_url}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold transition-colors"
                                >
                                    예약 저장하기
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">예약 목록</h3>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center text-gray-500">로딩 중...</div>
                            ) : schedules.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">예약된 뉴스레터가 없습니다.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">광고</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {schedules.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {format(new Date(item.send_date), 'yyyy-MM-dd (eee)', { locale: ko })}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {item.email_subject || <span className="text-gray-400">(기본 제목)</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.ad_title ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                있음
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.status === 'sent' ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                발송 완료
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                대기 중
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                                                        >
                                                            삭제
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
                </div>
            </div>
        </div>
    );
}
