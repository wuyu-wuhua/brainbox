import { promises as fs } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { imageUrl, prompt } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: '请提供图片URL' });
    }

    console.log('开始保存图片:', imageUrl);

    // 检查是否是阿里云OSS链接
    if (!imageUrl.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com')) {
      // 如果不是阿里云链接，直接返回原URL
      return res.status(200).json({
        success: true,
        savedUrl: imageUrl,
        message: '非临时链接，无需保存'
      });
    }

    // 下载图片 - 使用内置的fetch API
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 获取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 生成文件名
    const timestamp = Date.now();
    const fileName = `image_${timestamp}.jpg`;
    
    // 确保public/images目录存在
    const imagesDir = join(process.cwd(), 'public', 'images');
    try {
      await fs.access(imagesDir);
    } catch {
      await fs.mkdir(imagesDir, { recursive: true });
    }

    // 保存文件
    const filePath = join(imagesDir, fileName);
    await fs.writeFile(filePath, buffer);

    // 返回可访问的URL
    const savedUrl = `/images/${fileName}`;

    console.log('图片保存成功:', savedUrl);

    return res.status(200).json({
      success: true,
      savedUrl,
      originalUrl: imageUrl,
      message: '图片保存成功'
    });

  } catch (error) {
    console.error('保存图片失败:', error);
    return res.status(500).json({
      success: false,
      error: '保存图片失败',
      details: error.message
    });
  }
} 