import React from 'react';

// 你可以根据实际需求传入 plans 数据
const plans = [
  { id: 'price_xxx', name: '基础版', price: '¥19/月', desc: '适合个人使用' },
  { id: 'price_yyy', name: '高级版', price: '¥49/月', desc: '适合团队/企业' },
];

export default function SubscriptionPlans({ user }: { user: { id: string; email: string } }) {
  const handleSubscribe = async (priceId: string) => {
    const res = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userEmail: user.email, userId: user.id }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || '发起支付失败');
    }
  };
  return (
    <div>
      <h2>订阅方案</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{ border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
            <h3>{plan.name}</h3>
            <p>{plan.price}</p>
            <p>{plan.desc}</p>
            <button onClick={() => handleSubscribe(plan.id)}>立即订阅</button>
          </div>
        ))}
      </div>
    </div>
  );
} 