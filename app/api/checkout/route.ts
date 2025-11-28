import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { date } = await request.json();

        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID; // This is the Product ID (Variant ID)
        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;

        if (!storeId || !variantId || !apiKey) {
            return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
        }

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
                                selected_date: date // Pass the date as custom data
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
