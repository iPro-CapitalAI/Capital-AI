// ============================================================
// api/leads.js - Private leads viewer (Vercel Function, Node runtime)
//
// Classic Node (req, res) handler signature. Verified 2026-07-25:
// this project's runtime invokes export default with IncomingMessage
// and ServerResponse. req.headers is a plain object here.
//
// Serves an HTML list of every captured lead, newest first, with
// client-side search, sort, copy-email, and CSV/JSON export. All
// controls operate on data already loaded into the page - no second
// round-trip, no extra endpoints.
//
// DELETE IS DELIBERATELY NOT EXPOSED HERE. Purging leads is done via
// the Vercel Blob dashboard/CLI (authenticated by the Vercel account,
// zero public attack surface). Decision 2026-07-25, Grok-adjudicated:
// a password-gated bulk-delete endpoint is real security surface
// (CSRF, path validation, PII-in-logs, backup failure modes) with no
// revenue value at current scale. Not built on purpose.
//
// Protected by HTTP Basic auth against LEADS_PASSWORD. The browser
// shows its own password prompt - no login form to build.
//
// Reachable at /leads via the rewrite in vercel.json.
//
// ASCII-only on purpose (see api/form.js header).
// ============================================================

import { list, get } from '@vercel/blob';

function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="CapitalAI leads", charset="UTF-8"');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(401).send('Authentication required.');
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

// Only allow http/https URLs to become clickable hrefs. Anything else
// (javascript:, data:, mailto tricks, relative junk) renders as inert
// escaped text. Lead-supplied field - never trust its scheme.
function safeHref(value) {
  const s = String(value == null ? '' : value).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

// Current documented get() shape (Vercel quickstart, verified 2026-07-24):
// { statusCode, stream, blob } - stream is a ReadableStream.
// Older / alternative shapes kept as fallbacks.
async function readBlobText(result) {
  if (!result) return null;
  if (result.statusCode && result.statusCode !== 200) return null;
  if (result.stream) return await new Response(result.stream).text();
  if (typeof result.text === 'function') return await result.text();
  if (result.body) return await new Response(result.body).text();
  if (typeof result === 'string') return result;
  return null;
}

export default async function handler(req, res) {
  const expected = process.env.LEADS_PASSWORD;

  // Fail closed. A missing password must never mean an open page.
  if (!expected) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).send('Leads viewer is not configured.');
    return;
  }

  const auth = String(req.headers['authorization'] || '');
  if (!auth.startsWith('Basic ')) {
    unauthorized(res);
    return;
  }

  let supplied = '';
  try {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    supplied = decoded.slice(decoded.indexOf(':') + 1);
  } catch (e) {
    unauthorized(res);
    return;
  }
  if (!safeEqual(supplied, expected)) {
    unauthorized(res);
    return;
  }

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

    // Normalized, escaped view model for the client. We hand the browser
    // exactly what it needs to render/search/sort/export - nothing more.
    // (PII is already behind auth + no-store; this is the accepted
    // client-side tradeoff for zero extra endpoints at current scale.)
    const clientRecords = records.map((r) => {
      if (r._error) return { error: r.pathname || r._error };
      return {
        received_at: r.received_at || '',
        business_name: r.business_name || '',
        first_name: r.first_name || '',
        email: r.email || '',
        phone: r.phone || '',
        website_url: r.website_url || '',
        message: r.message || '',
      };
    });

    const dataJson = JSON.stringify(clientRecords)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');

    const rows = records
      .map((r) => {
        if (r._error) {
          return `<tr class="lead-row"><td colspan="6" class="err">Could not read ${esc(r._error)}</td></tr>`;
        }
        const when = new Date(r.received_at).toLocaleString('en-CA', {
          timeZone: 'America/Toronto',
        });
        const site = safeHref(r.website_url);
        const siteCell = site
          ? `<a href="${esc(site)}" rel="noopener noreferrer" target="_blank">${esc(r.website_url)}</a>`
          : r.website_url
          ? esc(r.website_url)
          : '<span class="muted">-</span>';
        const emailCell = r.email
          ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a> <button class="copy" data-email="${esc(r.email)}" title="Copy email" type="button">copy</button>`
          : '<span class="muted">-</span>';
        return `<tr class="lead-row">
  <td class="when">${esc(when)}</td>
  <td>${esc(r.business_name) || '<span class="muted">-</span>'}</td>
  <td>${esc(r.first_name) || '<span class="muted">-</span>'}</td>
  <td>${emailCell}</td>
  <td>${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : '<span class="muted">-</span>'}</td>
  <td>${siteCell}</td>
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
  .count { color: #666; margin: 0 0 16px; font-size: 14px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 18px; }
  .bar input[type="search"] { flex: 1 1 260px; min-width: 180px; padding: 8px 12px; font-size: 14px; border: 1px solid rgba(128,128,128,.4); border-radius: 8px; background: transparent; color: inherit; }
  .bar button { padding: 8px 14px; font-size: 13px; border: 1px solid rgba(128,128,128,.4); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
  .bar button:hover { border-color: rgba(128,128,128,.8); }
  .bar .spacer { flex: 1 1 auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(128,128,128,.25); vertical-align: top; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #666; cursor: pointer; user-select: none; white-space: nowrap; }
  th .arrow { opacity: .5; font-size: 10px; }
  .when { white-space: nowrap; color: #666; font-size: 13px; }
  .muted { color: #999; }
  .err { color: #b00; }
  .empty { padding: 40px 0; color: #666; }
  .copy { font-size: 11px; padding: 1px 6px; margin-left: 4px; border: 1px solid rgba(128,128,128,.35); border-radius: 5px; background: transparent; color: inherit; cursor: pointer; vertical-align: middle; }
  .copy:hover { border-color: rgba(128,128,128,.7); }
  .copy.done { color: #2a7; border-color: #2a7; }
  .hidden { display: none; }
  #noMatch { padding: 30px 0; color: #666; }
  @media (max-width: 700px) {
    thead { display: none; }
    tr.lead-row { display: block; padding: 12px 0; border-bottom: 1px solid rgba(128,128,128,.25); }
    tr.lead-row td { display: block; border: 0; padding: 2px 0; }
  }
</style>
</head>
<body>
<h1>Leads</h1>
<p class="count" id="count">${records.length} total &middot; newest first &middot; times in Ottawa local</p>
${
  records.length
    ? `<div class="bar">
  <input type="search" id="search" placeholder="Filter by business, name, email, phone, site..." autocomplete="off">
  <span class="spacer"></span>
  <button id="exportCsv" type="button">Export CSV</button>
  <button id="exportJson" type="button">Export JSON</button>
</div>
<table id="leadsTable">
<thead><tr>
  <th data-key="received_at">Received <span class="arrow">&#9660;</span></th>
  <th data-key="business_name">Business <span class="arrow"></span></th>
  <th data-key="first_name">Name <span class="arrow"></span></th>
  <th data-key="email">Email <span class="arrow"></span></th>
  <th data-key="phone">Phone <span class="arrow"></span></th>
  <th data-key="website_url">Website <span class="arrow"></span></th>
</tr></thead>
<tbody id="leadsBody">
${rows}
</tbody>
</table>
<p id="noMatch" class="hidden">No leads match that filter.</p>`
    : '<p class="empty">No leads captured yet.</p>'
}
<script>
(function () {
  var DATA = ${dataJson};
  if (!Array.isArray(DATA) || !DATA.length) return;

  var valid = DATA.filter(function (r) { return !r.error; });

  // ---- date range in the count line -------------------------------
  var dates = valid
    .map(function (r) { return r.received_at ? new Date(r.received_at) : null; })
    .filter(function (d) { return d && !isNaN(d); })
    .sort(function (a, b) { return a - b; });
  if (dates.length) {
    var fmt = function (d) {
      return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    var span = dates.length === 1 ? fmt(dates[0]) : fmt(dates[0]) + ' \\u2013 ' + fmt(dates[dates.length - 1]);
    var countEl = document.getElementById('count');
    if (countEl) countEl.textContent = valid.length + ' total \\u00b7 ' + span + ' \\u00b7 times in Ottawa local';
  }

  // ---- live search ------------------------------------------------
  var search = document.getElementById('search');
  var body = document.getElementById('leadsBody');
  var noMatch = document.getElementById('noMatch');
  var rows = body ? Array.prototype.slice.call(body.querySelectorAll('tr.lead-row')) : [];

  function haystack(r) {
    return [r.business_name, r.first_name, r.email, r.phone, r.website_url, r.message]
      .join(' ').toLowerCase();
  }
  var hay = valid.map(haystack);

  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      for (var i = 0; i < rows.length; i++) {
        var match = !q || (hay[i] && hay[i].indexOf(q) !== -1);
        rows[i].classList.toggle('hidden', !match);
        if (match) shown++;
      }
      if (noMatch) noMatch.classList.toggle('hidden', shown !== 0);
    });
  }

  // ---- column sort ------------------------------------------------
  var headers = Array.prototype.slice.call(document.querySelectorAll('#leadsTable th'));
  var sortKey = 'received_at';
  var sortDir = -1; // start newest-first to match server order

  function paint() {
    headers.forEach(function (h) {
      var a = h.querySelector('.arrow');
      if (!a) return;
      if (h.getAttribute('data-key') === sortKey) {
        a.innerHTML = sortDir === 1 ? '&#9650;' : '&#9660;';
        a.style.opacity = '.9';
      } else {
        a.innerHTML = '';
      }
    });
  }

  function sortBy(key) {
    if (sortKey === key) { sortDir = -sortDir; } else { sortKey = key; sortDir = 1; }
    var idx = valid.map(function (r, i) { return i; });
    idx.sort(function (x, y) {
      var vx, vy;
      if (key === 'received_at') {
        vx = new Date(valid[x].received_at).getTime() || 0;
        vy = new Date(valid[y].received_at).getTime() || 0;
      } else {
        vx = (valid[x][key] || '').toLowerCase();
        vy = (valid[y][key] || '').toLowerCase();
      }
      if (vx < vy) return -1 * sortDir;
      if (vx > vy) return 1 * sortDir;
      return 0;
    });
    var frag = document.createDocumentFragment();
    idx.forEach(function (i) { frag.appendChild(rows[i]); });
    body.appendChild(frag);
    // reorder our parallel arrays to match new DOM order
    rows = idx.map(function (i) { return rows[i]; });
    var newValid = idx.map(function (i) { return valid[i]; });
    var newHay = idx.map(function (i) { return hay[i]; });
    valid = newValid; hay = newHay;
    paint();
    if (search && search.value) search.dispatchEvent(new Event('input'));
  }

  headers.forEach(function (h) {
    var key = h.getAttribute('data-key');
    if (!key) return;
    h.addEventListener('click', function () { sortBy(key); });
  });
  paint();

  // ---- copy email -------------------------------------------------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.copy') : null;
    if (!btn) return;
    var email = btn.getAttribute('data-email');
    if (!email) return;
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'copied'; btn.classList.add('done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('done'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done, done);
    } else {
      var t = document.createElement('textarea');
      t.value = email; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(t); done();
    }
  });

  // ---- export -----------------------------------------------------
  function stamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  function download(filename, text, type) {
    var blob = new Blob([text], { type: type + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\\r\\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCsv(list) {
    var cols = ['received_at', 'business_name', 'first_name', 'email', 'phone', 'website_url', 'message'];
    var head = ['Received (ISO)', 'Business', 'Name', 'Email', 'Phone', 'Website', 'Message'];
    var lines = [head.map(csvCell).join(',')];
    list.forEach(function (r) {
      lines.push(cols.map(function (c) { return csvCell(r[c]); }).join(','));
    });
    // BOM so Excel reads UTF-8 correctly
    return '\\ufeff' + lines.join('\\r\\n');
  }

  var csvBtn = document.getElementById('exportCsv');
  var jsonBtn = document.getElementById('exportJson');
  if (csvBtn) csvBtn.addEventListener('click', function () {
    download('capitalai-leads-' + stamp() + '.csv', toCsv(valid), 'text/csv');
  });
  if (jsonBtn) jsonBtn.addEventListener('click', function () {
    download('capitalai-leads-' + stamp() + '.json', JSON.stringify(valid, null, 2), 'application/json');
  });
})();
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).send(html);
  } catch (err) {
    console.error('LEADS VIEWER FAILED:', err && err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Could not load leads. Check function logs.');
  }
}
