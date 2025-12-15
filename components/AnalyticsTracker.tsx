'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const isFirstRun = useRef(true);
    const lastTrackedPath = useRef('');

    useEffect(() => {
        // Construct full path with query params for better granularity
        const query = searchParams.toString();
        const fullPath = query ? `${pathname}?${query}` : pathname;

        // Debounce/Prevent duplicate tracking (especially in React Strict Mode or fast re-renders)
        // Only track if path actually changed or it's the very first load
        if (fullPath === lastTrackedPath.current) {
            return;
        }

        const trackView = async () => {
            lastTrackedPath.current = fullPath;

            try {
                await supabase.from('analytics_logs').insert({
                    path: fullPath,
                    referrer: document.referrer || null,
                    user_agent: navigator.userAgent
                });
            } catch (error) {
                console.error('Failed to track analytics:', error);
            }
        };

        trackView();

    }, [pathname, searchParams, supabase]);

    return null; // This component renders nothing
}
