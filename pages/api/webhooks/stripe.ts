import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }
  const sig = req.headers['stripe-signature'] as string;
  let event;
  try {
    const buf = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).json({ error: `Webhook 签名验证失败: ${err.message}` });
  }
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        // TODO: 处理订阅创建
        break;
      case 'customer.subscription.updated':
        // TODO: 处理订阅更新
        break;
      case 'customer.subscription.deleted':
        // TODO: 处理订阅取消
        break;
      case 'invoice.payment_succeeded':
        // TODO: 处理支付成功
        break;
      case 'invoice.payment_failed':
        // TODO: 处理支付失败
        break;
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: `Webhook 处理失败: ${err.message}` });
  }
} 