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

// 创建一个简单的事件总线
class HistoryEventBus {
  private subscribers: (() => void)[] = [];
  private lastEmitTime: number = 0;
  private readonly MIN_INTERVAL = 1000; // 最小触发间隔为1秒

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  emit() {
    const now = Date.now();
    // 如果距离上次触发时间不足1秒，则不触发
    if (now - this.lastEmitTime < this.MIN_INTERVAL) {
      return;
    }
    this.lastEmitTime = now;
    this.subscribers.forEach(callback => callback());
  }
}

export const historyEventBus = new HistoryEventBus();

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
// 移除了复杂的tryDatabaseOperation函数，直接使用saveHistoryToDB

export const saveHistory = (messages: Message[], model: string, type: 'chat' | 'draw' | 'read' | 'video' = 'chat') => {
  if (!isClient || messages.length === 0) return;

  const userId = getCurrentUserId();
  if (!userId) {
    console.log('用户未登录，不保存历史记录');
    return;
  }

  // 过滤掉空消息
  const validMessages = messages.filter(msg => 
    msg.content && 
    typeof msg.content === 'string' && 
    msg.content.trim().length > 0
  );

  if (validMessages.length === 0) {
    console.log('没有有效的消息内容，跳过保存');
    return;
  }

  // 生成更唯一的ID（时间戳 + 随机数）
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const history: ChatHistory = {
    id: uniqueId,
    title: validMessages[0].content.slice(0, 30) + '...',
    model,
    messages: validMessages,
    timestamp: Date.now(),
    type,
  };

  // 检查是否已存在相同内容的历史记录
  const histories = getHistories();
  const now = Date.now();
  const existingSimilarHistory = histories.find(h => {
    // 检查类型和模型是否相同
    if (h.type !== type || h.model !== model) {
      return false;
    }
    
    // 检查消息数量是否相同
    if (h.messages.length !== validMessages.length) {
      return false;
    }
    
    // 检查每条消息的内容和发送者是否完全相同
    const isContentSame = h.messages.every((msg, index) => 
      msg.content === validMessages[index].content &&
      msg.isUser === validMessages[index].isUser
    );
    
    if (!isContentSame) {
      return false;
    }
    
    // 如果内容完全相同，额外检查时间戳（5分钟内的重复记录视为同一个）
    const timeDiff = now - h.timestamp;
    return timeDiff < 5 * 60 * 1000; // 5分钟
  });

  if (existingSimilarHistory) {
    console.log('发现完全相同的历史记录（内容和时间都匹配），跳过保存');
    return;
  }

  // 立即保存到localStorage
  histories.unshift(history);
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();

  // 🎯 立即尝试保存到数据库，不使用setTimeout
  (async () => {
    try {
      console.log('=== 开始保存历史记录到数据库 ===');
      const dbId = await saveHistoryToDB(validMessages, model, type);
      
      if (dbId) {
        console.log(`✅ 数据库保存成功，数据库ID: ${dbId}`);
        
        // 如果数据库返回了不同的ID，更新本地记录
        if (dbId !== uniqueId) {
          const histories = getHistories();
          const index = histories.findIndex(h => h.id === uniqueId);
          if (index !== -1) {
            histories[index].id = dbId;
            const storageKey = getUserStorageKey(userId, 'chat_histories');
            localStorage.setItem(storageKey, JSON.stringify(histories));
            console.log(`✅ 历史记录ID已更新: ${uniqueId} -> ${dbId}`);
            
            // 触发历史记录更新事件
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('history-updated'));
            }
          }
        }
      } else {
        console.warn('⚠️ 数据库保存失败，但本地存储已保存');
      }
    } catch (error) {
      console.error('❌ 数据库保存异常:', error);
    }
  })();

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

  // 过滤掉空消息
  const validMessages = messages.filter(msg => 
    msg.content && 
    typeof msg.content === 'string' && 
    msg.content.trim().length > 0
  );

  if (validMessages.length === 0) {
    console.log('没有有效的消息内容，跳过保存');
    return '';
  }

  // 生成更唯一的ID（时间戳 + 随机数）
  const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const history: ChatHistory = {
    id: sessionId,
    title: validMessages[0].content.slice(0, 30) + '...',
    model,
    messages: validMessages,
    timestamp: Date.now(),
    type,
  };

  // 检查是否已存在相同内容的历史记录
  const histories = getHistories();
  const now = Date.now();
  const existingSimilarHistory = histories.find(h => {
    // 检查类型和模型是否相同
    if (h.type !== type || h.model !== model) {
      return false;
    }
    
    // 检查消息数量是否相同
    if (h.messages.length !== validMessages.length) {
      return false;
    }
    
    // 检查每条消息的内容和发送者是否完全相同
    const isContentSame = h.messages.every((msg, index) => 
      msg.content === validMessages[index].content &&
      msg.isUser === validMessages[index].isUser
    );
    
    if (!isContentSame) {
      return false;
    }
    
    // 如果内容完全相同，额外检查时间戳（5分钟内的重复记录视为同一个）
    const timeDiff = now - h.timestamp;
    return timeDiff < 5 * 60 * 1000; // 5分钟
  });

  if (existingSimilarHistory) {
    console.log('发现完全相同的历史记录（内容和时间都匹配），返回已存在的会话ID');
    return existingSimilarHistory.id;
  }

  // 立即保存到localStorage
  histories.unshift(history);
  const storageKey = getUserStorageKey(userId, 'chat_histories');
  localStorage.setItem(storageKey, JSON.stringify(histories));
  historyEventBus.emit();

  // 🎯 立即尝试保存到数据库，不使用setTimeout
  (async () => {
    try {
      console.log('=== 开始保存会话历史记录到数据库 ===');
      const dbId = await saveHistoryToDB(validMessages, model, type);
      
      if (dbId) {
        console.log(`✅ 会话数据库保存成功，数据库ID: ${dbId}`);
        
        // 如果数据库返回了不同的ID，更新本地记录
        if (dbId !== sessionId) {
          const histories = getHistories();
          const index = histories.findIndex(h => h.id === sessionId);
          if (index !== -1) {
            histories[index].id = dbId;
            const storageKey = getUserStorageKey(userId, 'chat_histories');
            localStorage.setItem(storageKey, JSON.stringify(histories));
            console.log(`✅ 会话历史记录ID已更新: ${sessionId} -> ${dbId}`);
            
            // 触发历史记录更新事件
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('history-updated'));
            }
          }
        }
      } else {
        console.warn('⚠️ 会话数据库保存失败，但本地存储已保存');
      }
    } catch (error) {
      console.error('❌ 会话数据库保存异常:', error);
    }
  })();

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
    const originalType = histories[sessionIndex].type;
    console.log('原标题:', originalTitle);
    
    // 检查是否有实质性更新
    const currentHistory = histories[sessionIndex];
    if (
      currentHistory.messages.length === messages.length &&
      JSON.stringify(currentHistory.messages) === JSON.stringify(messages)
    ) {
      console.log('消息内容未变化，跳过更新');
      return;
    }
    
    histories[sessionIndex] = {
      ...histories[sessionIndex],
      messages,
      model,
      timestamp: Date.now(),
      title: originalTitle, // 保持原标题不变
      type: originalType, // 保持原类型不变
    };
    
    console.log('更新会话成功');
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(histories));
    historyEventBus.emit();

    // 后台尝试更新数据库
    (async () => {
      try {
        const success = await updateHistoryInDB(sessionId, messages, model);
        if (success) {
          console.log('✅ 数据库更新成功');
        } else {
          console.warn('⚠️ 数据库更新失败');
        }
      } catch (error) {
        console.error('❌ 数据库更新异常:', error);
      }
    })();
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

// 异步获取历史记录（合并本地和数据库记录）
export const getHistoriesAsync = async (): Promise<ChatHistory[]> => {
  if (!isClient) return [];
  
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }
  
  try {
    // 获取本地历史记录
    const localHistories = getHistories();
    
    // 从数据库获取历史记录
    const dbHistories = await getHistoriesFromDB();
    
    if (!dbHistories || dbHistories.length === 0) {
      return localHistories;
    }

    // 合并本地和数据库记录，以ID为唯一标识，避免重复
    const mergedHistories = [...localHistories];
    const localIds = new Set(localHistories.map(h => h.id));
    
    dbHistories.forEach(dbHistory => {
      if (!localIds.has(dbHistory.id)) {
        // 数据库中有但本地没有的记录，添加到合并列表
        mergedHistories.push(dbHistory);
      } else {
        // 如果本地已有相同ID的记录，检查是否需要更新
        const existingIndex = mergedHistories.findIndex(h => h.id === dbHistory.id);
        if (existingIndex !== -1) {
          const localTimestamp = new Date(mergedHistories[existingIndex].timestamp).getTime();
          const dbTimestamp = new Date(dbHistory.timestamp).getTime();
          if (dbTimestamp > localTimestamp) {
            mergedHistories[existingIndex] = dbHistory;
          }
        }
      }
    });

    // 额外的内容去重检查（防止相同内容但不同ID的重复记录）
    const finalHistories: ChatHistory[] = [];
    const contentSet = new Set<string>();
    
    mergedHistories.forEach(history => {
      // 创建内容签名：类型+模型+第一条消息内容+消息数量
      const contentSignature = `${history.type}_${history.model}_${history.messages[0]?.content}_${history.messages.length}`;
      
      if (!contentSet.has(contentSignature)) {
        contentSet.add(contentSignature);
        finalHistories.push(history);
      } else {
        console.log(`检测到重复内容的历史记录，已跳过: ${history.id}`);
      }
    });

    // 按时间戳排序，最新的在前面
    finalHistories.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    // 更新本地存储
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(finalHistories));
    
    console.log(`合并后共有 ${finalHistories.length} 条历史记录`);
    return finalHistories;
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return getHistories(); // 失败时返回本地记录
  }
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
  (async () => {
    try {
      const dbId = await saveHistoryToDB(history.messages, history.model, history.type);
      if (dbId) {
        console.log('✅ 历史记录保存到数据库成功');
      } else {
        console.warn('⚠️ 历史记录保存到数据库失败');
      }
    } catch (error) {
      console.error('❌ 历史记录保存到数据库异常:', error);
    }
  })();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export async function deleteHistory(id: string) {
  if (!isClient) return false;

  const userId = getCurrentUserId();
  if (!userId) {
    console.log('用户未登录，不执行删除操作');
    return false;
  }

  try {
    // 先尝试从数据库删除
    const dbDeleteSuccess = await deleteHistoryFromDB(id);
    
    if (!dbDeleteSuccess) {
      console.error('从数据库删除历史记录失败');
      return false;
    }

    // 数据库删除成功后再删除本地存储
    const histories = getHistories();
    const updatedHistories = histories.filter(h => h.id !== id);
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(updatedHistories));
    
    historyEventBus.emit();
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history-updated'));
    }

    return true;
  } catch (error) {
    console.error('删除历史记录失败:', error);
    return false;
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
    (async () => {
      try {
        const success = await updateHistoryInDB(updatedHistory.id, updatedHistory.messages, updatedHistory.model);
        if (success) {
          console.log('✅ 历史记录更新到数据库成功');
        } else {
          console.warn('⚠️ 历史记录更新到数据库失败');
        }
      } catch (error) {
        console.error('❌ 历史记录更新到数据库异常:', error);
      }
    })();
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
    (async () => {
      try {
        const success = await updateHistoryTitleInDB(id, newTitle);
        if (success) {
          console.log('✅ 历史记录标题更新到数据库成功');
        } else {
          console.warn('⚠️ 历史记录标题更新到数据库失败');
        }
      } catch (error) {
        console.error('❌ 历史记录标题更新到数据库异常:', error);
      }
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('history-updated'));
  }
}

export async function deleteMultipleHistories(ids: string[]) {
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    // 先从数据库批量删除
    const success = await deleteMultipleHistoriesFromDB(ids);
    
    if (!success) {
      console.error('从数据库批量删除历史记录失败');
      return false;
    }

    // 数据库删除成功后再从本地删除
    const histories = getHistories().filter(h => !ids.includes(h.id));
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.setItem(storageKey, JSON.stringify(histories));
    historyEventBus.emit();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history-updated'));
    }

    return true;
  } catch (error) {
    console.error('批量删除历史记录时出错:', error);
    return false;
  }
}

export async function clearHistories() {
  if (!isClient) return false;
  
  const userId = getCurrentUserId();
  if (!userId) return false;

  try {
    // 先从数据库清除
    const success = await clearAllHistoriesFromDB();
    
    if (!success) {
      console.error('从数据库清除所有历史记录失败');
      return false;
    }

    // 数据库清除成功后再清除本地存储
    const storageKey = getUserStorageKey(userId, 'chat_histories');
    localStorage.removeItem(storageKey);
    historyEventBus.emit();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('history-updated'));
    }

    return true;
  } catch (error) {
    console.error('清除历史记录时出错:', error);
    return false;
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