import { NextApiRequest, NextApiResponse } from 'next';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
const TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { prompt, baseImageUrl } = req.body;

    console.log('图像编辑请求参数:', { prompt, baseImageUrl });

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: '请输入编辑描述' });
    }

    if (!baseImageUrl || !baseImageUrl.trim()) {
      return res.status(400).json({ error: '请提供基础图片URL' });
    }

    // 直接使用用户上传的图片
    const finalImageUrl = baseImageUrl.trim();

    console.log('开始图像编辑，使用参数:', { 
      prompt: prompt.trim(), 
      baseImageUrl: finalImageUrl,
      originalUrl: baseImageUrl.trim(),
      promptLength: prompt.trim().length
    });

    // 使用全局风格化API
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'wanx2.1-imageedit',
        input: {
          function: 'stylization_all',
          prompt: prompt.trim(),
          base_image_url: finalImageUrl
        },
        parameters: {
          n: 1
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API请求失败:', errorData);
      console.error('请求参数:', { prompt: prompt.trim(), baseImageUrl: finalImageUrl });
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
      
      console.log(`轮询第${attempts}次，任务状态:`, taskStatus);
      console.log('完整状态响应:', JSON.stringify(statusData, null, 2));

      if (taskStatus === 'SUCCEEDED') {
        const results = statusData.output?.results;
        if (results && results.length > 0) {
          const imageUrl = results[0].url;
          console.log('编辑成功，图片URL:', imageUrl);
          console.log('URL域名检查 (上海):', imageUrl.includes('dashscope-result-sh.oss-cn-shanghai.aliyuncs.com'));
          console.log('URL域名检查 (北京):', imageUrl.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com'));
          
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
          throw new Error('编辑结果为空');
        }
      } else if (taskStatus === 'FAILED') {
        // 提供更详细的错误信息
        const errorMessage = statusData.output?.error_message || '未知错误';
        const errorCode = statusData.output?.error_code || '未知错误代码';
        console.error('任务失败详情:', { errorCode, errorMessage, fullResponse: statusData });
        throw new Error(`图像编辑失败: ${errorCode} - ${errorMessage}`);
      }
      // 如果是PENDING或RUNNING，继续轮询
    }

    // 超时
    throw new Error('编辑超时，请稍后重试');

  } catch (error) {
    console.error('图像编辑错误:', error);
    res.status(500).json({ 
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 