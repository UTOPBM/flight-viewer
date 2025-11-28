import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

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

export async function POST(request: Request) {
    try {
        const text = await request.text();
        const signature = request.headers.get('x-signature') || '';
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

        const isValid = await verifySignature(secret, signature, text);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(text);
        const eventName = payload.meta.event_name;

        if (eventName === 'order_created') {
            // Check for selected_dates (plural) first, then fallback to selected_date (singular) for backward compatibility
            const selectedDatesStr = payload.meta.custom_data?.selected_dates || payload.meta.custom_data?.selected_date;
            const imageUrl = payload.meta.custom_data?.image_url;
            const buyerName = payload.data.attributes.user_name;
            const buyerEmail = payload.data.attributes.user_email;

            if (selectedDatesStr) {
                // Initialize Supabase Admin Client (Service Role)
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                // Handle multiple dates (comma separated)
                const dates = selectedDatesStr.split(',');

                const inserts = dates.map((date: string) => ({
                    selected_date: date.trim(),
                    status: 'paid',
                    buyer_name: buyerName,
                    buyer_contact: buyerEmail,
                    image_url: imageUrl
                }));

                const { error } = await supabase
                    .from('ad_bookings')
                    .insert(inserts);

                if (error) {
                    console.error('Supabase Insert Error:', error);
                    return NextResponse.json({ error: 'Database error' }, { status: 500 });
                }
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
