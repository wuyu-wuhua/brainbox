import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// 百度翻译API配置
const BAIDU_APP_ID = process.env.BAIDU_TRANSLATE_APP_ID;
const BAIDU_SECRET_KEY = process.env.BAIDU_TRANSLATE_SECRET;
const BAIDU_API_URL = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

// 生成MD5签名
function generateSign(query: string, salt: string): string {
  const str = BAIDU_APP_ID + query + salt + BAIDU_SECRET_KEY;
  return crypto.createHash('md5').update(str).digest('hex');
}

// 语言代码映射
const LANG_MAP: { [key: string]: string } = {
  'auto': 'auto',
  'zh': 'zh',
  'en': 'en',
  'zhCN': 'zh',
  'zhTW': 'cht',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, from = 'auto', to = 'zh' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '翻译文本不能为空' });
    }

    // 生成随机盐值
    const salt = Date.now().toString();
    
    // 生成签名
    const sign = generateSign(text, salt);

    // 映射语言代码
    const fromLang = LANG_MAP[from] || from;
    const toLang = LANG_MAP[to] || to;

    // 构建请求参数
    const params = new URLSearchParams({
      q: text,
      from: fromLang,
      to: toLang,
      appid: BAIDU_APP_ID,
      salt: salt,
      sign: sign,
    });

    // 调用百度翻译API
    const response = await fetch(BAIDU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    // 检查API响应
    if (data.error_code) {
      console.error('百度翻译API错误:', data);
      return res.status(400).json({ 
        error: '翻译失败', 
        details: data.error_msg || '未知错误' 
      });
    }

    // 提取翻译结果
    if (data.trans_result && data.trans_result.length > 0) {
      const translatedText = data.trans_result.map((item: any) => item.dst).join('\n');
      const detectedLang = data.from || fromLang;
      
      return res.status(200).json({
        success: true,
        translatedText,
        detectedLanguage: detectedLang,
        originalText: text,
        fromLanguage: fromLang,
        toLanguage: toLang,
      });
    } else {
      return res.status(400).json({ error: '翻译结果为空' });
    }

  } catch (error) {
    console.error('翻译API错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误', 
      details: error instanceof Error ? error.message : '未知错误' 
    });
  }
} 