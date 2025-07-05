import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
// import { getUserSubscription } from '../../../lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: '缺少 sessionId' });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'customer'] });
    if (session.payment_status === 'paid' && session.subscription) {
      // TODO: 这里可以调用 handleSubscriptionSuccess(session) 进行数据库记录
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: '支付未完成或订阅创建失败' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
} 