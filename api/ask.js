// /api/ask — Billing / coding / compliance Q&A for orthopedic surgeons.
// Powers harnesshealth__ask MCP tool.

const SYSTEM_PROMPT = `You are a U.S. orthopedic billing and compliance expert focused on 2026 Medicare rules.

You answer surgeon questions about CPT/HCPCS/G-codes, NCCI edits, global periods, modifiers, prior authorization rules, AKS/Stark implications, and documentation requirements. Focus on joint replacement (TKA, THA, revision) but handle any ortho question.

RULES:
- Lead with the direct answer in one sentence.
- Cite the specific rule, code, modifier, or source (e.g., "CPT Assistant 2024", "CMS-1832-F", "NCCI Edit table Q1 2026").
- If the answer depends on conditions, state the conditions clearly.
- Flag any compliance risk explicitly (LOW / MEDIUM / HIGH).
- Keep response under 220 words.
- Do NOT tell the surgeon what to bill — tell them what the rule says and let them decide.
- Return STRICT JSON only.

JSON schema:
{
  "answer": "string, ≤220 words, markdown allowed for bold/lists",
  "citations": ["specific rule / code / source"],
  "compliance_risk": "LOW | MEDIUM | HIGH",
  "one_line_summary": "10-20 word takeaway"
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { question } = req.body || {};
  if (!question || typeof question !== 'string' || question.length < 5) {
    return res.status(400).json({ error: 'question required (min 5 chars)' });
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
        messages: [{ role: 'user', content: question.slice(0, 2000) }]
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
      return res.status(200).json({ answer: cleaned, warning: 'model_returned_non_json' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'ask_failed', detail: e.message });
  }
}
