import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '../../services/videoService';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 获取当前环境变量中的API密钥信息
    const apiKey = process.env.DASHSCOPE_API_KEY;
    
    const keyInfo = {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      prefix: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A',
      format: apiKey ? (apiKey.startsWith('sk-') ? 'valid' : 'invalid') : 'missing'
    };

    console.log('当前API密钥信息:', keyInfo);

    if (!apiKey) {
      return res.status(400).json({
        error: 'API密钥未设置',
        keyInfo,
        message: '请检查.env.local文件中的DASHSCOPE_API_KEY设置'
      });
    }

    // 运行完整的权限诊断
    console.log('开始运行详细的API权限诊断...');
    const diagnosis = await videoService.diagnoseAPIAccess();
    console.log('基础诊断完成:', diagnosis);

    // 额外的视频生成端点测试
    const additionalTests = {
      endpoints: [],
      models: [],
      parameters: []
    };

    // 测试不同的API端点
    const videoEndpoints = [
      '/services/aigc/video-generation/video-synthesis',
      '/services/aigc/text2video/video-synthesis', 
      '/api/v1/services/aigc/video-generation/video-synthesis',
      '/api/v1/services/aigc/text2video/video-synthesis'
    ];

    for (const endpoint of videoEndpoints) {
      try {
        console.log(`测试端点: ${endpoint}`);
        const testResponse = await axios.post(
          `https://dashscope.aliyuncs.com${endpoint}`,
          {
            model: 'wanx-v2',
            input: { prompt: '测试' },
            parameters: { size: '1280*720', duration: 5 }
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-Async': 'enable'
            },
            timeout: 10000
          }
        );
        
        additionalTests.endpoints.push({
          endpoint,
          status: 'success',
          code: testResponse.status,
          response: testResponse.data
        });
        
      } catch (error) {
        const axiosError = error as any;
        additionalTests.endpoints.push({
          endpoint,
          status: 'error',
          code: axiosError.response?.status || 'network_error',
          error: axiosError.response?.data || axiosError.message
        });
      }
    }

    // 测试不同的模型
    const models = ['wanx-v2', 'wanx-v1', 'wanx'];
    for (const model of models) {
      try {
        console.log(`测试模型: ${model}`);
        const testResponse = await axios.post(
          'https://dashscope.aliyuncs.com/services/aigc/video-generation/video-synthesis',
          {
            model,
            input: { prompt: '测试' },
            parameters: { size: '1280*720' }
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-Async': 'enable'
            },
            timeout: 10000
          }
        );
        
        additionalTests.models.push({
          model,
          status: 'success',
          code: testResponse.status,
          response: testResponse.data
        });
        
      } catch (error) {
        const axiosError = error as any;
        additionalTests.models.push({
          model,
          status: 'error',
          code: axiosError.response?.status || 'network_error',
          error: axiosError.response?.data || axiosError.message
        });
      }
    }

    // 测试不同的参数格式
    const parameterFormats = [
      { size: '1280*720', duration: 5 },
      { resolution: '1280*720', duration: 5 },
      { size: '1280*720' },
      { resolution: '1280*720' },
      { width: 1280, height: 720, duration: 5 }
    ];

    for (let i = 0; i < parameterFormats.length; i++) {
      try {
        console.log(`测试参数格式 ${i + 1}:`, parameterFormats[i]);
        const testResponse = await axios.post(
          'https://dashscope.aliyuncs.com/services/aigc/video-generation/video-synthesis',
          {
            model: 'wanx-v2',
            input: { prompt: '测试' },
            parameters: parameterFormats[i]
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'X-DashScope-Async': 'enable'
            },
            timeout: 10000
          }
        );
        
        additionalTests.parameters.push({
          format: parameterFormats[i],
          status: 'success',
          code: testResponse.status,
          response: testResponse.data
        });
        
      } catch (error) {
        const axiosError = error as any;
        additionalTests.parameters.push({
          format: parameterFormats[i],
          status: 'error',
          code: axiosError.response?.status || 'network_error',
          error: axiosError.response?.data || axiosError.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      keyInfo,
      diagnosis,
      additionalTests,
      recommendations: [
        '🔍 详细诊断结果：',
        '1. 检查哪些端点返回了不同的错误代码',
        '2. 看看哪些模型可能可用',
        '3. 确认正确的参数格式',
        '4. 如果所有测试都失败，可能是权限配置延迟生效'
      ],
      message: '详细诊断完成',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('调试API错误:', error);
    return res.status(500).json({
      error: '调试失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 