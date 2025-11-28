import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const text = await request.text();
        const hmac = crypto.createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '');
        const digest = Buffer.from(hmac.update(text).digest('hex'), 'utf8');
        const signature = Buffer.from(request.headers.get('x-signature') || '', 'utf8');

        if (!crypto.timingSafeEqual(digest, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(text);
        const eventName = payload.meta.event_name;

        if (eventName === 'order_created') {
            const customData = payload.data.attributes.first_order_item.custom_data; // Check structure
            // Note: Lemon Squeezy custom data location might vary slightly depending on checkout vs order payload.
            // Usually it's in meta.custom_data or data.attributes.order_items[0].attributes.custom_data
            // Let's check payload.meta.custom_data first as it's passed from checkout

            const selectedDate = payload.meta.custom_data?.selected_date;
            const buyerName = payload.data.attributes.user_name;
            const buyerEmail = payload.data.attributes.user_email;

            if (selectedDate) {
                // Initialize Supabase Admin Client (Service Role)
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                const { error } = await supabase
                    .from('ad_bookings')
                    .insert({
                        selected_date: selectedDate,
                        status: 'paid',
                        buyer_name: buyerName,
                        buyer_contact: buyerEmail
                    });

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
