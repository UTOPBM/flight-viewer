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
    const username = env.LISTMONK_USERNAME.trim();
    const password = env.LISTMONK_PASSWORD.trim();
    const authHeader = `Basic ${btoa(`${username}:${password}`)}`;
    const headers = {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
    };

    // Debug Logging
    const safeUrl = env.LISTMONK_API_URL.replace(/\/$/, ''); // Remove trailing slash if present
    console.log(`Listmonk API Request: ${safeUrl}/api/campaigns`);
    console.log(`Listmonk Username: ${username}`);
    // Do not log password

    try {
        // GET: Fetch Campaigns
        if (request.method === 'GET') {
            const page = url.searchParams.get('page') || '1';
            const status = url.searchParams.get('status') || 'draft'; // Default to draft

            const response = await fetch(`${safeUrl}/api/campaigns?page=${page}&per_page=50&order_by=created_at&order=DESC`, {
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`Listmonk Error Response: ${errorText}`);
                throw new Error(`Listmonk API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

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
            const { id, name, subject, body, tags, send_at } = await request.json() as any;

            if (!id) return new Response('Missing campaign ID', { status: 400 });

            // First get the campaign to preserve other fields
            const getRes = await fetch(`${safeUrl}/api/campaigns/${id}`, { headers });
            const currentData = await getRes.json() as ListmonkCampaignResponse;
            const currentCampaign = currentData.data;

            console.log('Current Campaign for Update:', JSON.stringify(currentCampaign));

            const payload = {
                name: name || currentCampaign.name,
                subject: subject || currentCampaign.subject,
                body: body || currentCampaign.body,
                tags: tags || currentCampaign.tags,
                // Preserve required fields
                lists: currentCampaign.lists.map((l: any) => l.id),
                type: currentCampaign.type,
                content_type: currentCampaign.content_type,
                messenger: currentCampaign.messenger,
                // Include send_at if provided to satisfy validation (must be future date)
                ...(send_at ? { send_at } : {})
            };
            console.log('Update Payload:', JSON.stringify(payload));

            const response = await fetch(`${safeUrl}/api/campaigns/${id}`, {
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

        // POST: Schedule Campaign (Two modes: Simple Schedule or Clone & Schedule)
        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { id, send_at, template_id, subject, intro_text, name } = body;

            // Mode 1: Clone & Schedule (New Workflow)
            if (template_id && send_at) {
                // 1. Fetch Template Campaign
                const tplRes = await fetch(`${safeUrl}/api/campaigns/${template_id}`, { headers });
                if (!tplRes.ok) throw new Error('Failed to fetch template campaign');
                const tplData = await tplRes.json() as ListmonkCampaignResponse;
                const tpl = tplData.data;

                // 2. Create New Campaign
                // Append date to name to make it unique and identifiable
                const sendDate = send_at.split('T')[0];
                const newName = `[${sendDate}] ${name || tpl.name}`;

                const createPayload = {
                    name: newName,
                    subject: subject || tpl.subject,
                    body: intro_text || tpl.body, // Use provided body or fallback to template
                    tags: tpl.tags,
                    lists: tpl.lists.map((l: any) => l.id),
                    type: tpl.type,
                    content_type: tpl.content_type,
                    messenger: tpl.messenger
                };
                console.log('Creating New Campaign:', JSON.stringify(createPayload));

                const createRes = await fetch(`${safeUrl}/api/campaigns`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(createPayload)
                });

                if (!createRes.ok) {
                    const err = await createRes.text();
                    throw new Error(`Failed to create new campaign: ${err}`);
                }

                const createResult = await createRes.json() as ListmonkCampaignResponse;
                const newCampaignId = createResult.data.id;
                console.log(`New Campaign Created: ID ${newCampaignId}`);

                // 3. Schedule the New Campaign
                const scheduleRes = await fetch(`${safeUrl}/api/campaigns/${newCampaignId}/status`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ status: 'scheduled', send_at })
                });

                if (!scheduleRes.ok) {
                    const err = await scheduleRes.text();
                    throw new Error(`Failed to schedule new campaign: ${err}`);
                }

                return new Response(JSON.stringify({ success: true, new_campaign_id: newCampaignId }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Mode 2: Legacy Schedule (Existing ID)
            if (id && send_at) {
                const response = await fetch(`${safeUrl}/api/campaigns/${id}/status`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ status: 'scheduled', send_at })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Schedule Failed: ${err}`);
                }

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response('Missing required fields (id+send_at OR template_id+send_at)', { status: 400 });
        }

        return new Response('Method Not Allowed', { status: 405 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
