import { createClient } from '@supabase/supabase-js';

interface Env {
    LEMON_SQUEEZY_WEBHOOK_SECRET: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

const verifySignature = async (secret: string, signature: string, body: string) => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const signatureBuffer = new Uint8Array(
        signature.match(/[\da-f]{2}/gi)!.map((h) => parseInt(h, 16))
    );

    return await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBuffer,
        encoder.encode(body)
    );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const text = await request.text();
        const signature = request.headers.get('x-signature') || '';
        const secret = env.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

        const isValid = await verifySignature(secret, signature, text);

        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const payload = JSON.parse(text);
        const eventName = payload.meta.event_name;

        if (eventName === 'order_created') {
            const selectedDatesStr = payload.meta.custom_data?.selected_dates || payload.meta.custom_data?.selected_date;
            const imageUrl = payload.meta.custom_data?.image_url;
            const buyerName = payload.data.attributes.user_name;
            const buyerEmail = payload.data.attributes.user_email;
            const orderId = payload.data.id; // Lemon Squeezy Order ID

            if (selectedDatesStr) {
                const supabase = createClient(
                    env.NEXT_PUBLIC_SUPABASE_URL,
                    env.SUPABASE_SERVICE_ROLE_KEY
                );

                const dates = selectedDatesStr.split(',');

                const inserts = dates.map((date: string) => ({
                    selected_date: date.trim(),
                    status: 'paid',
                    buyer_name: buyerName,
                    buyer_contact: buyerEmail,
                    image_url: imageUrl,
                    order_id: orderId
                }));

                const { error } = await supabase
                    .from('ad_bookings')
                    .insert(inserts);

                if (error) {
                    console.error('Supabase Insert Error:', error);
                    return new Response(JSON.stringify({ error: 'Database error' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // Send Notification
                try {
                    const notiSecretKey = '3b1478a7-d678-4400-8516-0aa4fc82b433';
                    const nickname = 'hhh0909';
                    const title = encodeURIComponent('새로운 광고 예약! 🎉');
                    const body = encodeURIComponent(`${buyerName}님이 ${selectedDatesStr} 광고를 예약했습니다.`);

                    await fetch(`https://asia-northeast3-noti-lab-production.cloudfunctions.net/api//notification/v1/notification?nickname=${nickname}&title=${title}&body=${body}&secretKey=${notiSecretKey}`);
                } catch (notiError) {
                    console.error('Notification Error:', notiError);
                    // Don't fail the webhook if notification fails
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
