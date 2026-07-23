# Checkpoint — 2026-07-22 — Repo Setup + Rules Consolidation

## State (verified this session unless marked *reported*)

- Working folder live and synced: `C:\Users\Administrator\Desktop\Capital AI\capital-ai-projects\capitalai-website\` ↔ `iPro-CapitalAI/Capital-AI` ↔ Vercel auto-deploy. Push verified end-to-end (commits `b476193`, `5d0a9a4`, `35295f1`).
- **Public-exposure incident closed:** 19 files removed from public deployment across two commits — client audit + screenshots, third-party sample audit (sitemate.com), internal strategy folders, audit-automation internals, tool source, personal photo, project-tree.txt. Files quarantined in `Desktop\Capital AI\private-archive\`. Note: all remain in git history; scrub via `git filter-repo` is a known, deliberate, not-yet-scheduled job.
- CRLF phantom-diff resolved (`core.autocrlf false` + renormalize; root cause left with the removed audit file). Working tree clean.
- Repo structure added: `docs\checkpoints\`, `content\posts\`, `.gitignore`.
- Rules consolidation verified 4/4 in a fresh chat: API carve-out (§5), single delivery-end human gate (§4), no reply skeleton, Astro-decided/static-shipped.
- *Reported, unverified:* chatbot front-end is a placebo calling nothing; fix queue exists (form forward, Leeming 301 in vercel.json, FR cleanup, canonical fix).

## Decisions Made

- Next.js rebuild rejected after adversarial second opinion (Grok) + adjudication. **Astro** is the framework target — timeboxed, sequenced *after* content validation. Static HTML stays until hand-editing across dozens of files becomes the bottleneck.
- **Markdown from post #1** — no content is ever authored as hand-rolled HTML; `content\posts\` is its home. This makes framework timing low-stakes.
- Existing `Capital-AI` repo remains repo of record — no parallel repo, no cutover.
- Reply-skeleton mandate retired; working agreement (06) replaces the CTO persona.
- Grok's 2026-update claims adjudicated: March 2026 core update real; "holistic site-wide CWV" is industry inference never labelled by Google — filed as figure-governance case-study material for content.

## Next Priorities (in order)

1. **Token rotation** — legacy PAT exposed in old chat logs; retire at github.com/settings/tokens. Two minutes. Repeatedly deferred.
2. **Verify the chatbot-placebo claim** — if the front-end calls nothing, it's a live conversion leak; wiring `/api/chat` is a sanctioned §5(a) Claude API job.
3. Ship the fix queue: form forward, Leeming 301, FR cleanup, canonical fix — none of it creates Astro migration debt.
4. Voice guide — still the gate on all article drafting and Writing Agent activation.
5. Crawler mojibake defect (UTF-8 em-dashes in audit HTML) — fix before any client deliverable.
