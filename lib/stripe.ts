import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // 只在服务端抛出错误，避免前端打包时报错
  if (typeof window === 'undefined') {
    throw new Error('缺少 Stripe Secret Key，请检查环境变量 STRIPE_SECRET_KEY');
  }
}

export const stripe = new Stripe(stripeSecretKey || '', {
  typescript: true,
}); 