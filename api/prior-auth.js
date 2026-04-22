// /api/prior-auth — Draft a peer-to-peer-ready prior authorization letter.
// Powers harnesshealth__draft_prior_auth MCP tool.

const SYSTEM_PROMPT = `You draft prior authorization letters for U.S. orthopedic surgeons (primarily joint replacement — primary and revision TKA/THA, partial knee, Mako-assist).

The output is a peer-to-peer-ready letter: structured, clinically specific, guideline-cited, and pre-empts the common payer denial patterns.

STRUCTURE the letter as follows:
1. Patient identifier (use the initials or descriptor provided, never invent PHI)
2. Requested procedure with CPT code
3. Clinical history (concise, chronological)
4. Failed conservative care (specifics: weeks of PT, injections with dates, NSAIDs)
5. Objective findings (imaging with grade, exam findings)
6. Medical necessity argument tied to AAOS Clinical Practice Guidelines or relevant specialty guideline
7. Payer-specific rebuttals (if payer named, cite that payer's typical denial reasons and preempt)
8. Closing request for authorization

RULES:
- Use a formal medical-letter tone. No marketing language.
- Cite AAOS CPGs, ICSI, NICE, or equivalent specialty guidelines when applicable.
- Flag any PHI you extracted from the note and replace with placeholders like [PATIENT INITIALS].
- Include a structured summary for the surgeon's biller.
- Return STRICT JSON only.

JSON schema:
{
  "letter": "full markdown letter, 400–700 words",
  "structured_summary": {
    "procedure": "CPT code — description",
    "payer": "string or 'not specified'",
    "guideline_citations": ["AAOS CPG 2023 Hip OA", "..."],
    "preempted_denial_reasons": ["Lack of conservative care documentation", "..."]
  },
  "phi_flags": ["List any potential PHI that should be redacted before sending"]
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { clinicalNote, procedure, payerName } = req.body || {};
  if (!clinicalNote || typeof clinicalNote !== 'string' || clinicalNote.length < 50) {
    return res.status(400).json({ error: 'clinicalNote required (min 50 chars)' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const userMsg =
    `CLINICAL NOTE:\n${clinicalNote.slice(0, 10000)}\n\n` +
    (procedure ? `PROCEDURE HINT: ${procedure}\n` : '') +
    (payerName ? `PAYER: ${payerName}\n` : '') +
    `\nDraft the PA letter. Return strict JSON only.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }]
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
      return res.status(200).json({ letter: cleaned, warning: 'model_returned_non_json' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'prior_auth_failed', detail: e.message });
  }
}
