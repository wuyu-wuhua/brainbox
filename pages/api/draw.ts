import { NextApiRequest, NextApiResponse } from 'next';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
const TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { prompt, style = '<auto>', size = '1024*1024', mode = 'text2img' } = req.body;

    console.log('绘画请求参数:', { prompt, style, size, mode });

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: '请输入描述文字' });
    }

    // 阿里云通义万相wanx-v1支持的尺寸
    const validSizes = ['1024*1024', '720*1280', '768*1152', '1280*720'];
    if (!validSizes.includes(size)) {
      console.error('不支持的尺寸:', size, '支持的尺寸:', validSizes);
      return res.status(400).json({ 
        error: `不支持的尺寸: ${size}`,
        supportedSizes: validSizes
      });
    }

    // 验证风格参数
    const validStyles = ['<auto>', '<photography>', '<anime>', '<oil painting>', '<watercolor>', '<sketch>'];
    if (!validStyles.includes(style)) {
      console.error('不支持的风格:', style, '支持的风格:', validStyles);
      return res.status(400).json({ 
        error: `不支持的风格: ${style}`,
        supportedStyles: validStyles
      });
    }

    console.log('开始生成图片，使用参数:', { 
      prompt: prompt.trim(), 
      style, 
      size,
      promptLength: prompt.trim().length,
      isValidStyle: validStyles.includes(style),
      isValidSize: validSizes.includes(size)
    });

    // 发起异步任务
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'wanx-v1',
        input: {
          prompt: prompt.trim(),
        },
        parameters: {
          style: style,
          size: size,
          n: 1
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API请求失败:', errorData);
      console.error('请求参数:', { prompt: prompt.trim(), style, size });
      throw new Error(errorData.message || `请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('任务创建响应:', data);
    const taskId = data.output?.task_id;

    if (!taskId) {
      throw new Error('无法获取任务ID');
    }

    // 轮询检查任务状态
    let attempts = 0;
    const maxAttempts = 60; // 最多等待5分钟（每次5秒）

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      attempts++;

      const statusResponse = await fetch(`${TASK_URL}/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        continue; // 继续轮询
      }

      const statusData = await statusResponse.json();
      const taskStatus = statusData.output?.task_status;

      if (taskStatus === 'SUCCEEDED') {
        const results = statusData.output?.results;
        if (results && results.length > 0) {
          const imageUrl = results[0].url;
          console.log('生成成功，图片URL:', imageUrl);
          console.log('URL域名检查:', imageUrl.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com'));
          
          // 测试URL是否可访问
          try {
            const testResponse = await fetch(imageUrl, { method: 'HEAD' });
            console.log('图片URL可访问性测试:', testResponse.status, testResponse.statusText);
          } catch (testError) {
            console.error('图片URL访问测试失败:', testError);
          }
          
          return res.status(200).json({
            success: true,
            imageUrl: imageUrl,
            taskId: taskId,
            usage: statusData.usage,
          });
        } else {
          throw new Error('生成结果为空');
        }
      } else if (taskStatus === 'FAILED') {
        throw new Error('图片生成失败');
      }
      // 如果是PENDING或RUNNING，继续轮询
    }

    // 超时
    throw new Error('生成超时，请稍后重试');

  } catch (error) {
    console.error('AI绘图错误:', error);
    res.status(500).json({ 
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 