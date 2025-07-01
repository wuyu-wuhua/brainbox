import { ChatHistory, Message } from '../types/chat';
import { 
  saveHistoryToDB, 
  updateHistoryInDB, 
  getHistoriesFromDB, 
  deleteHistoryFromDB, 
  updateHistoryTitleInDB, 
  deleteMultipleHistoriesFromDB, 
  clearAllHistoriesFromDB 
} from './databaseStorage';

const isClient = typeof window !== 'undefined';

// 全局用户ID变量，由AuthContext设置
let currentUserId: string | null = null;

// 设置当前用户ID的函数，供AuthContext调用
export const setCurrentUserId = (userId: string | null) => {
  currentUserId = userId;
  console.log('设置当前用户ID:', userId);
};

// 添加事件总线
export const historyEventBus = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  emit() {
    this.listeners.forEach(listener => listener());
  }
};

// 获取当前用户ID（优先使用全局变量，备用localStorage）
const getCurrentUserId = (): string | null => {
  if (!isClient) return null;
  
  // 优先使用全局变量
  if (currentUserId) {
    return currentUserId;
  }
  
  try {
    // 如果没有全局变量，尝试从localStorage获取
    const possibleKeys = [
      'sb-localhost-auth-token',
      'sb-auth-token',
      'supabase.auth.token',
      'sb-project-auth-token'
    ];
    
    for (const key of possibleKeys) {
      const sessionData = localStorage.getItem(key);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session?.user?.id) {
            console.log('从localStorage获取到用户ID:', session.user.id, '键:', key);
            return session.user.id;
          }
        } catch (e) {
          // 继续尝试下一个键
        }
      }
    }
    
    console.log('未找到用户ID，用户可能未登录');
    return null;
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return null;
  }
};

// 获取当前用户的存储键
const getUserStorageKey = (userId: string | null, key: string): string => {
  if (!userId) {
    return `guest_${key}`; // 未登录用户使用guest前缀
  }
  return `user_${userId}_${key}`;
};

// 后台数据库操作（fire-and-forget）
const tryDatabaseOperation = async (operation: () => Promise<any>, operationName: string) => {
  try {
    console.log(`🔄 ${operationName} - 开始数据库操作`);
    const result = await operation();
    if (result) {
      console.log(`✅ ${operationName} - 数据库操作成功`, result);
    } else {
      console.warn(`⚠️ ${operationName} - 数据库操作失败，但localStorage已保存`);
    }
  } catch (error) {
    console.error(`❌ ${operationName} - 数据库操作异常:`, error);
    // 如果是在开发环境，显示更详细的错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('详细错误信息:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
};

export const saveHistory = (messages: Message[], model: string, type: 'chat' | 'draw' | 'read' | 'video' = 'chat') => {
  if (!isClient || messages.length === 0) return;

  const userId = getCurrentUserId();
  if (!userId) {
    console.log('用户未登录，不保存历史记录');
    return;
  }

  const history: ChatHistory = {
    id: Date.now().toString(),
    title: messages[0].content.slice(0, 30) + '...',
    model,
    messages,
    timestamp: Date.now(),
    type,
  };

  // 立即保存到localStorage
  const histories = getHistories();
  histories.unshift(history);
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();

  // 后台尝试保存到数据库
  tryDatabaseOperation(
    () => saveHistoryToDB(messages, model, type),
    'saveHistory'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
};

export const saveSessionHistory = (messages: Message[], model: string, type: 'chat' | 'draw' | 'read' | 'video' = 'chat'): string => {
  if (!isClient || messages.length === 0) return '';

  const userId = getCurrentUserId();
  if (!userId) {
    console.log('用户未登录，不保存会话历史记录');
    return '';
  }

  const sessionId = Date.now().toString();
  const history: ChatHistory = {
    id: sessionId,
    title: messages[0].content.slice(0, 30) + '...',
    model,
    messages,
    timestamp: Date.now(),
    type,
  };

  // 立即保存到localStorage
  const histories = getHistories();
  histories.unshift(history);
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();
  
  // 后台尝试保存到数据库
  tryDatabaseOperation(
    () => saveHistoryToDB(messages, model, type),
    'saveSessionHistory'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }

  return sessionId;
};

export const updateSessionHistory = (sessionId: string, messages: Message[], model: string) => {
  console.log('=== updateSessionHistory 开始 ===');
  console.log('sessionId:', sessionId);
  console.log('messages count:', messages.length);
  
  if (!isClient || !sessionId || messages.length === 0) {
    console.log('updateSessionHistory - 提前返回，条件不满足');
    return;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    console.log('用户未登录，不更新会话历史记录');
    return;
  }

  // 立即更新localStorage
  const histories = getHistories();
  console.log('当前历史记录数量:', histories.length);
  
  const sessionIndex = histories.findIndex(h => h.id === sessionId);
  console.log('找到会话索引:', sessionIndex);
  
  if (sessionIndex !== -1) {
    const originalTitle = histories[sessionIndex].title;
    console.log('原标题:', originalTitle);
    
    histories[sessionIndex] = {
      ...histories[sessionIndex],
      messages,
      model,
      timestamp: Date.now(),
      title: originalTitle, // 保持原标题不变
    };
    
    console.log('更新会话成功');
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(histories));
    historyEventBus.emit();

    // 后台尝试更新数据库
    tryDatabaseOperation(
      () => updateHistoryInDB(sessionId, messages, model),
      'updateSessionHistory'
    );
  } else {
    console.log('未找到对应的会话ID:', sessionId);
  }
  console.log('=== updateSessionHistory 结束 ===');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
};

export const getHistories = (): ChatHistory[] => {
  if (!isClient) return [];
  
  const userId = getCurrentUserId();
  if (!userId) {
    // 未登录用户返回空数组
    return [];
  }
  
  try {
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    const histories = localStorage.getItem(storageKey);
    return histories ? JSON.parse(histories) : [];
  } catch (error) {
    console.error('Failed to parse chat histories:', error);
    return [];
  }
};

// 异步获取历史记录（优先从数据库获取）
export const getHistoriesAsync = async (): Promise<ChatHistory[]> => {
  if (!isClient) return [];
  
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }
  
  try {
    // 首先尝试从数据库获取
    const dbHistories = await getHistoriesFromDB();
    if (dbHistories && dbHistories.length > 0) {
      console.log('从数据库获取历史记录成功');
      return dbHistories;
    }
  } catch (error) {
    console.error('数据库获取失败，降级到localStorage:', error);
  }

  // 数据库失败或为空时，降级到localStorage
  console.log('使用localStorage备用获取');
  return getHistories();
};

export function addHistory(history: ChatHistory) {
  const userId = getCurrentUserId();
  if (!userId) {
    console.log('用户未登录，不添加历史记录');
    return;
  }

  // 立即保存到localStorage
  const histories = getHistories();
  histories.unshift(history);
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();

  // 后台尝试保存到数据库
  tryDatabaseOperation(
    () => saveHistoryToDB(history.messages, history.model, history.type),
    'addHistory'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export function deleteHistory(id: string) {
  const userId = getCurrentUserId();
  if (!userId) return;

  // 立即从localStorage删除
  const histories = getHistories().filter(h => h.id !== id);
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();

  // 后台尝试从数据库删除
  tryDatabaseOperation(
    () => deleteHistoryFromDB(id),
    'deleteHistory'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export function updateHistory(updatedHistory: ChatHistory) {
  const userId = getCurrentUserId();
  if (!userId) return;

  // 立即更新localStorage
  const histories = getHistories();
  const index = histories.findIndex(h => h.id === updatedHistory.id);
  if (index !== -1) {
    histories[index] = updatedHistory;
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(histories));
    historyEventBus.emit();

    // 后台尝试更新数据库
    tryDatabaseOperation(
      () => updateHistoryInDB(updatedHistory.id, updatedHistory.messages, updatedHistory.model),
      'updateHistory'
    );
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export function renameHistory(id: string, newTitle: string) {
  const userId = getCurrentUserId();
  if (!userId) return;

  // 立即更新localStorage
  const histories = getHistories();
  const index = histories.findIndex(h => h.id === id);
  if (index !== -1) {
    histories[index] = {
      ...histories[index],
      title: newTitle
    };
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(histories));
    historyEventBus.emit();

    // 后台尝试更新数据库
    tryDatabaseOperation(
      () => updateHistoryTitleInDB(id, newTitle),
      'renameHistory'
    );
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export function deleteMultipleHistories(ids: string[]) {
  const userId = getCurrentUserId();
  if (!userId) return;

  // 立即从localStorage批量删除
  const histories = getHistories().filter(h => !ids.includes(h.id));
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();

  // 后台尝试从数据库批量删除
  tryDatabaseOperation(
    () => deleteMultipleHistoriesFromDB(ids),
    'deleteMultipleHistories'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export function clearHistories() {
  if (!isClient) return;
  
  const userId = getCurrentUserId();
  if (!userId) return;

  // 立即清空localStorage
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.removeItem(storageKey);
  historyEventBus.emit();

  // 后台尝试清空数据库
  tryDatabaseOperation(
    () => clearAllHistoriesFromDB(),
    'clearHistories'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export const clearAllUserData = () => {
  if (!isClient) return;
  
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    // 清除用户相关的所有localStorage数据
    const keysToRemove = [
      getUserStorageKey(userId, 'chat_histories'),
      getUserStorageKey(userId, 'user_stats'),
      getUserStorageKey(userId, 'user_activities'),
      getUserStorageKey(userId, 'favorites')
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('用户数据已清除');
    historyEventBus.emit();
  } catch (error) {
    console.error('清除用户数据失败:', error);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}; 