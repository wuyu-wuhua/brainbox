import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PricingPageClient() {
  const router = useRouter();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    const canceled = urlParams.get('canceled');
    if (success === 'true' && sessionId) {
      handleSubscriptionCallback(sessionId);
    } else if (canceled === 'true') {
      alert('支付已取消');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line
  }, []);

  const handleSubscriptionCallback = async (sessionId: string) => {
    try {
      const res = await fetch('/api/subscriptions/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const result = await res.json();
      if (result.success) {
        alert('订阅成功！');
        router.push('/membership');
      } else {
        alert(result.error || '订阅失败');
      }
    } catch (e) {
      alert('处理订阅回调失败');
    } finally {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };
  return null;
} 