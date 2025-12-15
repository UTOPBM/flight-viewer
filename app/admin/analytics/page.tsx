'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AnalyticsPage() {
    const supabase = createClient();
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [topPaths, setTopPaths] = useState<any[]>([]);
    const [topReferrers, setTopReferrers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // Fetch all logs (limit to recent 10000 or similar for performance if needed, or aggregate)
            // For simple analytics without aggregation queries (which require RPC or complex SQL), 
            // we will fetch data and aggregate in JS for MVP.
            // Limiting to last 7 days for now.
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data, error } = await supabase
                .from('analytics_logs')
                .select('*')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                processData(data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const processData = (logs: any[]) => {
        // 1. Daily Stats
        const dailyCounts: Record<string, number> = {};
        logs.forEach(log => {
            const date = new Date(log.created_at).toLocaleDateString('ko-KR');
            dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });
        const sortedDaily = Object.entries(dailyCounts).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()); // Newest first

        // 2. Top Paths
        const pathCounts: Record<string, number> = {};
        logs.forEach(log => {
            // Strip query params for general page view count, or keep them?
            // Let's strip them for aggregation, but maybe keep them for specific search tracking?
            // User asked: "Which link they enter".
            // Let's keep full path for now, maybe strip `?` if it's too noisy.
            // Actually, stripping `search` param might be better for "Page Views", 
            // but tracking "Search Queries" is also useful. 
            // Let's display raw path for now.
            const url = log.path;
            pathCounts[url] = (pathCounts[url] || 0) + 1;
        });
        const sortedPaths = Object.entries(pathCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // 3. Top Referrers
        const refCounts: Record<string, number> = {};
        logs.forEach(log => {
            let ref = log.referrer || 'Direct / Unknown';
            try {
                if (ref !== 'Direct / Unknown') {
                    const url = new URL(ref);
                    ref = url.hostname; // Just show domain
                }
            } catch (e) {
                // ignore invalid urls
            }
            refCounts[ref] = (refCounts[ref] || 0) + 1;
        });
        const sortedRefs = Object.entries(refCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        setDailyStats(sortedDaily);
        setTopPaths(sortedPaths);
        setTopReferrers(sortedRefs);
    };

    if (loading) return <div className="p-8">Loading analytics...</div>;

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">방문자 통계 (최근 7일)</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Visitor Count */}
                <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">📅 일별 방문수</h2>
                    <ul className="divide-y divide-gray-200">
                        {dailyStats.map(([date, count]) => (
                            <li key={date} className="py-2 flex justify-between">
                                <span className="text-gray-600">{date}</span>
                                <span className="font-semibold text-blue-600">{count}회</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Top Referrers */}
                <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">🔗 유입 경로 (도메인)</h2>
                    <ul className="divide-y divide-gray-200">
                        {topReferrers.map(([ref, count]) => (
                            <li key={ref} className="py-2 flex justify-between">
                                <span className="text-gray-600 truncate max-w-[70%]">{ref}</span>
                                <span className="font-semibold text-green-600">{count}회</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Top Paths */}
            <div className="mt-6 bg-white overflow-hidden shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">📄 인기 페이지 (경로)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL 경로</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">조회수</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {topPaths.map(([path, count]) => (
                                <tr key={path}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{path}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
