import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // 禁用默认的body解析，使用formidable处理文件上传
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 确保uploads目录存在
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 配置formidable
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB限制
      filename: (name, ext, part) => {
        // 生成唯一文件名
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${randomStr}${ext}`;
      },
    });

    // 解析上传的文件
    const [fields, files] = await form.parse(req);
    
    const videoFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!videoFile) {
      return res.status(400).json({ error: '没有找到上传的视频文件' });
    }

    // 验证文件类型
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov'];
    if (!allowedMimeTypes.includes(videoFile.mimetype || '')) {
      // 删除上传的文件
      fs.unlinkSync(videoFile.filepath);
      return res.status(400).json({ error: '不支持的视频格式，请上传MP4、WebM、AVI或MOV格式的视频' });
    }

    // 获取文件名（formidable已经处理了重命名）
    const fileName = path.basename(videoFile.filepath);
    
    // 构建访问URL
    const videoUrl = `/uploads/${fileName}`;
    
    console.log('视频上传成功:', {
      originalName: videoFile.originalFilename,
      fileName: fileName,
      size: videoFile.size,
      url: videoUrl,
    });

    return res.status(200).json({
      success: true,
      url: videoUrl,
      fileName: fileName,
      size: videoFile.size,
      originalName: videoFile.originalFilename,
    });

  } catch (error) {
    console.error('视频上传失败:', error);
    return res.status(500).json({ 
      error: '视频上传失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    });
  }
} 