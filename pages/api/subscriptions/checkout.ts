import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
// import { getUserSubscription } from '../../../lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }
  try {
    const { priceId, userEmail, userId } = req.body;
    if (!priceId || !userEmail || !userId) {
      return res.status(400).json({ error: '缺少参数' });
    }
    // 这里假设 priceId 已经是 Stripe 价格ID
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/membership?canceled=true`,
      metadata: { userId, priceId },
    });
    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
} 