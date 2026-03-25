First prompt provided
---------------------

Outline the complete end-to-end automated workflow from new Formspree submission to final report delivery. Include recommended tools for each step, the exact Claude prompt we will use for report generation, and the Zapier/Make.com trigger setup. Prioritize the highest-impact automation first.

The exact workflow upon form submission (fully automated, 15-min human review only):
1. Instant auto-reply (0 min human)
   * Formspree/Zapier sends: "Thanks — your audit is running. We'll email the full report in ~15 mins."
   * Attach the checklist template.
2. Automated data collection (Zapier/Make.com — 0 min human)
   * Trigger: New Formspree submission
   * Run Screaming Frog crawl → export missing schema/duplicates
   * Perplexity API query on core topic → screenshot if cited
   * Google Search Console API → AI Overviews exposure
   * Hreflang + bilingual parity check
3. Claude/Grok generates the report (Claude API — 0 min human)
   * Feed all data into one prompt → outputs clean PDF-style report (gaps, AI citation score, 3 prioritized fixes, competitive comparison)
4. Delivery + upsell (5 min human review)
   * Email the report + "Here's exactly where AI is ignoring your site"
   * Calendly link for 15-min review call (where you close the retainer)
Tech stack (cheap & scalable):
* Formspree → Zapier/Make.com (trigger)
* Screaming Frog API or self-hosted crawl
* Perplexity API
* Claude API (report generation)
* PDF.co or Google Docs for output