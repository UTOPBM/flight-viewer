interface Env {
    LEMON_SQUEEZY_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    try {
        const { request, env } = context;
        const { orderId } = await request.json() as { orderId: string };

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Order ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const apiKey = env.LEMON_SQUEEZY_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Lemon Squeezy Refund API
        // Docs: https://docs.lemonsqueezy.com/api/refunds#create-a-refund
        const response = await fetch('https://api.lemonsqueezy.com/v1/refunds', {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                data: {
                    type: "refunds",
                    relationships: {
                        order: {
                            data: {
                                type: "orders",
                                id: orderId.toString()
                            }
                        }
                    }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Lemon Squeezy Refund Error:', errorText);
            return new Response(JSON.stringify({ error: 'Refund failed: ' + errorText }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Refund processing failed:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
