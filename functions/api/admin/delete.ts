import { createClient } from '@supabase/supabase-js';

interface Env {
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const { bookingId } = await request.json() as { bookingId: string };

        if (!bookingId) {
            return new Response(JSON.stringify({ error: 'Missing bookingId' }), { status: 400 });
        }

        const supabase = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error } = await supabase
            .from('ad_bookings')
            .delete()
            .eq('id', bookingId);

        if (error) {
            console.error('Supabase Delete Error:', error);
            return new Response(JSON.stringify({ error: 'Database delete failed: ' + error.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err: any) {
        console.error('Delete API Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
