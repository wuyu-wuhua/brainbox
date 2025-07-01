import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      console.error('图片代理请求缺少URL参数:', req.query);
      return res.status(400).json({ error: '缺少图片URL参数' });
    }

    console.log('代理请求图片URL:', url);
    console.log('URL长度:', url.length);
    console.log('是否包含阿里云域名:', url.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com'));

    // 请求原始图片
    console.log('开始请求原始图片...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
    });

    console.log('原始图片请求响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('获取图片失败:', response.status, response.statusText);
      const responseText = await response.text().catch(() => '无法获取响应文本');
      console.error('错误响应内容:', responseText);
      return res.status(response.status).json({ 
        error: `获取图片失败: ${response.status} ${response.statusText}`,
        details: responseText
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    console.log('成功获取图片，大小:', buffer.byteLength, '字节，类型:', contentType);

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存1天
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // 返回图片数据
    res.send(Buffer.from(buffer));

  } catch (error: any) {
    console.error('图片代理错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    res.status(500).json({ 
      error: '服务器内部错误', 
      details: error.message,
      type: error.name
    });
  }
} 