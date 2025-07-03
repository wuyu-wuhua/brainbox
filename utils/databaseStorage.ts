import { ChatHistory, Message } from '../types/chat';
import { supabase } from '../lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

const isClient = typeof window !== 'undefined';

// 数据库表接口定义
interface DBChatHistory {
  id: string;
  user_id: string;
  title: string;
  model: string;
  messages: any; // JSON字段
  timestamp: string; // 改为字符串格式的日期时间
  type: 'chat' | 'draw' | 'read' | 'video';
  created_at?: string;
  updated_at?: string;
}

interface DBUserActivity {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  created_at?: string;
}

interface DBUserStats {
  id?: string;
  user_id: string;
  total_conversations: number;
  total_messages: number;
  favorite_model?: string;
  created_at?: string;
  updated_at?: string;
}

interface DBUserFavorite {
  id?: string;
  user_id: string;
  item_type: string;
  item_id: string;
  title: string;
  content?: any;
  created_at?: string;
}

// 测试数据库连接
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('=== 测试数据库连接 ===');
    const { data, error } = await supabase.from('user_stats').select('count').limit(1);
    
    if (error) {
      console.error('❌ 数据库连接测试失败:', error);
      return false;
    }
    
    console.log('✅ 数据库连接正常');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接异常:', error);
    return false;
  }
};

// 专门测试 user_stats 表的权限和结构
export const testUserStatsTable = async (): Promise<{ success: boolean; message: string }> => {
  console.log('=== 测试 user_stats 表 ===');
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: '用户未登录' };
    }

    console.log('开始测试 user_stats 表权限...');
    
    // 1. 测试 SELECT 权限
    console.log('1. 测试 SELECT 权限...');
    const { data: selectData, error: selectError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId);
    
    if (selectError) {
      console.error('❌ SELECT 权限测试失败:', selectError);
      return { success: false, message: `SELECT 权限错误: ${selectError.message}` };
    }
    console.log('✅ SELECT 权限正常，现有记录数:', selectData?.length || 0);

    // 2. 测试 INSERT 权限
    console.log('2. 测试 INSERT 权限...');
    const testData = {
      user_id: userId,
      conversations: 0,
      images: 0,
      documents: 0,
      videos: 0,
      credits: 10000,
      free_conversations_used: 0,
      free_images_used: 0,
      free_documents_used: 0,
      free_videos_used: 0,
      free_conversations_limit: 50,
      free_images_limit: 5,
      free_documents_limit: 50,
      free_videos_limit: 2,
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_stats')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error('❌ INSERT 权限测试失败:', insertError);
      console.error('尝试插入的数据:', testData);
      return { success: false, message: `INSERT 权限错误: ${insertError.message}` };
    }
    
    console.log('✅ INSERT 权限正常，插入成功:', insertData);
    
    // 3. 立即删除测试数据
    console.log('3. 清理测试数据...');
    const { error: deleteError } = await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', userId)
      .eq('conversations', 0);
    
    if (deleteError) {
      console.warn('⚠️ 清理测试数据失败:', deleteError);
    } else {
      console.log('✅ 测试数据已清理');
    }
    
    return { success: true, message: 'user_stats 表权限测试全部通过' };
    
  } catch (error) {
    console.error('❌ 测试 user_stats 表异常:', error);
    return { success: false, message: `测试异常: ${error}` };
  }
};

// 强制保存统计数据（使用更简单的方式）
export const forceUpdateUserStats = async (userStats: {
  conversations: number;
  images: number;
  documents: number;
  videos: number;
  credits?: number;
  free_conversations_used?: number;
  free_images_used?: number;
  free_documents_used?: number;
  free_videos_used?: number;
  free_conversations_limit?: number;
  free_images_limit?: number;
  free_documents_limit?: number;
  free_videos_limit?: number;
}): Promise<boolean> => {
  console.log('=== forceUpdateUserStats 开始 ===');
  console.log('统计数据:', userStats);
  
  try {
    // 首先测试数据库连接
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.log('❌ 数据库连接失败，跳过保存');
      return false;
    }
    
    const userId = await getCurrentUserId();
    console.log('获取到用户ID:', userId);
    
    if (!userId) {
      console.log('❌ 用户未登录，无法保存统计数据');
      return false;
    }

    // 检查用户是否已存在记录
    const { data: existingData, error: selectError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ 查询现有记录失败:', selectError);
      return false;
    }

    // 适应现有表结构，直接使用实际字段名
    const updateData = {
      conversations: userStats.conversations,
      images: userStats.images,
      documents: userStats.documents,
      videos: userStats.videos,
      credits: userStats.credits || 10000,
      // 免费额度使用情况
      free_conversations_used: userStats.free_conversations_used || 0,
      free_images_used: userStats.free_images_used || 0,
      free_documents_used: userStats.free_documents_used || 0,
      free_videos_used: userStats.free_videos_used || 0,
      // 免费额度限制
      free_conversations_limit: userStats.free_conversations_limit || 50,
      free_images_limit: userStats.free_images_limit || 5,
      free_documents_limit: userStats.free_documents_limit || 50,
      free_videos_limit: userStats.free_videos_limit || 2,
      updated_at: new Date().toISOString()
    };
    
    console.log('准备保存的数据:', updateData);

    let result;
    
    if (existingData) {
      // 更新现有记录
      console.log('更新现有记录...');
      result = await supabase
        .from('user_stats')
        .update(updateData)
        .eq('user_id', userId)
        .select();
    } else {
      // 插入新记录
      console.log('插入新记录...');
      result = await supabase
        .from('user_stats')
        .insert([{
          user_id: userId,
          ...updateData
        }])
        .select();
    }

    if (result.error) {
      console.error('❌ 保存统计数据失败 - 数据库错误:', result.error);
      console.error('错误详情:', {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint
      });
      console.error('尝试保存的数据:', updateData);
      console.error('用户ID:', userId);
      return false;
    }

    console.log('✅ 统计数据已成功保存到数据库:', result.data);
    return true;
  } catch (error) {
    console.error('❌ 保存统计数据异常:', error);
    return false;
  }
};

// 强制保存活动记录（使用更简单的方式）
export const forceAddActivity = async (activity: {
  type: string;
  title: string;
  description?: string;
}): Promise<boolean> => {
  console.log('=== forceAddActivity 开始 ===');
  console.log('活动数据:', activity);
  
  try {
    // 首先测试数据库连接
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.log('❌ 数据库连接失败，跳过保存');
      return false;
    }
    
    const userId = await getCurrentUserId();
    console.log('获取到用户ID:', userId);
    
    if (!userId) {
      console.log('❌ 用户未登录，无法添加活动记录');
      return false;
    }

    const insertData = {
      user_id: userId,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      created_at: new Date().toISOString()
    };
    console.log('准备插入的数据:', insertData);

    const { data, error } = await supabase
      .from('user_activities')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ 添加活动记录失败 - 数据库错误:', error);
      console.error('错误详情:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    console.log('✅ 活动记录已成功添加到数据库:', data);
    return true;
  } catch (error) {
    console.error('❌ 添加活动记录异常:', error);
    return false;
  }
};

// 获取当前用户ID
export const getCurrentUserId = async (): Promise<string | null> => {
  console.log('=== getCurrentUserId 开始 ===');
  
  if (!isClient) {
    console.log('⚠️ 不在客户端环境，返回null');
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ 获取用户信息失败:', error);
      console.error('认证错误详情:', {
        code: error.code,
        message: error.message
      });
      return null;
    }
    
    if (user) {
      console.log('✅ 获取到用户信息:', {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      });
    } else {
      console.log('⚠️ 用户未登录');
    }
    
    return user?.id || null;
  } catch (error) {
    console.error('❌ 获取用户ID异常:', error);
    return null;
  }
};

// =============================================================================
// 聊天历史记录相关函数
// =============================================================================

export const saveHistoryToDB = async (
  messages: Message[],
  model: string,
  type: 'chat' | 'draw' | 'read' | 'video' = 'chat'
): Promise<string | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，不保存历史记录');
      return null;
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('chat_histories')
      .insert([
        {
          user_id: userId,
          content: JSON.stringify(messages),
          messages: JSON.stringify(messages),
          model: model,
          type: type,
          created_at: now,
          updated_at: now,
          timestamp: now
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('保存历史记录失败:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('保存历史记录异常:', error);
    return null;
  }
};

export const updateHistoryInDB = async (sessionId: string, messages: Message[], model: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId || !sessionId) {
      console.log('用户未登录或无会话ID，无法更新数据库');
      return false;
    }

    const { data, error } = await supabase
      .from('chat_histories')
      .update({
        messages: JSON.stringify(messages),
        content: JSON.stringify(messages),
        model,
        timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('更新历史记录失败:', error);
      return false;
    }

    console.log('历史记录已更新:', data);
    return true;
  } catch (error) {
    console.error('更新历史记录异常:', error);
    return false;
  }
};

export const getHistoriesFromDB = async (): Promise<ChatHistory[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，返回空历史记录');
      return [];
    }

    const { data, error } = await supabase
      .from('chat_histories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }

    // 转换数据库格式到应用格式
    const histories: ChatHistory[] = data.map((dbHistory: DBChatHistory) => ({
      id: dbHistory.id,
      title: dbHistory.title,
      model: dbHistory.model,
      messages: dbHistory.messages
        ? (typeof dbHistory.messages === 'string' ? JSON.parse(dbHistory.messages) : dbHistory.messages)
        : ((dbHistory as any).content ? JSON.parse((dbHistory as any).content) : []),
      timestamp: new Date(dbHistory.timestamp).getTime(), // 将字符串日期转换为数字时间戳
      type: dbHistory.type
    }));

    console.log(`从数据库获取到 ${histories.length} 条历史记录`);
    return histories;
  } catch (error) {
    console.error('获取历史记录异常:', error);
    return [];
  }
};

export const deleteHistoryFromDB = async (id: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法删除');
      return false;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let error: PostgrestError | null = null;

    if (isUUID) {
      // 新格式：直接按 UUID 删除
      ({ error } = await supabase
      .from('chat_histories')
      .delete()
      .eq('id', id)
        .eq('user_id', userId));

    if (error) {
      console.error('删除历史记录失败:', error);
      return false;
      }
    } else {
      // 旧格式：本地记录，数据库中不存在，直接视为删除成功
      console.info('本地旧格式记录，跳过数据库删除:', id);
    }

    // 如果走到这里说明删除（或跳过）成功
    console.log('历史记录已删除:', id);
    return true;
  } catch (error) {
    console.error('删除历史记录异常:', error);
    return false;
  }
};

export const updateHistoryTitleInDB = async (id: string, newTitle: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法更新标题');
      return false;
    }

    const { error } = await supabase
      .from('chat_histories')
      .update({ 
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('更新标题失败:', error);
      return false;
    }

    console.log('标题已更新:', id, newTitle);
    return true;
  } catch (error) {
    console.error('更新标题异常:', error);
    return false;
  }
};

export const deleteMultipleHistoriesFromDB = async (ids: string[]): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法批量删除');
      return false;
    }

    const uuidIds: string[] = [];
    const isoTimes: string[] = [];
    ids.forEach((id) => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUUID) {
        uuidIds.push(id);
      } else {
        const timePart = id.split('_')[0];
        const ts = Number(timePart);
        if (!isNaN(ts)) {
          isoTimes.push(new Date(ts).toISOString());
        }
      }
    });

    let error: PostgrestError | null = null;

    if (uuidIds.length > 0) {
      ({ error } = await supabase
      .from('chat_histories')
      .delete()
        .in('id', uuidIds)
        .eq('user_id', userId));
    if (error) {
        console.error('批量删除 UUID 记录失败:', error);
      return false;
      }
    }

    if (isoTimes.length > 0) {
      console.info('批量删除本地旧格式记录，跳过数据库删除:', isoTimes.length);
    }

    console.log('批量删除成功:', ids);
    return true;
  } catch (error) {
    console.error('批量删除异常:', error);
    return false;
  }
};

export const clearAllHistoriesFromDB = async (): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法清空历史记录');
      return false;
    }

    const { error } = await supabase
      .from('chat_histories')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }

    console.log('历史记录已清空');
    return true;
  } catch (error) {
    console.error('清空历史记录异常:', error);
    return false;
  }
};

// =============================================================================
// 用户活动记录相关函数
// =============================================================================

export const addActivityToDB = async (activity: {
  type: string;
  title: string;
  description?: string;
}): Promise<boolean> => {
  console.log('=== addActivityToDB 开始 ===');
  console.log('活动数据:', activity);
  
  try {
    const userId = await getCurrentUserId();
    console.log('获取到用户ID:', userId);
    
    if (!userId) {
      console.log('❌ 用户未登录，无法添加活动记录');
      return false;
    }

    const insertData = {
      user_id: userId,
      type: activity.type,
      title: activity.title,
      description: activity.description
    };
    console.log('准备插入的数据:', insertData);

    const { data, error } = await supabase
      .from('user_activities')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ 添加活动记录失败 - 数据库错误:', error);
      console.error('错误详情:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    console.log('✅ 活动记录已添加到数据库:', data);
    return true;
  } catch (error) {
    console.error('❌ 添加活动记录异常:', error);
    return false;
  }
};

export const getUserActivitiesFromDB = async (limit: number = 10): Promise<any[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，返回空活动记录');
      return [];
    }

    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取活动记录失败:', error);
      return [];
    }

    console.log(`获取到 ${data.length} 条活动记录`);
    return data;
  } catch (error) {
    console.error('获取活动记录异常:', error);
    return [];
  }
};

// =============================================================================
// 用户统计数据相关函数
// =============================================================================

export const getUserStatsFromDB = async (): Promise<any> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，返回空统计数据');
      return null;
    }

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 是"找不到记录"的错误
      console.error('获取统计数据失败:', error);
      return null;
    }

    console.log('获取到统计数据:', data);
    return data;
  } catch (error) {
    console.error('获取统计数据异常:', error);
    return null;
  }
};

// 获取完整统计数据的方法
export const getCompleteUserStatsFromDB = async (): Promise<{
  conversations: number;
  images: number;
  documents: number;
  videos: number;
  credits: number;
  free_conversations_used: number;
  free_images_used: number;
  free_documents_used: number;
  free_videos_used: number;
  free_conversations_limit: number;
  free_images_limit: number;
  free_documents_limit: number;
  free_videos_limit: number;
} | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，返回空统计数据');
      return null;
    }

    console.log('=== getCompleteUserStatsFromDB 开始 ===');
    console.log('当前用户ID:', userId);

    // 获取用户的所有记录，按创建时间降序排列（最新的在前面）
    const { data: allRecords, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error && error.code !== 'PGRST116') {
      console.error('获取完整统计数据失败:', error);
      return null;
    }

    if (!allRecords || allRecords.length === 0) {
      console.log('数据库中没有找到用户记录，用户ID:', userId);
      return null;
    }

    console.log(`找到${allRecords.length}条用户记录`);
    
    let data;
    if (allRecords.length === 1) {
      // 只有一条记录，直接使用
      data = allRecords[0];
      console.log('使用唯一记录:', data);
    } else {
      // 有多条记录，需要处理
      console.warn(`⚠️ 发现多条记录（${allRecords.length}条），使用合并策略`);
      
      // 策略：使用最新记录作为基础，但对于计数字段取所有记录的最大值
      const latestRecord = allRecords[0];
      console.log('最新记录（作为基础）:', latestRecord);
      
      // 合并所有记录，取最大值
      data = allRecords.reduce((merged, record) => {
        return {
          ...merged,
          // 计数字段取最大值
          conversations: Math.max(merged.conversations || 0, record.conversations || 0),
          images: Math.max(merged.images || 0, record.images || 0),
          documents: Math.max(merged.documents || 0, record.documents || 0),
          videos: Math.max(merged.videos || 0, record.videos || 0),
          // 免费额度使用情况也取最大值
          free_conversations_used: Math.max(merged.free_conversations_used || 0, record.free_conversations_used || 0),
          free_images_used: Math.max(merged.free_images_used || 0, record.free_images_used || 0),
          free_documents_used: Math.max(merged.free_documents_used || 0, record.free_documents_used || 0),
          free_videos_used: Math.max(merged.free_videos_used || 0, record.free_videos_used || 0),
          // 积分和限制使用最新记录的值
          credits: latestRecord.credits,
          free_conversations_limit: latestRecord.free_conversations_limit,
          free_images_limit: latestRecord.free_images_limit,
          free_documents_limit: latestRecord.free_documents_limit,
          free_videos_limit: latestRecord.free_videos_limit,
        };
      }, latestRecord);
      
      console.log('合并后的数据:', data);
    }

    console.log('从数据库获取到的原始数据:', data);
    console.log('原始数据的所有字段:', Object.keys(data));

    // 尝试多种可能的字段名映射（中文字段名、英文字段名、下划线格式等）
    const completeStats = {
      // 对话次数 - 尝试多种可能的字段名
      conversations: data.conversations || data['对话次数'] || data.对话次数 || data.chat_count || data.total_conversations || 0,
      // 图片生成次数
      images: data.images || data['图片'] || data.图片 || data.image_count || data.total_images || 0,
      // 文档阅读次数  
      documents: data.documents || data['文档'] || data.文档 || data.document_count || data.total_documents || 0,
      // 视频生成次数
      videos: data.videos || data['视频'] || data.视频 || data.video_count || data.total_videos || 0,
      // 积分
      credits: data.credits || data['积分'] || data.积分 || data.credit_balance || 10000,
      // 免费额度使用情况
      free_conversations_used: data.free_conversations_used || data['免费对话已用'] || data.免费对话已用 || 0,
      free_images_used: data.free_images_used || data['免费图片已用'] || data.免费图片已用 || 0,
      free_documents_used: data.free_documents_used || data['免费文档已用'] || data.免费文档已用 || 0,
      free_videos_used: data.free_videos_used || data['免费视频已用'] || data.免费视频已用 || 0,
      // 免费额度限制
      free_conversations_limit: data.free_conversations_limit || data['免费对话限制'] || data.免费对话限制 || 50,
      free_images_limit: data.free_images_limit || data['免费图片限制'] || data.免费图片限制 || 5,
      free_documents_limit: data.free_documents_limit || data['免费文档限制'] || data.免费文档限制 || 50,
      free_videos_limit: data.free_videos_limit || data['免费视频限制'] || data.免费视频限制 || 2,
    };

    console.log('字段映射结果:');
    console.log('  conversations:', data.conversations, '||', data['对话次数'], '||', data.对话次数, '||', data.chat_count, '||', data.total_conversations, '=>', completeStats.conversations);
    console.log('  images:', data.images, '||', data['图片'], '||', data.图片, '||', data.image_count, '||', data.total_images, '=>', completeStats.images);
    console.log('  documents:', data.documents, '||', data['文档'], '||', data.文档, '||', data.document_count, '||', data.total_documents, '=>', completeStats.documents);
    console.log('  videos:', data.videos, '||', data['视频'], '||', data.视频, '||', data.video_count, '||', data.total_videos, '=>', completeStats.videos);

    console.log('最终映射的完整统计数据:', completeStats);
    console.log('=== getCompleteUserStatsFromDB 结束 ===');
    
    return completeStats;
  } catch (error) {
    console.error('获取完整统计数据异常:', error);
    return null;
  }
};

export const saveUserStatsToDB = async (stats: {
  total_conversations: number;
  total_messages: number;
  favorite_model?: string;
}): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法保存统计数据');
      return false;
    }

    const { error } = await supabase
      .from('user_stats')
      .upsert([
        {
          user_id: userId,
          total_conversations: stats.total_conversations,
          total_messages: stats.total_messages,
          favorite_model: stats.favorite_model,
          updated_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('保存统计数据失败:', error);
      return false;
    }

    console.log('统计数据已保存:', stats);
    return true;
  } catch (error) {
    console.error('保存统计数据异常:', error);
    return false;
  }
};

// 新的完整统计数据保存方法（使用本地存储作为扩展字段）
export const saveCompleteUserStatsToDB = async (userStats: {
  conversations: number;
  images: number;
  documents: number;
  videos: number;
  credits?: number;
  free_conversations_used?: number;
  free_images_used?: number;
  free_documents_used?: number;
  free_videos_used?: number;
  free_conversations_limit?: number;
  free_images_limit?: number;
  free_documents_limit?: number;
  free_videos_limit?: number;
}): Promise<boolean> => {
  console.log('=== saveCompleteUserStatsToDB 开始 ===');
  console.log('统计数据:', userStats);
  
  try {
    const userId = await getCurrentUserId();
    console.log('获取到用户ID:', userId);
    
    if (!userId) {
      console.log('❌ 用户未登录，无法保存完整统计数据');
      return false;
    }

    // 直接保存到对应字段（适应现有表结构）
    const upsertData = {
      user_id: userId,
      conversations: userStats.conversations,
      images: userStats.images,
      documents: userStats.documents,
      videos: userStats.videos,
      credits: userStats.credits || 10000,
      // 免费额度使用情况
      free_conversations_used: userStats.free_conversations_used || 0,
      free_images_used: userStats.free_images_used || 0,
      free_documents_used: userStats.free_documents_used || 0,
      free_videos_used: userStats.free_videos_used || 0,
      // 免费额度限制
      free_conversations_limit: userStats.free_conversations_limit || 50,
      free_images_limit: userStats.free_images_limit || 5,
      free_documents_limit: userStats.free_documents_limit || 50,
      free_videos_limit: userStats.free_videos_limit || 2,
      updated_at: new Date().toISOString()
    };
    
    console.log('准备upsert的数据:', upsertData);
    
    const { data, error } = await supabase
      .from('user_stats')
      .upsert([upsertData])
      .select();

    if (error) {
      console.error('❌ 保存完整统计数据失败 - 数据库错误:', error);
      console.error('错误详情:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    console.log('✅ 完整统计数据已保存到数据库:', data);
    return true;
  } catch (error) {
    console.error('❌ 保存完整统计数据异常:', error);
    return false;
  }
};

// =============================================================================
// 用户收藏相关函数
// =============================================================================

export const addFavoriteToDB = async (favorite: {
  item_type: string;
  item_id: string;
  title: string;
  content?: any;
}): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法添加收藏');
      return false;
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert([
        {
          user_id: userId,
          item_type: favorite.item_type,
          item_id: favorite.item_id,
          title: favorite.title,
          content: favorite.content ? JSON.stringify(favorite.content) : null
        }
      ]);

    if (error) {
      console.error('添加收藏失败:', {
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        errorCode: error.code,
        userId,
        favoriteData: favorite
      });
      return false;
    }

    console.log('收藏已添加:', favorite);
    return true;
  } catch (error) {
    console.error('添加收藏异常:', error);
    return false;
  }
};

export const removeFavoriteFromDB = async (item_id: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，无法移除收藏');
      return false;
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', item_id);

    if (error) {
      console.error('移除收藏失败:', error);
      return false;
    }

    console.log('收藏已移除:', item_id);
    return true;
  } catch (error) {
    console.error('移除收藏异常:', error);
    return false;
  }
};

export const getUserFavoritesFromDB = async (): Promise<any[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.log('用户未登录，返回空收藏');
      return [];
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取收藏失败:', error);
      return [];
    }

    console.log(`获取到 ${data.length} 个收藏`);
    return data;
  } catch (error) {
    console.error('获取收藏异常:', error);
    return [];
  }
};

// =============================================================================
// 数据同步相关函数
// =============================================================================

export const syncLocalToDatabase = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: '用户未登录，无法同步数据' };
    }

    // 获取localStorage中的数据
    const storageKey = `user_${userId}_chat_histories`;
    const localData = localStorage.getItem(storageKey);
    
    if (!localData) {
      return { success: true, message: '本地没有需要同步的数据' };
    }

    const localHistories: ChatHistory[] = JSON.parse(localData);
    
    if (localHistories.length === 0) {
      return { success: true, message: '本地历史记录为空' };
    }

    // 批量插入到数据库
    const dbRecords = localHistories.map(history => ({
      id: history.id,
      user_id: userId,
      title: history.title,
      model: history.model,
      messages: JSON.stringify(history.messages),
      timestamp: history.timestamp,
      type: history.type
    }));

    const { data, error } = await supabase
      .from('chat_histories')
      .upsert(dbRecords, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('同步数据失败:', error);
      return { success: false, message: '同步数据到数据库失败', details: error };
    }

    console.log('数据同步成功:', data);
    return { 
      success: true, 
      message: `成功同步 ${localHistories.length} 条历史记录到数据库`,
      details: { synced: localHistories.length }
    };
  } catch (error) {
    console.error('数据同步异常:', error);
    return { success: false, message: '数据同步过程中发生异常', details: error };
  }
};

export const getDataSyncStatus = async (): Promise<{
  local_count: number;
  database_count: number;
  needs_sync: boolean;
}> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { local_count: 0, database_count: 0, needs_sync: false };
    }

    // 获取本地数据数量
    const storageKey = `user_${userId}_chat_histories`;
    const localData = localStorage.getItem(storageKey);
    const localCount = localData ? JSON.parse(localData).length : 0;

    // 获取数据库数据数量
    const { count, error } = await supabase
      .from('chat_histories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const databaseCount = error ? 0 : (count || 0);

    return {
      local_count: localCount,
      database_count: databaseCount,
      needs_sync: localCount > databaseCount
    };
  } catch (error) {
    console.error('获取同步状态失败:', error);
    return { local_count: 0, database_count: 0, needs_sync: false };
  }
};

// 调试函数：检查用户统计数据表结构和内容
export const debugUserStatsTable = async (): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: '用户未登录' };
    }

    console.log('=== debugUserStatsTable 开始 ===');
    console.log('当前用户ID:', userId);

    // 1. 获取当前用户的所有记录（不使用single，因为可能有多条）
    const { data: userAllData, error: userError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // 按创建时间降序排列

    if (userError) {
      console.error('获取用户数据失败:', userError);
      return { success: false, message: `获取用户数据失败: ${userError.message}` };
    }

    console.log(`当前用户的所有记录（共${userAllData?.length || 0}条）:`, userAllData);
    
    if (userAllData && userAllData.length > 0) {
      console.log('最新记录:', userAllData[0]);
      console.log('最新记录的字段:', Object.keys(userAllData[0]));
      
      if (userAllData.length > 1) {
        console.warn(`⚠️ 发现重复记录！用户${userId}有${userAllData.length}条记录`);
        console.log('所有记录的ID和创建时间:');
        userAllData.forEach((record, index) => {
          console.log(`  记录${index + 1}: ID=${record.id}, 创建时间=${record.created_at}, 对话=${record.conversations}, 图片=${record.images}, 文档=${record.documents}, 视频=${record.videos}`);
        });
      }
    }

    // 2. 获取表中任意一条记录来了解表结构
    const { data: sampleData, error: sampleError } = await supabase
      .from('user_stats')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('获取样本数据失败:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('表结构样本数据:', sampleData[0]);
      console.log('表的所有字段名:', Object.keys(sampleData[0]));
    }

    // 3. 统计各用户的记录数量
    const { data: allUserStats, error: statsError } = await supabase
      .from('user_stats')
      .select('user_id')
      .order('created_at', { ascending: false });

    if (!statsError && allUserStats) {
      const userCounts = allUserStats.reduce((acc, record) => {
        acc[record.user_id] = (acc[record.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const duplicateUsers = Object.entries(userCounts).filter(([_, count]) => count > 1);
      if (duplicateUsers.length > 0) {
        console.warn('发现有重复记录的用户:');
        duplicateUsers.forEach(([userId, count]) => {
          console.log(`  用户${userId}: ${count}条记录`);
        });
      }
    }

    const result = {
      success: true,
      message: '调试信息已输出到控制台',
      data: {
        currentUserRecords: userAllData,
        recordCount: userAllData?.length || 0,
        sampleRecord: sampleData?.[0],
        hasDuplicates: userAllData && userAllData.length > 1
      }
    };

    console.log('=== debugUserStatsTable 结束 ===');
    return result;

  } catch (error) {
    console.error('调试表结构异常:', error);
    return { success: false, message: `调试异常: ${error}` };
  }
};

// 清理重复的用户统计记录（保留最新的，删除旧的）
export const cleanupDuplicateUserStats = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, message: '用户未登录' };
    }

    console.log('=== cleanupDuplicateUserStats 开始 ===');
    console.log('当前用户ID:', userId);

    // 获取用户的所有记录，按创建时间降序排列
    const { data: allRecords, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('获取用户记录失败:', fetchError);
      return { success: false, message: `获取记录失败: ${fetchError.message}` };
    }

    if (!allRecords || allRecords.length <= 1) {
      console.log('用户只有一条或没有记录，无需清理');
      return { success: true, message: '无需清理，用户只有一条或没有记录' };
    }

    console.log(`发现${allRecords.length}条记录，开始清理...`);

    // 保留最新的记录（第一条）
    const latestRecord = allRecords[0];
    const oldRecords = allRecords.slice(1);

    console.log('保留的最新记录:', latestRecord);
    console.log(`准备删除${oldRecords.length}条旧记录`);

    // 在删除之前，先合并数据到最新记录中
    const mergedData = allRecords.reduce((merged, record) => {
      return {
        ...merged,
        // 计数字段取最大值
        conversations: Math.max(merged.conversations || 0, record.conversations || 0),
        images: Math.max(merged.images || 0, record.images || 0),
        documents: Math.max(merged.documents || 0, record.documents || 0),
        videos: Math.max(merged.videos || 0, record.videos || 0),
        // 免费额度使用情况也取最大值
        free_conversations_used: Math.max(merged.free_conversations_used || 0, record.free_conversations_used || 0),
        free_images_used: Math.max(merged.free_images_used || 0, record.free_images_used || 0),
        free_documents_used: Math.max(merged.free_documents_used || 0, record.free_documents_used || 0),
        free_videos_used: Math.max(merged.free_videos_used || 0, record.free_videos_used || 0),
      };
    }, latestRecord);

    // 更新最新记录为合并后的数据
    const { error: updateError } = await supabase
      .from('user_stats')
      .update({
        conversations: mergedData.conversations,
        images: mergedData.images,
        documents: mergedData.documents,
        videos: mergedData.videos,
        free_conversations_used: mergedData.free_conversations_used,
        free_images_used: mergedData.free_images_used,
        free_documents_used: mergedData.free_documents_used,
        free_videos_used: mergedData.free_videos_used,
        updated_at: new Date().toISOString()
      })
      .eq('id', latestRecord.id);

    if (updateError) {
      console.error('更新最新记录失败:', updateError);
      return { success: false, message: `更新记录失败: ${updateError.message}` };
    }

    console.log('已更新最新记录为合并数据');

    // 删除旧记录
    const oldRecordIds = oldRecords.map(record => record.id);
    const { error: deleteError } = await supabase
      .from('user_stats')
      .delete()
      .in('id', oldRecordIds);

    if (deleteError) {
      console.error('删除旧记录失败:', deleteError);
      return { success: false, message: `删除旧记录失败: ${deleteError.message}` };
    }

    console.log(`成功删除${oldRecords.length}条旧记录`);
    console.log('=== cleanupDuplicateUserStats 结束 ===');

    return {
      success: true,
      message: `清理完成：保留1条记录，删除${oldRecords.length}条重复记录`,
      details: {
        kept: latestRecord,
        deleted: oldRecords.length,
        mergedData: mergedData
      }
    };

  } catch (error) {
    console.error('清理重复记录异常:', error);
    return { success: false, message: `清理异常: ${error}` };
  }
}; 