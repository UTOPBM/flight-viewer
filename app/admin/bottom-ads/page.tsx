'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface BottomAd {
    id: string;
    title: string;
    image_url: string | null;
    link_url: string;
    is_active: boolean;
    priority: number;
    created_at: string;
}

export default function BottomAdsPage() {
    const [ads, setAds] = useState<BottomAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingAd, setEditingAd] = useState<BottomAd | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        image_url: '',
        link_url: '',
        is_active: true,
        priority: 0
    });

    const supabase = createClient();

    const fetchAds = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('advertisements')
            .select('*')
            .eq('position', 'banner-bottom')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching ads:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        } else {
            setAds(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAds();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async () => {
        if (!formData.title) {
            alert('제목을 입력해주세요.');
            return;
        }

        const payload = {
            title: formData.title,
            image_url: formData.image_url,
            link_url: formData.link_url,
            is_active: formData.is_active,
            priority: formData.priority,
            position: 'banner-bottom'
        };

        let error;
        if (editingAd) {
            const { error: updateError } = await supabase
                .from('advertisements')
                .update(payload)
                .eq('id', editingAd.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('advertisements')
                .insert([payload]);
            error = insertError;
        }

        if (error) {
            alert('저장 실패: ' + error.message);
        } else {
            alert('저장되었습니다!');
            resetForm();
            fetchAds();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const { error } = await supabase
            .from('advertisements')
            .delete()
            .eq('id', id);

        if (error) {
            alert('삭제 실패: ' + error.message);
        } else {
            fetchAds();
        }
    };

    const startEdit = (ad: BottomAd) => {
        setEditingAd(ad);
        setFormData({
            title: ad.title,
            image_url: ad.image_url || '',
            link_url: ad.link_url || '',
            is_active: ad.is_active,
            priority: ad.priority
        });
    };

    const resetForm = () => {
        setEditingAd(null);
        setFormData({
            title: '',
            image_url: '',
            link_url: '',
            is_active: true,
            priority: 0
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">하단 배너 광고 관리</h1>
                    <button onClick={fetchAds} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        새로고침
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow p-6 sticky top-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                {editingAd ? '광고 수정' : '새 광고 추가'}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">제목 (관리용)</label>
                                    <input
                                        type="text"
                                        name="title"
                                        placeholder="예: 하단 배너 1"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이미지</label>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            name="image_url"
                                            placeholder="이미지 URL 입력"
                                            value={formData.image_url}
                                            onChange={handleInputChange}
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

                                                        setFormData(prev => ({ ...prev, image_url: publicUrl }));
                                                    } catch (error: any) {
                                                        alert('이미지 업로드 실패: ' + error.message);
                                                    }
                                                }}
                                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                        </div>
                                        {formData.image_url && (
                                            <div className="mt-2 border rounded p-1">
                                                <img src={formData.image_url} alt="Preview" className="w-full h-auto object-contain" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL</label>
                                    <input
                                        type="text"
                                        name="link_url"
                                        placeholder="https://..."
                                        value={formData.link_url}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleCheckboxChange}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">활성화</span>
                                    </label>

                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-700">우선순위:</label>
                                        <input
                                            type="number"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleInputChange}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <button
                                        onClick={handleSubmit}
                                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-bold transition-colors"
                                    >
                                        {editingAd ? '수정 저장' : '추가하기'}
                                    </button>
                                    {editingAd && (
                                        <button
                                            onClick={resetForm}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                        >
                                            취소
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h4 className="text-sm font-bold text-gray-500 mb-3">미리보기</h4>
                                {formData.image_url ? (
                                    <div className="w-full rounded-lg overflow-hidden border border-gray-200">
                                        <img src={formData.image_url} alt="Preview" className="w-full h-auto object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                        이미지 없음
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">등록된 하단 배너</h3>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center text-gray-500">로딩 중...</div>
                            ) : ads.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">등록된 배너가 없습니다.</div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {ads.map((ad) => (
                                        <div key={ad.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-lg font-bold text-gray-900">{ad.title}</h4>
                                                        {ad.is_active ? (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">비활성</span>
                                                        )}
                                                        <span className="text-xs text-gray-500">우선순위: {ad.priority}</span>
                                                    </div>
                                                    <a href={ad.link_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm">
                                                        {ad.link_url}
                                                    </a>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => startEdit(ad)}
                                                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm"
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(ad.id)}
                                                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm"
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Visual Representation */}
                                            {ad.image_url ? (
                                                <div className="w-full rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={ad.image_url} alt={ad.title} className="w-full h-auto object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                                    이미지 없음
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
