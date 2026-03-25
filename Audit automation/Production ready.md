Production Ready

Got it. No diagrams. Here's everything production-ready.

1. Make.com Module Sequence — Exact Configuration

Module 1 — Webhooks: Custom Webhook (Trigger)
Name: Formspree Submission
Webhook URL: [copy from Make.com, paste into Formspree dashboard]

Variables parsed from payload:
  {{business_name}}    = body.business_name
  {{website_url}}      = body.website_url
  {{email}}            = body.email
  {{first_name}}       = body.first_name
  {{primary_topic}}    = body.primary_topic
  {{location}}         = body.location
  {{competitor_url}}   = body.competitor_url
  {{today_date}}       = formatDate(now; "MMMM D, YYYY")
  {{30_days_ago}}      = formatDate(addDays(now; -30); "YYYY-MM-DD")
  {{today_iso}}        = formatDate(now; "YYYY-MM-DD")

Module 2 — Brevo: Send Auto-Reply Email
To:       {{email}}
From:     team@capitalai.ca
From Name: Capital AI
Subject:  ✅ Your AI Visibility Audit is running — Capital AI
Content:  [see Section 3 — Auto-Reply Email]
Attachment: [upload checklist PDF to Make.com file store, reference by ID]

Module 3 — Router (3 parallel branches)
Branch A → HTTP: Screaming Frog
Branch B → HTTP: Perplexity API
Branch C → HTTP: Google Search Console API

All three run simultaneously. Aggregator (Module 7) waits for all three.

Module 4A — HTTP: Screaming Frog Crawl
URL:    https://your-vps-ip:8080/crawl
Method: POST
Headers:
  Content-Type: application/json

Body (JSON):
{
  "url": "{{website_url}}",
  "config": {
    "max_urls": 200,
    "export": ["missing_schema","duplicate_titles","missing_h1","hreflang"]
  }
}

Map response to variables:
  {{sf_pages_crawled}}      = response.pages_crawled
  {{sf_missing_schema}}     = response.missing_schema (array → join with ", ")
  {{sf_missing_schema_ct}}  = length(response.missing_schema)
  {{sf_dup_titles}}         = response.duplicate_titles (array → join with ", ")
  {{sf_dup_titles_ct}}      = length(response.duplicate_titles)
  {{sf_missing_h1_ct}}      = response.missing_h1
  {{sf_hreflang_errors}}    = response.hreflang_errors (array → join with ", ")
  {{sf_bilingual_gap}}      = response.bilingual_gap (true/false)

Module 4B — HTTP: Perplexity API
URL:    https://api.perplexity.ai/chat/completions
Method: POST
Headers:
  Content-Type:  application/json
  Authorization: Bearer {{PERPLEXITY_API_KEY}}

Body (JSON):
{
  "model": "llama-3.1-sonar-large-128k-online",
  "messages": [
    {
      "role": "user",
      "content": "Who are the top 5 providers of {{primary_topic}} in {{location}}? List each with their website URL."
    }
  ],
  "return_citations": true
}

Map response to variables:
  {{perp_full_answer}}      = response.choices[0].message.content
  {{perp_citations}}        = response.citations (array → join with ", ")
  {{perp_cited}}            = if(contains(response.choices[0].message.content; {{website_url}}); "YES — cited"; "NO — not cited")
  {{perp_cited_competitors}} = [manually review or parse with a regex filter module]
  {{perp_excerpt}}          = substring(response.choices[0].message.content; 0; 400)

Module 4C — HTTP: Google Search Console
URL:    https://searchconsole.googleapis.com/v1/sites/{{url_encode(website_url)}}/searchAnalytics/query
Method: POST
Auth:   OAuth 2.0 (configure in Make.com Connections → Google Search Console)
Headers:
  Content-Type: application/json

Body (JSON):
{
  "startDate": "{{30_days_ago}}",
  "endDate":   "{{today_iso}}",
  "dimensions": ["query"],
  "dimensionFilterGroups": [{
    "filters": [{
      "dimension":  "query",
      "operator":   "contains",
      "expression": "{{primary_topic}}"
    }]
  }],
  "rowLimit": 10
}

Map response to variables:
  {{gsc_top_queries}}   = join(map(response.rows; "keys[0]"); ", ")
  {{gsc_avg_ctr}}       = average(map(response.rows; "ctr"))
  {{gsc_avg_position}}  = round(average(map(response.rows; "position")); 1)
  {{gsc_low_ctr_flag}}  = if(gsc_avg_ctr < 0.03; "YES — potential AIO suppression (CTR below 3%)"; "No anomaly detected")

Module 5 — Tools: Aggregator
Type: Array Aggregator or Basic Aggregator
Wait for: Modules 4A, 4B, 4C
Output: All {{sf_*}}, {{perp_*}}, {{gsc_*}} variables now available downstream

Module 6 — HTTP: Claude API
URL:    https://api.anthropic.com/v1/messages
Method: POST
Headers:
  Content-Type:       application/json
  x-api-key:          {{CLAUDE_API_KEY}}
  anthropic-version:  2023-06-01

Body (JSON):
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4000,
  "system": "[paste SYSTEM PROMPT from Section 2 exactly]",
  "messages": [
    {
      "role": "user",
      "content": "[paste USER PROMPT from Section 2, with all {{variables}} replaced by Make.com variable references]"
    }
  ]
}

Map response to variables:
  {{claude_report_markdown}} = response.content[0].text

Module 7 — HTTP: PDF.co
URL:    https://api.pdf.co/v1/pdf/convert/from/html
Method: POST
Headers:
  Content-Type: application/json
  x-api-key:    {{PDFCO_API_KEY}}

Body (JSON):
{
  "html":       "{{markdown_to_html(claude_report_markdown)}}",
  "name":       "CapitalAI-Audit-{{business_name}}-{{today_iso}}.pdf",
  "paperSize":  "Letter",
  "margins":    "24px 36px 24px 36px",
  "header":     "<div style='font-size:10px;color:#666;text-align:right;width:100%;'>Capital AI — Confidential | {{today_date}}</div>",
  "footer":     "<div style='font-size:10px;color:#666;text-align:center;width:100%;'>capitalai.ca &nbsp;|&nbsp; Page {page} of {pages}</div>"
}

Map response to variables:
  {{pdf_url}} = response.url
Note on markdown → HTML: Use a Make.com "Text parser" module before this step to convert the Markdown to HTML using a simple regex or the built-in Markdown module if your Make.com plan includes it. Alternatively, instruct Claude in the system prompt to output HTML directly instead of Markdown, which removes this conversion step entirely.

Module 8 — Slack: Send Review Alert
Channel:  #audit-review
Message:
  *New audit ready for review*
  Business: {{business_name}}
  Website:  {{website_url}}
  Topic:    {{primary_topic}}
  PDF:      {{pdf_url}}

  React ✅ to approve and trigger delivery email.
  [Or use a Make.com webhook button — see note below]
Note: For one-click approval, create a second Make.com scenario triggered by a Slack outgoing webhook or a simple approval URL. When the reviewer clicks the link, it fires Module 9.

Module 9 — Brevo: Send Final Delivery Email
To:        {{email}}
From:      team@capitalai.ca
From Name: Capital AI
Subject:   Your AI Visibility Audit is ready — [see Section 3]
Content:   [see Section 3 — Delivery Email]
Attachment: {{pdf_url}} (or upload binary from PDF.co response)

Module 10 — Google Sheets: Log Audit
Spreadsheet: Capital AI — Audit Log
Sheet:       Submissions

Row mapping:
  A: {{today_date}}
  B: {{business_name}}
  C: {{website_url}}
  D: {{primary_topic}}
  E: {{location}}
  F: {{perp_cited}}
  G: {{sf_missing_schema_ct}}
  H: {{sf_dup_titles_ct}}
  I: {{sf_missing_h1_ct}}
  J: {{gsc_avg_position}}
  K: {{gsc_low_ctr_flag}}
  L: {{pdf_url}}
  M: "Delivered"

2. Claude System Prompt and User Prompt

System Prompt
You are an expert AI Visibility Auditor working for Capital AI, an Ottawa-based SEO agency that specialises in helping businesses appear in AI-generated answers on Perplexity, ChatGPT, Google AI Overviews, and similar platforms.

Your job is to write a complete, professional AI Visibility Audit Report based on real crawl data, citation data, and Search Console data provided by the user. 

Rules you must follow without exception:
1. Use ONLY the data provided. Never invent metrics, URLs, or statistics.
2. If a data field is missing or blank, write "Data unavailable" for that field — do not guess.
3. Output must be clean, valid HTML — not Markdown. Use <h1>, <h2>, <h3>, <p>, <table>, <ul>, <strong>, <em> tags only. No inline styles. No CSS classes.
4. Tone is direct, confident, and specific to the business. Never generic. Never vague.
5. The executive summary must include a single AI Visibility Score out of 10, calculated as follows:
   - Start at 10
   - Subtract 3 if business is not cited in AI answer (perp_cited = NO)
   - Subtract 1 for every 10 pages with missing schema (up to -3)
   - Subtract 1 if bilingual gap is true
   - Subtract 1 if AIO suppression signal is YES
   - Minimum score is 1
6. The three prioritised fixes must be specific and actionable — name the actual pages or issues from the crawl data, not generic advice.
7. The revenue risk section must connect AI invisibility to lost business in plain language. No jargon.
8. End every report with the exact Calendly link placeholder: [CALENDLY_LINK]

User Prompt
Generate a complete AI Visibility Audit Report using the data below. Follow the output structure exactly.

=== BUSINESS DATA ===
Business Name:    {{business_name}}
Website:          {{website_url}}
Primary Topic:    {{primary_topic}}
Location:         {{location}}
Competitor URL:   {{competitor_url}}
Audit Date:       {{today_date}}

=== CRAWL DATA (Screaming Frog) ===
Pages crawled:          {{sf_pages_crawled}}
Missing schema markup:  {{sf_missing_schema_ct}} pages — URLs: {{sf_missing_schema}}
Duplicate title tags:   {{sf_dup_titles_ct}} pages — URLs: {{sf_dup_titles}}
Missing H1 tags:        {{sf_missing_h1_ct}} pages
Hreflang errors:        {{sf_hreflang_errors}}
Bilingual content gap:  {{sf_bilingual_gap}}

=== AI CITATION DATA (Perplexity) ===
Business cited in AI answer for "{{primary_topic}} in {{location}}":  {{perp_cited}}
Competitors cited instead:                                             {{perp_cited_competitors}}
Full AI answer excerpt (first 400 chars):                              {{perp_excerpt}}

=== SEARCH CONSOLE DATA ===
Top queries by impressions:  {{gsc_top_queries}}
Average position (core topic): {{gsc_avg_position}}
Average CTR:                   {{gsc_avg_ctr}}
AIO suppression signal:        {{gsc_low_ctr_flag}}

=== OUTPUT STRUCTURE — follow exactly ===

<h1>AI Visibility Audit — {{business_name}}</h1>
<p><strong>Prepared by Capital AI | {{today_date}}</strong></p>
<hr>

<h2>Executive Summary</h2>
<p>[2-3 sentences covering current AI visibility status and biggest single risk. End with: <strong>AI Visibility Score: X/10</strong> — calculated per the scoring rules in your instructions.]</p>

<h2>AI Citation Score</h2>
<table>
  <tr><th>Metric</th><th>Result</th></tr>
  <tr><td>Cited in AI engines (Perplexity)</td><td>{{perp_cited}}</td></tr>
  <tr><td>Competitors cited instead</td><td>{{perp_cited_competitors}}</td></tr>
  <tr><td>AI suppression signal (GSC)</td><td>{{gsc_low_ctr_flag}}</td></tr>
  <tr><td>Average organic position</td><td>{{gsc_avg_position}}</td></tr>
</table>
<p><strong>Verdict:</strong> [1 sentence interpreting what this means for the business specifically.]</p>

<h2>Technical Gaps Blocking AI Visibility</h2>
<table>
  <tr><th>Issue</th><th>Pages Affected</th><th>AI Impact</th></tr>
  <tr><td>Missing schema markup</td><td>{{sf_missing_schema_ct}}</td><td>[HIGH/MEDIUM/LOW with 1-sentence reason]</td></tr>
  <tr><td>Duplicate title tags</td><td>{{sf_dup_titles_ct}}</td><td>[impact]</td></tr>
  <tr><td>Missing H1 tags</td><td>{{sf_missing_h1_ct}}</td><td>[impact]</td></tr>
  <tr><td>Hreflang errors</td><td>[count from data]</td><td>[impact — HIGH if Ottawa/bilingual market]</td></tr>
  <tr><td>Bilingual content gap</td><td>{{sf_bilingual_gap}}</td><td>[impact]</td></tr>
</table>

<h2>Top 3 Prioritised Fixes</h2>

<h3>Fix 1: [Specific title based on the data] — HIGH impact</h3>
<p><strong>What:</strong> [Exact action, referencing specific URLs or page counts from the crawl data]</p>
<p><strong>Why it matters for AI:</strong> [One sentence on the mechanism — how this fix directly improves AI citation likelihood]</p>
<p><strong>How:</strong></p>
<ul>
  <li>[Step 1 — concrete]</li>
  <li>[Step 2 — concrete]</li>
  <li>[Step 3 — concrete]</li>
</ul>
<p><strong>Timeline:</strong> [Realistic estimate]</p>

<h3>Fix 2: [Title] — MEDIUM-HIGH impact</h3>
[same structure]

<h3>Fix 3: [Title] — MEDIUM impact</h3>
[same structure]

<h2>Competitive Gap Analysis</h2>
<table>
  <tr><th>Factor</th><th>{{business_name}}</th><th>{{competitor_url}}</th></tr>
  <tr><td>AI citation</td><td>{{perp_cited}}</td><td>[infer from Perplexity data — if competitor appears in perp_cited_competitors, mark YES]</td></tr>
  <tr><td>Schema coverage (estimated)</td><td>[derive from sf_missing_schema_ct / sf_pages_crawled as %]</td><td>[estimate based on citation presence]</td></tr>
  <tr><td>Bilingual content</td><td>{{sf_bilingual_gap}}</td><td>[estimate]</td></tr>
  <tr><td>Topical authority signal</td><td>[Low/Medium/High based on GSC position]</td><td>[estimate]</td></tr>
</table>
<p><strong>Gap summary:</strong> [2 sentences — what the competitor is doing that this business is not, based on actual data.]</p>

<h2>Revenue Risk Assessment</h2>
<p>[3-4 sentences in plain English. Connect AI invisibility to lost leads and revenue. Be specific to their industry and location. Example frame: every month not cited in AI answers = X% of top-of-funnel traffic going to competitors who are cited. No jargon.]</p>

<h2>Your Next Step</h2>
<p>The fastest way to start recovering AI visibility is to implement Fix 1 this week. Book a 15-minute call and we will show you exactly how.</p>
<p><strong><a href="[CALENDLY_LINK]">Book your free 15-minute strategy call →</a></strong></p>
<hr>
<p><em>This report was generated automatically and reviewed by a Capital AI strategist before delivery. | capitalai.ca</em></p>

3. Email Copy — Exact Text

Auto-Reply Email (fires within 30 seconds of form submission)
Subject: ✅ Your AI Visibility Audit is running — Capital AI

Hi {{first_name}},

We received your request for {{business_name}} and your audit is running right now.

Here's what's happening in the background:

→ We're crawling {{website_url}} for technical AI visibility gaps
→ We're checking whether your business appears in AI-generated answers for "{{primary_topic}} in {{location}}"
→ We're pulling your Search Console data for AI suppression signals

Your full report will land in this inbox in approximately 15 minutes.

In the meantime, your AI Visibility Checklist is attached — it covers the 12 most common reasons businesses get ignored by AI engines.

We'll be in touch shortly.

— The Capital AI Team
capitalai.ca

Final Delivery Email (sent after human approves)
Subject: Your AI Visibility Audit is ready — here's what we found for {{business_name}}

Hi {{first_name}},

Your full AI Visibility Audit is attached. Here's the short version:

[IF perp_cited = "NO — not cited"]
⚠️  {{business_name}} does not appear in AI-generated answers for
    "{{primary_topic}} in {{location}}". Your competitors do.

[IF sf_missing_schema_ct > 10]
🔴  {{sf_missing_schema_ct}} of your pages are missing schema markup —
    the single most common reason AI engines skip a business entirely.

[IF sf_bilingual_gap = true]
🔴  Your French content is incomplete. In Ottawa, AI engines
    strongly favour bilingual sources. This is a fast win.

[IF gsc_low_ctr_flag contains "YES"]
🔴  Your Google impressions are high but clicks are unusually low —
    a strong signal that an AI Overview is intercepting your traffic.

The full report (attached) includes your AI Visibility Score, every technical
gap found, and 3 specific fixes ranked by impact and effort.

The businesses that act on this first win the AI citations. The ones that
wait cede that ground to whoever moves faster.

We have time this week to implement Fix 1 with you directly.

👉 Book your free 15-minute strategy call:
   [CALENDLY_LINK]

Reply to this email if you have any questions before then.

— {{strategist_name}}
  Capital AI
  capitalai.ca
  {{strategist_phone}}


P.S. Fix 1 in the report typically takes 1–2 hours to implement
     and is the highest-leverage change you can make right now.

⏭️ Next action: Paste your Screaming Frog VPS endpoint (or confirm you need the Flask wrapper code for the VPS) and we build out that crawl API so Module 4A has a live target to hit.