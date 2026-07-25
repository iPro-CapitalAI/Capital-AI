// ============================================================
// api/form.js - Lead capture (Vercel Function, Node runtime)
//
// Writes every submission to a PRIVATE Vercel Blob store as one
// JSON file per lead. Returns an honest error when the write
// fails, so a visitor never sees "success" for a lost lead.
//
// Replaces the previous version, which logged to console and
// returned {ok:true} unconditionally - every lead was lost.
//
// ASCII-only on purpose: this repo has an open UTF-8 mojibake
// defect. New files stay ASCII so they cannot inherit it.
// ============================================================

import { put } from '@vercel/blob';

const ALLOWED_ORIGINS = ['https://www.capitalai.ca', 'https://capitalai.ca'];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

// Filename-safe slug. Accents stripped because this is a bilingual market
// and "Fleuriste Beausejour" must not produce a broken blob pathname.
function slug(value) {
  const s = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'unknown';
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, headers);
  }

  // Declared outside the try so the catch block can log the full lead.
  // If Blob is down, the lead still lands in Vercel function logs and
  // is recoverable by hand. Losing it silently is the one unacceptable outcome.
  let record = null;

  try {
    const contentType = req.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(await req.text());
      for (const [k, v] of params.entries()) data[k] = v;
    } else if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      return json({ error: 'Unsupported content type' }, 415, headers);
    }

    // Honeypot. Bots get a clean 200 and nothing is stored.
    if (data._gotcha) {
      return json({ ok: true }, 200, headers);
    }

    // Minimum viable lead: we must be able to reach them.
    const email = String(data.email || '').trim();
    if (!email || !email.includes('@') || email.length > 254) {
      return json({ error: 'A valid email address is required.' }, 400, headers);
    }

    const now = new Date();

    // Normalised field names match what the audit pipeline expects.
    // The full submitted payload is kept in `raw` regardless, so a
    // mismatch between the HTML input names and these keys can never
    // destroy data - it just means a normalised field is blank and
    // the value is still sitting in raw.
    record = {
      received_at: now.toISOString(),
      email: email,
      first_name: String(data.first_name || data.name || '').trim(),
      business_name: String(data.business_name || data.company || '').trim(),
      website_url: String(data.website_url || data.client_url || data.url || '').trim(),
      phone: String(data.phone || '').trim(),
      primary_topic: String(data.primary_topic || '').trim(),
      location: String(data.location || '').trim() || 'Ottawa, Canada',
      competitor_url: String(data.competitor_url || '').trim() || 'Not provided',
      source_origin: origin,
      user_agent: req.headers.get('user-agent') || '',
      raw: data,
    };

    // Timestamp-first pathname so a lexical sort is a chronological sort.
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const label = slug(record.business_name || email.split('@')[0]);
    const pathname = `leads/${stamp}-${label}.json`;

    await put(pathname, JSON.stringify(record, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return json({ ok: true }, 200, headers);
  } catch (err) {
    // Last-resort capture. Vercel log retention is short, so this is a
    // recovery window, not a storage strategy.
    console.error('LEAD CAPTURE FAILED:', err && err.message);
    if (record) {
      console.error('UNSAVED LEAD PAYLOAD:', JSON.stringify(record));
    }
    return json(
      {
        error:
          'Sorry - we could not save your request. Please email hello@capitalai.ca directly and we will pick it up right away.',
      },
      500,
      headers
    );
  }
}
