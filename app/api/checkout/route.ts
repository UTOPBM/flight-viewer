import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const { dates, imageUrl } = await request.json(); // Expecting array of dates and image URL

        if (!dates || dates.length === 0) {
            return NextResponse.json({ error: 'Dates are required' }, { status: 400 });
        }

        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID;
        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

        if (!storeId || !variantId || !apiKey) {
            return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
        }

        // Lemon Squeezy Checkout API
        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                data: {
                    type: "checkouts",
                    attributes: {
                        checkout_data: {
                            custom: {
                                selected_dates: dates.join(','), // Pass dates as comma-separated string
                                image_url: imageUrl // Pass image URL
                            },
                            variant_quantities: {
                                [variantId]: dates.length // Set quantity based on number of days
                            }
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: "stores",
                                id: storeId
                            }
                        },
                        variant: {
                            data: {
                                type: "variants",
                                id: variantId
                            }
                        }
                    }
                }
            })
        });

        const result = await response.json();

        if (result.errors) {
            console.error('Lemon Squeezy API Error:', result.errors);
            return NextResponse.json({ error: result.errors[0].detail }, { status: 500 });
        }

        return NextResponse.json({ url: result.data.attributes.url });

    } catch (error) {
        console.error('Checkout creation failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
