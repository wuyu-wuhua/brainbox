import { NextApiRequest, NextApiResponse } from 'next';
import { testDatabaseConnection, saveHistoryToDB, getCurrentUserId } from '../../utils/databaseStorage';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== 开始测试数据库连接 ===');
    
    // 1. 测试基本连接
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        error: '数据库连接失败',
        details: '无法连接到Supabase数据库'
      });
    }

    // 2. 测试表结构
    console.log('=== 测试表结构 ===');
    const { data: tableData, error: tableError } = await supabase
      .from('chat_histories')
      .select('*')
      .limit(1);

    if (tableError) {
      return res.status(500).json({
        success: false,
        error: '表结构错误',
        details: tableError.message,
        code: tableError.code
      });
    }

    // 3. 测试用户认证
    console.log('=== 测试用户认证 ===');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
        details: '请先登录'
      });
    }

    // 4. 测试插入数据
    console.log('=== 测试插入数据 ===');
    const testMessages = [
      {
        content: '测试消息',
        isUser: true,
        timestamp: new Date().toISOString()
      },
      {
        content: '这是一条测试回复',
        isUser: false,
        timestamp: new Date().toISOString(),
        avatar: '/images/ai-avatar.png'
      }
    ];

    const historyId = await saveHistoryToDB(testMessages, 'GPT-4', 'chat');
    
    if (!historyId) {
      return res.status(500).json({
        success: false,
        error: '插入数据失败',
        details: '无法保存测试历史记录'
      });
    }

    // 5. 清理测试数据
    console.log('=== 清理测试数据 ===');
    const { error: deleteError } = await supabase
      .from('chat_histories')
      .delete()
      .eq('id', historyId);

    if (deleteError) {
      console.warn('清理测试数据失败:', deleteError);
    }

    return res.status(200).json({
      success: true,
      message: '数据库测试通过',
      details: {
        connection: '正常',
        table: '正常',
        auth: '正常',
        insert: '正常',
        cleanup: deleteError ? '失败' : '正常'
      },
      user: user.id
    });

  } catch (error) {
    console.error('数据库测试异常:', error);
    return res.status(500).json({
      success: false,
      error: '测试异常',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 