// /api/post-draft — Draft X and LinkedIn posts from a surgeon's clinical observation.
// Powers harnesshealth__draft_post MCP tool.

const SYSTEM_PROMPT = `You draft social media content for U.S. orthopedic surgeons (primarily joint replacement — TKA, THA, revision) in their own voice.

RULES:
- Never include PHI. Strip names, dates, locations, identifying details. If the observation contains any, genericize it.
- Never salesy. Never mention product names. Teach something specific and human.
- Surgeon voice: direct, confident, slightly dry. Avoid emojis and exclamation points.
- X post: ≤280 chars. Conversational. Specific number or specific moment.
- LinkedIn post: 120–220 words. Structure: hook → observation → what it means → one-line close. Use line breaks.
- Add 3–5 relevant hashtags at the end of the LinkedIn post only.
- Return STRICT JSON only. No preamble.

JSON schema:
{
  "x_post": "string, ≤280 chars",
  "linkedin_post": "string, 120-220 words, line breaks preserved",
  "hashtags": ["#MedEd", "#Orthopedics", "..."],
  "phi_stripped_from_original": true
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { observation } = req.body || {};
  if (!observation || typeof observation !== 'string' || observation.length < 15) {
    return res.status(400).json({ error: 'observation required (min 15 chars)' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Observation:\n${observation.slice(0, 3000)}\n\nReturn strict JSON only.` }]
      })
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'upstream', detail: text.slice(0, 200) });
    }
    const data = await r.json();
    const txt = (data.content && data.content[0] && data.content[0].text) || '';
    const cleaned = txt.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    try {
      return res.status(200).json(JSON.parse(cleaned));
    } catch {
      return res.status(200).json({ raw: cleaned, warning: 'model_returned_non_json' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'post_draft_failed', detail: e.message });
  }
}
