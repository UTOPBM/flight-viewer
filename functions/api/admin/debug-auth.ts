interface Env {
    LISTMONK_API_URL: string;
    LISTMONK_USERNAME: string;
    LISTMONK_PASSWORD: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { env } = context;

    const username = (env.LISTMONK_USERNAME || '').trim();
    const password = (env.LISTMONK_PASSWORD || '').trim();
    const safeUrl = (env.LISTMONK_API_URL || '').replace(/\/$/, '');

    // Construct Header
    const authHeader = `Basic ${btoa(`${username}:${password}`)}`;

    try {
        const response = await fetch(`${safeUrl}/api/campaigns?per_page=1`, {
            headers: {
                'Authorization': authHeader
            }
        });

        const text = await response.text();

        return new Response(JSON.stringify({
            debug_info: {
                username_configured: username,
                password_length: password.length,
                api_url: safeUrl,
            },
            listmonk_response: {
                status: response.status,
                statusText: response.statusText,
                body: text
            }
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({
            error: e.message,
            stack: e.stack
        }, null, 2), { status: 500 });
    }
};
