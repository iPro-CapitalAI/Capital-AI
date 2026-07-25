// ============================================================
// api/form.js - Lead capture (Vercel Function, Node runtime)
//
// Classic Node (req, res) handler signature. Verified 2026-07-25:
// this project's runtime invokes export default with IncomingMessage
// and ServerResponse (log: "req.headers.get is not a function" when
// written Web-style). req.headers is a plain object here.
//
// Writes every submission to a PRIVATE Vercel Blob store as one
// JSON file per lead. Returns an honest error when the write
// fails, so a visitor never sees "success" for a lost lead.
//
// ASCII-only on purpose: this repo has an open UTF-8 mojibake
// defect. New files stay ASCII so they cannot inherit it.
// ============================================================

import { put } from '@vercel/blob';

const ALLOWED_ORIGINS = ['https://www.capitalai.ca', 'https://capitalai.ca'];

function applyCors(req, res) {
  const origin = req.headers['origin'] || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return origin;
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

// Vercel's Node runtime pre-parses the body for JSON and urlencoded
// content types (req.body is an object). Handle the string case too,
// so a runtime behaviour change cannot break parsing.
function readBody(req) {
  const contentType = String(req.headers['content-type'] || '');
  const body = req.body;
  if (body == null) return {};
  if (typeof body === 'object') return body;
  if (typeof body === 'string') {
    if (contentType.includes('application/json')) {
      try { return JSON.parse(body); } catch (e) { return {}; }
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const out = {};
      for (const [k, v] of new URLSearchParams(body).entries()) out[k] = v;
      return out;
    }
  }
  return {};
}

export default async function handler(req, res) {
  const origin = applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Declared outside the try so the catch block can log the full lead.
  // If Blob is down, the lead still lands in Vercel function logs and
  // is recoverable by hand. Losing it silently is the one unacceptable outcome.
  let record = null;

  try {
    const data = readBody(req);

    // Honeypot. Bots get a clean 200 and nothing is stored.
    if (data._gotcha) {
      res.status(200).json({ ok: true });
      return;
    }

    // Minimum viable lead: we must be able to reach them.
    const email = String(data.email || '').trim();
    if (!email || !email.includes('@') || email.length > 254) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
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
      user_agent: String(req.headers['user-agent'] || ''),
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

    res.status(200).json({ ok: true });
  } catch (err) {
    // Last-resort capture. Vercel log retention is short, so this is a
    // recovery window, not a storage strategy.
    console.error('LEAD CAPTURE FAILED:', err && err.message);
    if (record) {
      console.error('UNSAVED LEAD PAYLOAD:', JSON.stringify(record));
    }
    res.status(500).json({
      error:
        'Sorry - we could not save your request. Please email hello@capitalai.ca directly and we will pick it up right away.',
    });
  }
}
