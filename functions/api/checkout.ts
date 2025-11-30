interface Env {
    LEMON_SQUEEZY_STORE_ID: string;
    LEMON_SQUEEZY_VARIANT_ID: string; // Top Banner (Default)
    LEMON_SQUEEZY_VARIANT_ID_BOTTOM: string; // Bottom Banner
    LEMON_SQUEEZY_VARIANT_ID_NEWSLETTER: string; // Newsletter Banner
    LEMON_SQUEEZY_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const { dates, imageUrl, linkUrl, adType } = await request.json() as { dates: string[], imageUrl: string, linkUrl: string, adType?: string };

        if (!dates || dates.length === 0 || !imageUrl || !linkUrl) {
            return new Response(JSON.stringify({ error: 'Dates, Image URL, and Link URL are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const storeId = env.LEMON_SQUEEZY_STORE_ID;
        const apiKey = env.LEMON_SQUEEZY_API_KEY;

        // Determine Variant ID based on adType
        let variantId = env.LEMON_SQUEEZY_VARIANT_ID; // Default to Top
        if (adType === 'bottom') {
            variantId = env.LEMON_SQUEEZY_VARIANT_ID_BOTTOM;
        } else if (adType === 'newsletter') {
            variantId = env.LEMON_SQUEEZY_VARIANT_ID_NEWSLETTER;
        }

        if (!storeId || !variantId || !apiKey) {
            return new Response(JSON.stringify({ error: 'Server configuration missing for the selected ad type' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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
                                selected_dates: dates.join(','),
                                image_url: imageUrl,
                                link_url: linkUrl,
                                ad_type: adType || 'top' // Track ad type
                            },
                            variant_quantities: [
                                {
                                    variant_id: parseInt(variantId),
                                    quantity: dates.length
                                }
                            ]
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

        const result = await response.json() as any;

        if (result.errors) {
            console.error('Lemon Squeezy API Error:', result.errors);
            return new Response(JSON.stringify({ error: result.errors[0].detail }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ url: result.data.attributes.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Checkout creation failed:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
