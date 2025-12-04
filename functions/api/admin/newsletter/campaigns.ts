interface Env {
    LISTMONK_API_URL: string;
    LISTMONK_USERNAME: string;
    LISTMONK_PASSWORD: string;
}

interface ListmonkCampaign {
    id: number;
    name: string;
    subject: string;
    body: string;
    tags: string[];
    lists: { id: number; name: string }[];
    type: string;
    content_type: string;
    messenger: string;
    status: string;
}

interface ListmonkCampaignResponse {
    data: ListmonkCampaign;
}

interface ListmonkCampaignsResponse {
    data: {
        results: ListmonkCampaign[];
    };
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);

    // Basic Auth Header
    const authHeader = `Basic ${btoa(`${env.LISTMONK_USERNAME}: ${env.LISTMONK_PASSWORD}`)}`;
    const headers = {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
    };

    // Debug Logging
    const safeUrl = env.LISTMONK_API_URL.replace(/\/$/, ''); // Remove trailing slash if present
    console.log(`Listmonk API Request: ${safeUrl}/api/campaigns`);
    console.log(`Listmonk Username: ${env.LISTMONK_USERNAME}`);
    // Do not log password

    try {
        // GET: Fetch Campaigns
        if (request.method === 'GET') {
            const page = url.searchParams.get('page') || '1';
            const status = url.searchParams.get('status') || 'draft'; // Default to draft

            const response = await fetch(`${env.LISTMONK_API_URL}/api/campaigns?page = ${page}&per_page = 50&order_by = created_at&order = DESC`, {
                headers
            });

            if (!response.ok) throw new Error(`Listmonk API Error: ${response.statusText}`);

            const data = await response.json() as ListmonkCampaignsResponse;
            // Filter by status if needed (Listmonk API might not support filtering by status in the list endpoint directly, so we filter here)
            // Actually Listmonk API docs say /api/campaigns returns all. We can filter in memory.
            const campaigns = data.data.results.filter((c) => c.status === status);

            return new Response(JSON.stringify({ results: campaigns }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // PUT: Update Campaign
        if (request.method === 'PUT') {
            const { id, name, subject, body, tags } = await request.json() as any;

            if (!id) return new Response('Missing campaign ID', { status: 400 });

            // First get the campaign to preserve other fields
            const getRes = await fetch(`${env.LISTMONK_API_URL}/api/campaigns/${id}`, { headers });
            const currentData = await getRes.json() as ListmonkCampaignResponse;
            const currentCampaign = currentData.data;

            const payload = {
                name: name || currentCampaign.name,
                subject: subject || currentCampaign.subject,
                body: body || currentCampaign.body,
                tags: tags || currentCampaign.tags,
                // Preserve required fields
                lists: currentCampaign.lists.map((l: any) => l.id),
                type: currentCampaign.type,
                content_type: currentCampaign.content_type,
                messenger: currentCampaign.messenger
            };

            const response = await fetch(`${env.LISTMONK_API_URL}/api/campaigns/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Update Failed: ${err}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // POST: Schedule Campaign (Change status to scheduled)
        if (request.method === 'POST') {
            const { id, send_at } = await request.json() as any;

            if (!id || !send_at) return new Response('Missing ID or send_at', { status: 400 });

            // To schedule, we change status to 'scheduled' and provide send_at
            // Listmonk might require a specific endpoint or just a status update.
            // Usually it's a status update to 'scheduled' with 'send_at'.

            const response = await fetch(`${env.LISTMONK_API_URL}/api/campaigns/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: 'scheduled', send_at }) // Format: "2025-12-25 10:00:00"
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Schedule Failed: ${err}`);
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Method Not Allowed', { status: 405 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
