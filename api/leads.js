// ============================================================
// api/leads.js - Private leads viewer (Vercel Function, Node runtime)
//
// Serves an HTML list of every captured lead, newest first.
// Protected by HTTP Basic auth against LEADS_PASSWORD. The browser
// shows its own password prompt - no login form to build.
//
// Reachable at /leads via the rewrite in vercel.json.
//
// ASCII-only on purpose (see api/form.js header).
// ============================================================

import { list, get } from '@vercel/blob';

function unauthorized() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="CapitalAI leads", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

// Constant-time-ish comparison. Leaks length only, which is acceptable here.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The SDK's get() return shape varies by version, so handle the
// plausible shapes rather than assuming one. Verify on preview.
async function readBlobText(result) {
  if (!result) return null;
  // Current documented shape (Vercel quickstart, verified 2026-07-24):
  // { statusCode, stream, blob } - stream is a ReadableStream.
  if (result.statusCode && result.statusCode !== 200) return null;
  if (result.stream) return await new Response(result.stream).text();
  // Older / alternative shapes, kept as fallbacks.
  if (typeof result.text === 'function') return await result.text();
  if (result.body) return await new Response(result.body).text();
  if (typeof result === 'string') return result;
  return null;
}

export default async function handler(req) {
  const expected = process.env.LEADS_PASSWORD;

  // Fail closed. A missing password must never mean an open page.
  if (!expected) {
    return new Response('Leads viewer is not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) return unauthorized();

  let supplied = '';
  try {
    const decoded = atob(auth.slice(6));
    supplied = decoded.slice(decoded.indexOf(':') + 1);
  } catch (e) {
    return unauthorized();
  }
  if (!safeEqual(supplied, expected)) return unauthorized();

  try {
    // Page through the store so the list is never silently truncated.
    const blobs = [];
    let cursor = undefined;
    do {
      const page = await list({ prefix: 'leads/', limit: 1000, cursor });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    // Timestamp-first pathnames mean a reverse lexical sort is newest-first.
    blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1));

    const records = [];
    for (const blob of blobs) {
      try {
        // get() takes the pathname, not the URL, in current SDK versions.
        const text = await readBlobText(await get(blob.pathname, { access: 'private' }));
        records.push(text ? JSON.parse(text) : { _error: blob.pathname });
      } catch (e) {
        records.push({ _error: blob.pathname });
      }
    }

    const rows = records
      .map((r) => {
        if (r._error) {
          return `<tr><td colspan="6" class="err">Could not read ${esc(r._error)}</td></tr>`;
        }
        const when = new Date(r.received_at).toLocaleString('en-CA', {
          timeZone: 'America/Toronto',
        });
        return `<tr>
  <td class="when">${esc(when)}</td>
  <td>${esc(r.business_name) || '<span class="muted">-</span>'}</td>
  <td>${esc(r.first_name) || '<span class="muted">-</span>'}</td>
  <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
  <td>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '<span class="muted">-</span>'}</td>
  <td>${r.website_url ? `<a href="${esc(r.website_url)}" rel="noopener noreferrer" target="_blank">${esc(r.website_url)}</a>` : '<span class="muted">-</span>'}</td>
</tr>`;
      })
      .join('\n');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Leads (${records.length})</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .count { color: #666; margin: 0 0 20px; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(128,128,128,.25); vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #666; }
  .when { white-space: nowrap; color: #666; font-size: 13px; }
  .muted { color: #999; }
  .err { color: #b00; }
  .empty { padding: 40px 0; color: #666; }
  @media (max-width: 700px) {
    thead { display: none; }
    tr { display: block; padding: 12px 0; border-bottom: 1px solid rgba(128,128,128,.25); }
    td { display: block; border: 0; padding: 2px 0; }
  }
</style>
</head>
<body>
<h1>Leads</h1>
<p class="count">${records.length} total &middot; newest first &middot; times in Ottawa local</p>
${
  records.length
    ? `<table>
<thead><tr><th>Received</th><th>Business</th><th>Name</th><th>Email</th><th>Phone</th><th>Website</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`
    : '<p class="empty">No leads captured yet.</p>'
}
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (err) {
    console.error('LEADS VIEWER FAILED:', err && err.message);
    return new Response('Could not load leads. Check function logs.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
