import { createClient } from '@supabase/supabase-js';

interface Env {
    LEMON_SQUEEZY_API_KEY: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const { bookingId, orderId } = await request.json() as { bookingId: string, orderId: string };

        if (!bookingId || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing bookingId or orderId' }), { status: 400 });
        }

        // 1. Refund via Lemon Squeezy
        const refundResponse = await fetch(`https://api.lemonsqueezy.com/v1/orders/${orderId}/refund`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${env.LEMON_SQUEEZY_API_KEY}`
            },
            body: JSON.stringify({
                data: {
                    type: "orders",
                    id: orderId.toString(),
                    attributes: {}
                }
            })
        });

        if (!refundResponse.ok) {
            const errorText = await refundResponse.text();
            console.error('Lemon Squeezy Refund Error:', errorText);
            return new Response(JSON.stringify({ error: 'Refund failed: ' + errorText }), { status: 400 });
        }

        // 2. Update Supabase Status (Service Role)
        const supabase = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: dbError } = await supabase
            .from('ad_bookings')
            .update({ status: 'rejected' })
            .eq('id', bookingId);

        if (dbError) {
            console.error('Supabase Update Error:', dbError);
            return new Response(JSON.stringify({ error: 'Database update failed: ' + dbError.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err: any) {
        console.error('Reject API Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
