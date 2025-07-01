import { convert } from 'html-to-text';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: '请提供网页URL' });
  }

  try {
    // 验证URL格式
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: '请提供有效的HTTP或HTTPS链接' });
    }

    // 获取网页内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // 使用html-to-text转换HTML为纯文本
    const text = convert(html, {
      wordwrap: false,
      selectors: [
        // 忽略导航、广告、脚本等元素
        { selector: 'nav', format: 'skip' },
        { selector: 'header', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: '.ad', format: 'skip' },
        { selector: '.advertisement', format: 'skip' },
        { selector: '.sidebar', format: 'skip' },
        { selector: '.menu', format: 'skip' },
        // 保留主要内容
        { selector: 'article', format: 'block' },
        { selector: 'main', format: 'block' },
        { selector: 'h1', format: 'block' },
        { selector: 'h2', format: 'block' },
        { selector: 'h3', format: 'block' },
        { selector: 'p', format: 'block' },
        { selector: 'div', format: 'block' },
      ],
      baseElements: {
        selectors: ['article', 'main', '.content', '.post', '.entry', 'body']
      }
    });

    // 清理文本内容
    const cleanText = text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 移除多余的空行
      .replace(/^\s+|\s+$/g, '') // 移除首尾空白
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\n\s+/g, '\n'); // 移除行首空格

    if (!cleanText || cleanText.length < 50) {
      return res.status(400).json({ 
        error: '无法从该网页提取到有效内容，请检查链接是否正确或尝试其他网页' 
      });
    }

    // 获取网页标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : urlObj.hostname;

    res.status(200).json({
      success: true,
      text: cleanText,
      title: title,
      url: url,
      wordCount: cleanText.length,
      message: '网页内容提取成功'
    });

  } catch (error) {
    console.error('网页内容提取错误:', error);
    
    if (error.name === 'TypeError' && error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: '无效的URL格式' });
    }
    
    if (error.message.includes('timeout')) {
      return res.status(408).json({ error: '请求超时，请检查网络连接或稍后重试' });
    }
    
    res.status(500).json({ 
      error: '提取网页内容失败，请检查链接是否可访问或稍后重试' 
    });
  }
} 