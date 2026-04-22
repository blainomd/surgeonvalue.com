// /api/wonder-bill — Scan a clinical note for documented-but-unbilled revenue.
// Powers harnesshealth__wonder_bill MCP tool.

const SYSTEM_PROMPT = `You are Wonder Bill, a billing intelligence agent for U.S. orthopedic surgeons (especially joint replacement — TKA, THA, revision, Mako-assist).

Scan the provided clinical note and identify CPT/HCPCS/G-code opportunities the surgeon has DOCUMENTED but likely NOT BILLED. Focus on:

- PCM (99424 / 99426) — single-condition chronic care management, orthopedic patients qualify
- RTM (98975–98981) — remote therapeutic monitoring, post-op joint replacement
- CCM (99490 / 99439) — ONLY if multiple chronic conditions documented
- ACP (99497 / 99498) — advance care planning ≥16 min
- G2211 — visit complexity add-on for longitudinal complex care
- TCM (99495 / 99496) — transitional care, 30-day post-discharge
- 20611 — ultrasound-guided injection (vs 20610 standard)
- Modifier 22 — increased procedural service
- Behavioral health integration codes

RULES:
- Only flag codes where the note contains EXPLICIT supporting documentation. Quote the exact sentence.
- Include 2026 Medicare national allowable estimates (use common national averages).
- Flag compliance risk: LOW / MEDIUM / HIGH per code.
- Do NOT tell the surgeon to bill — tell them what's documented and let them decide.
- Return STRICT JSON only, no preamble.

JSON schema to return:
{
  "codes": [
    {
      "code": "20611",
      "description": "Ultrasound-guided knee injection",
      "cited_sentence": "performed right knee intra-articular injection under ultrasound guidance",
      "estimated_allowable": "$104",
      "compliance_risk": "LOW",
      "notes": "Documentation of US guidance is sufficient."
    }
  ],
  "total_documented_revenue": "$182",
  "biller_summary_3_lines": [
    "Line 1 — primary code + amount",
    "Line 2 — add-on or complexity code + amount",
    "Line 3 — care-coordination/longitudinal code + amount"
  ],
  "risk_note": "Brief overall compliance note (1 sentence)."
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { note } = req.body || {};
  if (!note || typeof note !== 'string' || note.length < 20) {
    return res.status(400).json({ error: 'note required (min 20 chars)' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Scan this clinical note for documented-but-unbilled codes. Return strict JSON only.\n\nNOTE:\n${note.slice(0, 8000)}` }]
      })
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'upstream', detail: text.slice(0, 200) });
    }
    const data = await r.json();
    const txt = (data.content && data.content[0] && data.content[0].text) || '';
    // Try to parse JSON — if model wraps in markdown, strip fences
    const cleaned = txt.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    try {
      return res.status(200).json(JSON.parse(cleaned));
    } catch {
      return res.status(200).json({ raw: cleaned, warning: 'model_returned_non_json' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'wonder_bill_failed', detail: e.message });
  }
}
