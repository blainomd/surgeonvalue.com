// Stripe Checkout — SurgeonValue
// Creates a hosted checkout session for Core ($199/mo) and Pro ($299/mo)
// Env vars required in Vercel dashboard:
//   STRIPE_SECRET_KEY  — your Stripe secret key (sk_live_... or sk_test_...)
//   STRIPE_PRICE_CORE  — price ID for Core plan ($199/mo recurring)
//   STRIPE_PRICE_PRO   — price ID for Pro plan ($299/mo recurring)

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan } = req.body || {};

  const PRICE_MAP = {
    core:      { id: process.env.STRIPE_PRICE_CORE, mode: 'subscription' },
    pro:       { id: process.env.STRIPE_PRICE_PRO,  mode: 'subscription' },
    encounter: { id: 'price_1TGReyIKPrlV1tgyQs1vgqUq', mode: 'payment' },
  };

  const priceConfig = PRICE_MAP[plan];
  if (!priceConfig) {
    return res.status(400).json({ error: `Unknown plan: ${plan}. Must be 'core', 'pro', or 'encounter'.` });
  }
  const priceId = priceConfig.id;
  const checkoutMode = priceConfig.mode;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY in Vercel.' });
  }

  try {
    const origin = req.headers.origin || 'https://surgeonvalue.com';

    const body = new URLSearchParams({
      mode: checkoutMode,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      'cancel_url': `${origin}/#pricing`,
      'billing_address_collection': 'required',
      'allow_promotion_codes': 'true',
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session.error);
      return res.status(500).json({ error: session.error?.message || 'Stripe error' });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
