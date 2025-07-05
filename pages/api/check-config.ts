import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许GET请求' });
  }

  try {
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    const runwayKey = process.env.RUNWAY_API_KEY;

    const config = {
      dashscope: {
        configured: !!dashscopeKey,
        format: dashscopeKey ? (dashscopeKey.startsWith('sk-') ? '正确' : '可能不正确') : '未配置',
        length: dashscopeKey ? `${dashscopeKey.length}字符` : '0字符',
        prefix: dashscopeKey ? `${dashscopeKey.substring(0, 8)}...` : 'N/A'
      },
      runway: {
        configured: !!runwayKey,
        format: runwayKey ? (runwayKey.startsWith('key_') ? '正确' : '可能不正确') : '未配置',
        length: runwayKey ? `${runwayKey.length}字符` : '0字符',
        prefix: runwayKey ? `${runwayKey.substring(0, 8)}...` : 'N/A'
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    // 简单的DashScope API连通性测试
    let dashscopeTest = null;
    if (dashscopeKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const testResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
          headers: {
            'Authorization': `Bearer ${dashscopeKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        dashscopeTest = {
          status: testResponse.ok ? '连接成功' : '连接失败',
          statusCode: testResponse.status,
          error: testResponse.ok ? null : `HTTP ${testResponse.status}`
        };
      } catch (error) {
        dashscopeTest = {
          status: '连接错误',
          error: error instanceof Error ? error.message : '未知错误'
        };
      }
    }

    return res.status(200).json({
      success: true,
      config,
      dashscopeTest,
      recommendations: [
        '🔧 配置建议：',
        dashscopeKey ? '✅ DashScope API密钥已配置' : '❌ 请在.env.local中配置DASHSCOPE_API_KEY',
        runwayKey ? '✅ Runway API密钥已配置' : '⚠️ Runway API密钥未配置（影响高级视频功能）',
        '📝 确保API密钥格式正确：DashScope以sk-开头，Runway以key_开头',
        '💰 检查API账户余额和权限设置'
      ]
    });

  } catch (error) {
    console.error('配置检查错误:', error);
    return res.status(500).json({
      error: '配置检查失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 