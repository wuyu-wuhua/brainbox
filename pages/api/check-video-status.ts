import type { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '../../services/videoService';

// Runway Gen-3 API 配置
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许POST请求' });
  }

  const { taskId, model } = req.body;

  // 验证必需参数
  if (!taskId) {
    return res.status(400).json({ 
      error: '缺少必需参数',
      details: '请提供taskId'
    });
  }

  try {
    console.log('检查视频生成状态，taskId:', taskId);

    // Google Veo 3现在使用常规视频生成API，直接使用videoService查询状态
    console.log('使用videoService查询任务状态，taskId:', taskId);

    // 使用videoService查询状态
    const result = await videoService.checkVideoStatus(taskId);
    
    console.log('视频状态查询结果:', result);
    
    // 检查任务状态
    if (result.output) {
      const taskStatus = result.output.task_status;
      
      if (taskStatus === 'SUCCEEDED') {
        // 任务完成，返回视频URL
        const videoUrl = result.output.video_url || 
                        (result.output.results && result.output.results[0] && 
                         (result.output.results[0].video_url || result.output.results[0].url));
        
        return res.status(200).json({
          status: 'SUCCEEDED',
          videoUrl: videoUrl,
          taskId: taskId,
          progress: 100
        });
      } else if (taskStatus === 'FAILED') {
        // 任务失败
        return res.status(200).json({
          status: 'FAILED',
          error: result.output.error_message || '视频生成失败',
          taskId: taskId,
          progress: 0
        });
      } else {
        // 任务进行中
        return res.status(200).json({
          status: 'RUNNING',
          taskId: taskId,
          progress: 50 // 默认进度
        });
      }
    } else {
      // 未知格式
      return res.status(200).json({
        status: 'RUNNING',
        taskId: taskId,
        progress: 50,
        data: result
      });
    }

  } catch (error) {
    console.error('视频状态检查API错误:', error);
    
    // 提供详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('任务不存在') || error.message.includes('Task not found')) {
        return res.status(404).json({
          error: '任务不存在',
          details: '指定的视频生成任务不存在或已过期',
          code: 'TASK_NOT_FOUND',
          taskId: taskId
        });
      } else if (error.message.includes('请求超时') || error.message.includes('timeout')) {
        return res.status(408).json({
          error: '请求超时',
          details: '状态查询响应超时，请稍后重试',
          code: 'TIMEOUT',
          taskId: taskId
        });
      } else if (error.message.includes('网络连接失败') || error.message.includes('ENOTFOUND')) {
        return res.status(503).json({
          error: '网络连接失败',
          details: '无法连接到视频生成服务，请检查网络连接',
          code: 'NETWORK_ERROR',
          taskId: taskId
        });
      } else {
        // 其他错误
        return res.status(500).json({
          error: '状态查询失败',
          details: error.message,
          code: 'STATUS_CHECK_ERROR',
          taskId: taskId
        });
      }
    } else {
      // 非Error对象
      return res.status(500).json({
        error: '状态查询失败',
        details: '发生未知错误',
        code: 'UNKNOWN_ERROR',
        taskId: taskId
      });
    }
  }
} 