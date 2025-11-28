import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'edge';

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
            // Check for selected_dates (plural) first, then fallback to selected_date (singular) for backward compatibility
            const selectedDatesStr = payload.meta.custom_data?.selected_dates || payload.meta.custom_data?.selected_date;
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
                    buyer_contact: buyerEmail
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
