import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
const formidable = require('formidable');
import * as fs from 'fs';

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
      const fileObj = Array.isArray(file) ? file[0] : file;
      const fileName = `${Date.now()}-${fileObj.originalFilename || fileObj.newFilename || 'upload'}`;
      const fileBuffer = await fs.promises.readFile(fileObj.filepath);
      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage.from('uploads').upload(`images/${fileName}`, fileBuffer, {
        contentType: fileObj.mimetype || 'image/png',
        upsert: true,
      });
      if (error) {
        console.error('Supabase 上传失败:', error);
        return res.status(500).json({ error: 'Supabase 上传失败', details: error.message });
      }
      // 获取公开URL
      const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(`images/${fileName}`);
      return res.status(200).json({
        success: true,
        url: publicUrlData.publicUrl,
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
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: '图片格式不正确' });
    }
    const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: '无法解析图片数据' });
    }
    const extension = matches[1];
    const imageData = matches[2];
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const buffer = Buffer.from(imageData, 'base64');
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage.from('uploads').upload(`images/${fileName}`, buffer, {
      contentType: `image/${extension}`,
      upsert: true,
    });
    if (error) {
      console.error('Supabase 上传失败:', error);
      return res.status(500).json({ error: 'Supabase 上传失败', details: error.message });
    }
    // 获取公开URL
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(`images/${fileName}`);
    return res.status(200).json({
      success: true,
      url: publicUrlData.publicUrl,
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