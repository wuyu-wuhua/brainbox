import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { messages, model = 'DeepSeek-R1-0528', stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '消息格式无效' });
    }

    // 根据模型选择决定API调用方式
    let apiModel = 'qwen-plus'; // 默认使用qwen-plus
    
    // 根据前端选择的模型映射到实际的API模型
    switch (model) {
      case 'DeepSeek-R1-0528':
      case 'GPT-4':
      case 'Claude-3.5':
      case 'gpt-3.5-turbo':
        apiModel = 'qwen-plus';
        break;
      case 'Gemini-Pro':
        apiModel = 'qwen-turbo';
        break;
      case 'Llama-3.1':
        apiModel = 'qwen-max';
        break;
      default:
        apiModel = 'qwen-plus';
    }

    // 检查是否是文档分析请求
    const isDocumentAnalysis = messages.some(msg => 
      msg.role === 'system' && msg.content.includes('文档分析助手')
    );

    // 为文档分析添加特殊的系统消息
    let systemMessage;
    if (isDocumentAnalysis) {
      // 如果已经有系统消息，就使用现有的
      systemMessage = messages.find(msg => msg.role === 'system');
    } else {
      systemMessage = {
        role: 'system',
        content: `你是一个有用的AI助手，当前使用的是 ${model} 模型。请用中文回答问题，回答要准确、有帮助且友善。`
      };
    }

    // 构建消息数组
    const formattedMessages = isDocumentAnalysis 
      ? messages 
      : [systemMessage, ...messages.filter(msg => msg.role !== 'system')];

    // 如果支持流式响应
    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      try {
        const completion = await openai.chat.completions.create({
          model: apiModel,
          messages: formattedMessages,
          stream: true,
          temperature: isDocumentAnalysis ? 0.3 : 0.7, // 文档分析使用更低的温度
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        console.error('流式响应错误:', error);
        res.write(`data: ${JSON.stringify({ error: '生成回复时出错' })}\n\n`);
        res.end();
      }
    } else {
      // 非流式响应
      const completion = await openai.chat.completions.create({
        model: apiModel,
        messages: formattedMessages,
        temperature: isDocumentAnalysis ? 0.3 : 0.7, // 文档分析使用更低的温度
        max_tokens: isDocumentAnalysis ? 2000 : 1000, // 文档分析允许更长的回复
      });

      const reply = completion.choices[0]?.message?.content || '抱歉，无法生成回复。';
      
      // 返回标准的OpenAI格式响应
      res.status(200).json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: reply
            },
            finish_reason: completion.choices[0]?.finish_reason || 'stop'
          }
        ],
        usage: completion.usage,
        model: completion.model,
      });
    }
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ 
      error: '服务器错误',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
}