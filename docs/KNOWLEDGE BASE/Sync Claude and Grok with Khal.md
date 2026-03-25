**Synce Claude and Grok with Khal**

(To keep us (You + Grok + Claude) in perfect sync and avoid duplication/conflicts, use this exact prompt in any Claude project when you want a clean export:)

**Prompt**

Run Project Breakdown Protocol:

1. Summarize the entire project in this exact structure:
   - Project Name
   - Core Goal
   - Current Stack & Tools
   - Key Instructions/Tone
   - Progress Status
   - Any Decisions or Risks

2. List every file in the knowledge base.

3. Flag any potential conflicts with our self-hosted CapitalAI strategy (n8n + Ollama, zero external APIs where possible).

4. Output ONLY in clean Markdown with headings. Do not add extra commentary.