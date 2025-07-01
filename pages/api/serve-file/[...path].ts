import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取文件路径
    const { path: filePath } = req.query;
    
    if (!filePath || !Array.isArray(filePath)) {
      return res.status(400).json({ error: '文件路径无效' });
    }

    // 构建完整的文件路径
    const fileName = filePath.join('/');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', fileName);

    // 安全检查：确保文件路径在 uploads 目录内
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: '禁止访问' });
    }

    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 获取文件信息
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: '不是有效的文件' });
    }

    // 根据文件扩展名设置 Content-Type
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      case '.avi':
        contentType = 'video/avi';
        break;
      case '.mov':
        contentType = 'video/quicktime';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存1年
    
    // 支持范围请求（对视频很重要）
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      
      const stream = fs.createReadStream(fullPath, { start, end });
      stream.pipe(res);
    } else {
      // 正常响应整个文件
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
    }

  } catch (error) {
    console.error('文件服务错误:', error);
    return res.status(500).json({ 
      error: '文件服务失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    });
  }
} 