# CapitalAI.ca — Project Breakdown

---

## Project Name
**CapitalAI.ca** — Ottawa AI-Powered SEO Agency Website

---

## Core Goal
Build and launch a self-hosted, AI-first SEO agency website that dominates Google, Perplexity, ChatGPT, and Google Overviews for Ottawa/NCR market. Primary revenue action: book free 15-min AI Visibility Audits via the site and chatbot.

---

## Current Stack & Tools

| Layer | Tool |
|---|---|
| Hosting | Vercel (Hobby plan) |
| Frontend | Static HTML/CSS/JS — single `index.html`, no framework |
| Fonts | Self-hosted woff2 — Syne 700/800 + DM Sans 300/400/500 in `/fonts/` |
| DNS | Vercel nameservers |
| Domain | GoDaddy — capitalai.ca |
| Email | Microsoft 365 Business Basic — hello@capitalai.ca (trial, expires Apr 17) |
| Forms | Formspree → hello@capitalai.ca |
| Chatbot | Vanilla JS widget embedded in index.html, calls `/api/chat` Edge Function |
| API Proxy | Vercel Edge Function (`api/chat.js`) — holds Anthropic key server-side |
| AI Model | claude-sonnet-4-20250514 via Anthropic API |
| Analytics | Vercel Analytics (active), GA4 (not yet connected) |
| Version Control | GitHub — iPro-CapitalAI/Capital-AI, main branch |
| Deployment | Auto-deploy from GitHub main → Vercel |
| CDN/Security | Cloudflare (email obfuscation, CDN) |

---

## Key Instructions / Tone

**Site tone:** Professional, approachable, confident, evidence-based, bilingual-aware (EN primary, FR parity for Ottawa/Gatineau), never salesy.

**Chatbot tone:** Confident direct expert. No-BS Ottawa AI SEO strategist. Max 4 sentences per response. No markdown in responses. Loss-framing. Primary goal: book the free 15-min audit. After 2-3 exchanges push Calendly. Token `[SHOW_CALENDLY]` triggers booking card.

**Development rules:**
- Self-hosted first — never recommend paid third-party tools unless proven impossible to replace
- Human oversight gates on all automations
- Anti-hallucination — cite sources from context library only
- No auto-publish without E-E-A-T Guardian approval
- Quality absolute — E-E-A-T, originality, no spam

---

## Progress Status

### ✅ Complete
- Full static site live at www.capitalai.ca
- WCAG 2.1 AA / Treasury Board compliance (skip link, focus ring, aria-required, contrast)
- Self-hosted fonts — Google Fonts removed entirely
- Schema.org LocalBusiness JSON-LD
- hreflang EN/FR
- Canonical URL
- Ottawa Parliament skyline SVG (Peace Tower, Château Laurier, East/West Blocks, Supreme Court, Confederation Building, Library of Parliament)
- Formspree contact form (Name, Email, Phone)
- Microsoft 365 email — hello@capitalai.ca
- Vercel Analytics
- PageSpeed: Accessibility 100, SEO 100, Best Practices 100
- Chatbot widget embedded in index.html
- Vercel Edge Function API proxy (`api/chat.js`) — API key secured server-side
- `ANTHROPIC_API_KEY` added to Vercel environment variables
- Testimonials section (4 cards, 2×2 grid) — **flagged risk below**

### 🔴 Incomplete / Pending
- French page `/fr/` — hreflang points to it, page does not exist
- Real Calendly URL — placeholder `calendly.com/capitalai` in chatbot
- GA4 not connected — need `G-` measurement ID
- FAQ block — not built
- Pricing section — waiting for 2+ paying clients
- Vapi voice agent — not started
- Microsoft 365 trial — expires April 17, 2026
- Anthropic billing credits — status unclear

---

## Decisions & Risks

### 🔴 Critical Risk — Fake Testimonials
Four named individuals with specific companies and fabricated metrics are live on the site: Dr. Sarah Patel, Marc Levesque, Jennifer Moreau, Alex Rivera. If a prospect Googles any of them and finds no connection to Capital AI, credibility is destroyed. **Action required: pull or replace immediately.**

### 🔴 Critical Risk — No Paying Clients
All social proof is fabricated. Site is fully built but has no verified revenue results. Outreach has not started.

### 🟡 Microsoft 365 Trial
Expires April 17, 2026. Cancel or convert to paid before that date or lose hello@capitalai.ca email.

### 🟡 Anthropic API — External Paid Service
The chatbot uses the Anthropic API (~$2-5/month at current traffic). This conflicts with the self-hosted zero-cost mandate in the CapitalAI strategy bible.

### 🟡 Formspree — External Service
Free tier, 50 submissions/month. Low risk at current stage but conflicts with self-hosted mandate.

### 🟡 Vercel — External Service
Hobby plan, acceptable low-cost exception per CLAUDE.md. Acceptable for now.

---

## Knowledge Base Files

| File | Purpose |
|---|---|
| `CapitalAI_Master_System_Prompt.md` | Core agency philosophy, never-violate rules |
| `GeoScale_Strategy_Bible.md` | KrispCall-derived programmatic geo scale strategy |
| `Inbound_Flywheel_Guide.md` | Attract → Engage → Delight conversion architecture |
| `Full_Automated_Strategy_Playbook.md` | 6-step self-hosted playbook (n8n + Ollama + Scrapy) |
| `Engage_Tactics_Playbook.md` | CTAs, lead magnets, chatbots, nurture sequences |
| `GeoScale_Strategy_Bible.md` | Core programmatic scale strategy |
| `Case_Studies_Proof_Bible.md` | KrispCall, Flyhomes, Deepgram, Omnius benchmarks |
| `E-E-A-T_Originality_Guardrail_Checklist.md` | Mandatory pre-publish quality checklist |
| `Risks_Mitigation_&_FineTuning_Guide.md` | Security, performance, hallucination prevention |
| `SelfHosted_Infra_Guide.md` | n8n + Ollama + Scrapy + GSC API stack |
| `apitalAI_Tone_Voice_Brand_Guide.md` | Voice, tone, bilingual, client-first rules |
| `CLAUDE.md` | Project-level must-haves, tech preferences, workflow |

---

## Conflicts with Self-Hosted CapitalAI Strategy

| Conflict | Severity | Notes |
|---|---|---|
| **Anthropic API** (chatbot) | 🟡 Medium | Direct contradiction of zero-external-API rule. Mitigation: replace with self-hosted Ollama model when n8n stack is live. For now acceptable as MVP. |
| **Formspree** (contact form) | 🟡 Low | Should be replaced with n8n webhook + self-hosted form handler. Simple swap when n8n is running. |
| **Vercel** (hosting) | 🟢 Accepted | CLAUDE.md explicitly accepts Vercel as low-cost acceptable exception. |
| **Microsoft 365** (email) | 🟡 Low | External paid service. Could be replaced with self-hosted mail (Postal, Mailu) on VPS when n8n stack is live. |
| **Cloudflare** (CDN/DNS) | 🟢 Low risk | Free tier, widely accepted. No conflict at this stage. |