import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import { join } from 'path';
const formidable = require('formidable');

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  // 支持multipart/form-data上传
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    const form = new formidable.IncomingForm({
      uploadDir: join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('formidable错误:', err);
        return res.status(500).json({ error: '文件上传失败', details: err.message });
      }
      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: '未检测到上传文件' });
      }
      // 兼容单文件和多文件
      const fileObj = Array.isArray(file) ? file[0] : file;
      // formidable v2/v3: newFilename，v1: path/filename
      const fileName = fileObj.newFilename || fileObj.originalFilename || (fileObj.filepath ? fileObj.filepath.split(/[\\/]/).pop() : undefined);
      if (!fileName) {
        return res.status(500).json({ error: '无法获取文件名' });
      }
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || 'localhost:3000';
      const publicUrl = `${protocol}://${host}/uploads/${fileName}`;
      return res.status(200).json({
        success: true,
        url: publicUrl,
        fileName: fileName
      });
    });
    return;
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