// ============================================================
// api/form.js — Contact form handler (Vercel Edge Function)
// CURRENT: Logs submission, returns 200 JSON
// PHASE 2: Uncomment n8n webhook block below
// ============================================================

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const allowed = ['https://www.capitalai.ca', 'https://capitalai.ca'];
  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) data[k] = v;
    } else if (contentType.includes('application/json')) {
      data = await req.json();
    }

    // Skip honeypot submissions
    if (data._gotcha) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Log to Vercel dashboard (Functions → Logs)
    console.log('New audit request:', JSON.stringify({
      timestamp: new Date().toISOString(),
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      url: data.client_url || '',
    }));

    // ============================================================
    // PHASE 2: Forward to n8n webhook
    // const n8nWebhook = process.env.N8N_FORM_WEBHOOK;
    // if (n8nWebhook) {
    //   await fetch(n8nWebhook, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data)
    //   });
    // }
    // ============================================================

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    console.error('Form error:', err.message);
    return new Response(JSON.stringify({ error: 'Submission failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
