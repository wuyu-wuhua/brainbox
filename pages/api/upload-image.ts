import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import { join } from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: '请提供图片数据' });
    }

    // 检查是否是base64格式
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: '图片格式不正确' });
    }

    // 解析base64数据
    const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: '无法解析图片数据' });
    }

    const extension = matches[1];
    const imageData = matches[2];
    
    // 生成唯一文件名
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    
    // 确保上传目录存在
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = join(uploadDir, fileName);
    const buffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(filePath, buffer);
    
    // 返回公开可访问的URL
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:3000';
    const publicUrl = `${protocol}://${host}/uploads/${fileName}`;
    
    console.log('图片上传成功:', { fileName, publicUrl });
    
    return res.status(200).json({
      success: true,
      url: publicUrl,
      fileName: fileName
    });

  } catch (error) {
    console.error('图片上传错误:', error);
    res.status(500).json({ 
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
} 