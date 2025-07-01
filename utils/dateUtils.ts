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

/**
 * 格式化时间为 "2025/7/1 15:04:39" 格式
 * @param dateInput - 日期输入，可以是Date对象、ISO字符串或时间戳
 * @returns 格式化后的时间字符串
 */
export const formatDateTime = (dateInput: Date | string | number): string => {
  try {
    let date: Date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      // 处理各种字符串格式
      if (dateInput.includes('T') || dateInput.includes('-')) {
        // ISO格式或类似格式
        date = new Date(dateInput);
      } else {
        // 其他字符串格式，尝试直接解析
        date = new Date(dateInput);
      }
    } else if (typeof dateInput === 'number') {
      // 时间戳
      date = new Date(dateInput);
    } else {
      // 其他类型，使用当前时间
      date = new Date();
    }

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无效的日期输入:', dateInput);
      date = new Date();
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 月份从0开始，需要+1
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // 格式化为 "2025/7/1 15:04:39"
    return `${year}/${month}/${day} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('时间格式化错误:', error, '输入:', dateInput);
    return new Date().toLocaleString('zh-CN');
  }
};

/**
 * 获取当前时间的标准格式字符串
 * @returns 当前时间的标准格式字符串
 */
export const getCurrentTimeString = (): string => {
  return formatDateTime(new Date());
}; 