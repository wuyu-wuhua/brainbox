import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { extractTextFromFile } from '../../utils/fileExtractors';

export const config = {
  api: {
    bodyParser: false, // 禁用 Next.js 默认的 body 解析器，使用 formidable 解析
  },
};

const uploadHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  // 确保上传目录存在
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir: uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB 限制
    multiples: false,
  });

  try {
    const [fields, files] = await form.parse(req);

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: '没有找到上传的文件' });
    }

    const filePath = uploadedFile.filepath;
    const fileName = uploadedFile.originalFilename || 'unknown';
    const mimeType = uploadedFile.mimetype;

    console.log('处理文件:', { fileName, mimeType, size: uploadedFile.size });

    // 根据文件类型解析文本
    let extractedText = '';
    try {
      extractedText = await extractTextFromFile(filePath, mimeType, fileName);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('文件内容为空或无法提取文本');
      }

      console.log('文本提取成功，长度:', extractedText.length);
      
    } catch (extractError) {
      console.error('文本提取失败:', extractError);
      
      // 清理临时文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        error: extractError.message || '文件解析失败' 
      });
    }

    // 清理临时文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 返回提取的文本和文件信息
    res.status(200).json({ 
      success: true,
      text: extractedText,
      fileName: fileName,
      fileSize: uploadedFile.size,
      wordCount: extractedText.length,
      message: '文件解析成功'
    });

  } catch (error) {
    console.error('文件上传处理错误:', error);
    
    res.status(500).json({ 
      error: '服务器处理文件时出错，请稍后重试' 
    });
  }
};

export default uploadHandler; 