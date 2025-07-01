import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

// PDF 文本提取
export const extractTextFromPDF = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF文件解析失败，请确保文件未损坏');
  }
};

// DOCX 文本提取
export const extractTextFromDocx = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word文档解析错误:', error);
    throw new Error('Word文档解析失败，请确保文件未损坏');
  }
};

// TXT 文本提取
export const extractTextFromTxt = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('TXT文件读取错误:', error);
    throw new Error('TXT文件读取失败，请确保文件未损坏');
  }
};

// 根据文件类型和扩展名提取文本
export const extractTextFromFile = async (filePath, mimeType, fileName) => {
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
      // 对于老版本的.doc文件，提示用户转换为.docx
      throw new Error('不支持.doc格式，请将文件另存为.docx格式后重新上传');
    } else if (mimeType === 'text/plain' || fileExtension === 'txt') {
      return extractTextFromTxt(filePath);
    } else {
      throw new Error(`不支持的文件类型: ${mimeType || fileExtension}`);
    }
  } catch (error) {
    console.error('文件解析错误:', error);
    throw error;
  }
}; 