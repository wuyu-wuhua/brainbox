import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

// PDF 文本提取
export const extractTextFromPDF = async (filePath) => {
  let buffer = null;
  try {
    buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF文件解析失败，请确保文件未损坏');
  } finally {
    buffer = null; // 释放内存
  }
};

// DOCX 文本提取
export const extractTextFromDocx = async (filePath) => {
  let buffer = null;
  try {
    buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word文档解析错误:', error);
    throw new Error('Word文档解析失败，请确保文件未损坏');
  } finally {
    buffer = null; // 释放内存
  }
};

// TXT 文本提取
export const extractTextFromTxt = (filePath) => {
  try {
    // 使用流式读取，避免大文件占用过多内存
    return fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  } catch (error) {
    console.error('TXT文件读取错误:', error);
    throw new Error('TXT文件读取失败，请确保文件未损坏且编码为UTF-8');
  }
};

// 根据文件类型和扩展名提取文本
export const extractTextFromFile = async (filePath, mimeType, fileName) => {
  // 规范化文件路径
  filePath = path.normalize(filePath);
  
  // 验证文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error('文件不存在或无法访问');
  }
  
  // 获取文件大小
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error('文件为空');
  }
  
  // 限制文件大小（10MB）
  if (stats.size > 10 * 1024 * 1024) {
    throw new Error('文件大小超过限制（最大10MB）');
  }

  const fileExtension = fileName.toLowerCase().split('.').pop();
  
  try {
    // 根据MIME类型和文件扩展名判断文件类型
    if (mimeType === 'application/pdf' || fileExtension === 'pdf') {
      return await extractTextFromPDF(filePath);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileExtension === 'docx'
    ) {
      return await extractTextFromDocx(filePath);
    } else if (
      mimeType === 'application/msword' ||
      fileExtension === 'doc'
    ) {
      throw new Error('不支持.doc格式，请将文件另存为.docx格式后重新上传');
    } else if (mimeType === 'text/plain' || fileExtension === 'txt') {
      return extractTextFromTxt(filePath);
    } else {
      throw new Error(`不支持的文件类型: ${mimeType || fileExtension}`);
    }
  } catch (error) {
    console.error('文件解析错误:', error);
    // 添加更详细的错误信息
    if (error.message.includes('密码保护')) {
      throw new Error('无法处理加密或密码保护的文件');
    } else if (error.message.includes('损坏') || error.message.includes('corrupt')) {
      throw new Error('文件已损坏或格式不正确');
    } else {
      throw error;
    }
  }
}; 