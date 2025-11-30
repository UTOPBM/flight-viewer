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
            const selectedDatesStr = payload.meta.custom_data?.selected_dates;
            const imageUrl = payload.meta.custom_data?.image_url;
            const linkUrl = payload.meta.custom_data?.link_url; // Extract Link URL
            const adType = payload.meta.custom_data?.ad_type || 'top'; // Extract Ad Type, default to 'top'
            const buyerName = payload.data.attributes.user_name;
            const buyerEmail = payload.data.attributes.user_email;
            const orderId = payload.data.id; // Lemon Squeezy Order ID

            if (selectedDatesStr) {
                const supabase = createClient(
                    env.NEXT_PUBLIC_SUPABASE_URL,
                    env.SUPABASE_SERVICE_ROLE_KEY
                );

                const dates = selectedDatesStr.split(',');

                for (const dateStr of dates) {
                    const date = dateStr.trim();

                    // 1. Check for existing booking
                    const { data: existing } = await supabase
                        .from('ad_bookings')
                        .select('id, status')
                        .eq('selected_date', date)
                        .eq('ad_type', adType) // Check for same ad type
                        .maybeSingle();

                    if (existing) {
                        if (existing.status === 'rejected') {
                            // Delete rejected booking to allow re-booking
                            await supabase.from('ad_bookings').delete().eq('id', existing.id);
                        } else {
                            // Skip if already paid/approved (Double Booking Prevention)
                            console.warn(`Skipping date ${date}: Already booked (Status: ${existing.status})`);
                            continue;
                        }
                    }

                    // 2. Insert new booking
                    const { error } = await supabase
                        .from('ad_bookings')
                        .insert({
                            selected_date: date,
                            status: 'paid',
                            buyer_name: buyerName,
                            buyer_contact: buyerEmail,
                            image_url: imageUrl,
                            link_url: linkUrl,
                            order_id: orderId,
                            ad_type: adType
                        });

                    if (error) {
                        console.error(`Failed to insert booking for ${date}:`, error);
                        // Continue to next date or throw?
                        // If we throw, we might leave partial bookings.
                        // Better to log and continue, but maybe return error at end?
                        // For now, log error.
                    }
                }

                // Send Notification (only once per order)
                try {
                    const notiSecretKey = '3b1478a7-d678-4400-8516-0aa4fc82b433';
                    const nickname = 'hhh0909';
                    const title = encodeURIComponent('새로운 광고 예약! 🎉');
                    const body = encodeURIComponent(`${buyerName}님이 ${selectedDatesStr} 광고를 예약했습니다.`);

                    await fetch(`https://asia-northeast3-noti-lab-production.cloudfunctions.net/api/notification/v1/notification?nickname=${nickname}&title=${title}&body=${body}&secretKey=${notiSecretKey}`);
                } catch (notiError) {
                    console.error('Notification Error:', notiError);
                    // Don't fail the webhook if notification fails
                }
            }

            // If we want to return an error if ANY insert failed, we should track it.
            // But for now, we just log errors in the loop.
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
