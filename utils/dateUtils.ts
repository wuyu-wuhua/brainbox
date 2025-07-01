// 格式化时间为完整的年月日时分秒格式
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  
  // 显示完整的年月日时分秒
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
} 