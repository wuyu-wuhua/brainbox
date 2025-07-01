import type { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '../../services/videoService';

interface VideoRequest {
  prompt: string;
  mode?: 'text2video' | 'img2video' | 'gen3_text2video';
  model?: string;
  aspectRatio?: string;
  duration?: number;
  img_url?: string;
}

// Runway Google Veo 3 API 配置
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
// 根据API密钥格式选择不同的基础URL
const RUNWAY_API_BASE = RUNWAY_API_KEY && RUNWAY_API_KEY.startsWith('key_') 
  ? 'https://api.dev.runwayml.com/v1' 
  : 'https://api.runwayml.com/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许POST请求' });
  }

  let { prompt, mode = 'text2video', model, aspectRatio = '16:9', duration = 5, img_url }: VideoRequest = req.body;

  // 验证必需参数
  if (!prompt) {
    return res.status(400).json({ 
      error: '缺少必需参数',
      details: '请提供视频描述prompt'
    });
  }

  // 处理base64图片 - 根据模式选择处理方式
  let processedImageUrl = img_url;
  if (mode === 'img2video' && img_url && img_url.startsWith('data:image/')) {
    try {
      console.log('检测到base64图片，正在处理...');
        
      // 解析base64图片
      const matches = img_url.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('无效的base64图片格式');
      }

      const imageType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log('图片信息:', {
        type: imageType,
        size: buffer.length,
        sizeKB: Math.round(buffer.length / 1024),
        sizeMB: Math.round(buffer.length / (1024 * 1024) * 100) / 100
      });

      // 检查图片大小（Runway API 限制：base64数据小于5MB，原图小于3.3MB）
      const maxSizeBytes = 3.3 * 1024 * 1024; // 3.3MB
      if (buffer.length > maxSizeBytes) {
        throw new Error(`图片大小超过限制，当前${Math.round(buffer.length / (1024 * 1024) * 100) / 100}MB，最大支持3.3MB`);
      }

      {
        // 其他模式：保存为临时文件
        console.log('其他模式：保存为临时文件');
        
        const fs = require('fs');
        const path = require('path');
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        
        // 确保temp目录存在
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileName = `ref-${Date.now()}.${imageType === 'jpeg' ? 'jpg' : imageType}`;
        const filePath = path.join(tempDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        
        // 生成可访问的URL
        const baseUrl = req.headers.host?.includes('localhost') 
          ? `http://${req.headers.host}` 
          : `https://${req.headers.host}`;
        processedImageUrl = `${baseUrl}/temp/${fileName}`;
        
        console.log('图片已保存:', processedImageUrl);
        
        // 设置清理定时器（5分钟后删除临时文件）
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log('临时文件已清理:', fileName);
            }
          } catch (cleanupError) {
            console.error('清理临时文件失败:', cleanupError);
          }
        }, 5 * 60 * 1000); // 5分钟
      }
        
    } catch (imageError) {
      console.error('图片处理失败:', imageError);
      return res.status(400).json({
        error: '图片处理失败',
        details: imageError instanceof Error ? imageError.message : '图片格式不支持',
        code: 'IMAGE_PROCESSING_ERROR'
      });
    }
  }

  try {
    console.log('收到视频生成请求:', {
      prompt,
      style: model || 'realistic',
      aspectRatio: aspectRatio || '16:9',
      duration: duration || 5,
      mode: mode || 'text2video',
      referenceImage: img_url ? '已提供' : '未提供',
      debug: !!process.env.DEBUG
    });

    // 如果是调试模式，返回诊断信息
    if (process.env.DEBUG) {
      console.log('执行API权限诊断...');
      try {
        const diagnosis = await videoService.diagnoseAPIAccess();
        return res.status(200).json({
          type: 'diagnosis',
          data: diagnosis,
          message: '诊断完成，请查看各服务的权限状态'
        });
      } catch (diagError) {
        console.error('诊断过程出错:', diagError);
        return res.status(500).json({
          error: '诊断过程出错',
          details: diagError instanceof Error ? diagError.message : '未知错误'
        });
      }
    }

    // 验证图生视频所需参数（Google Veo 3只支持文生视频模式，不需要图片）
    if (mode === 'img2video' && !img_url) {
      return res.status(400).json({
        error: '图生视频模式缺少参考图片',
        details: '请上传参考图片用于图生视频生成'
      });
    }

    // Google Veo 3 视频生成模式（使用常规文生视频API）
    if (mode === 'gen3_text2video') {
      console.log('处理Google Veo 3视频生成请求...');
      
      try {
        // 从请求体中获取Google Veo 3的额外参数
        const { cameraMovement = 'static', speed = 'normal' } = req.body;
        
        // 构建增强的提示词，加入Google Veo 3的特殊参数
        let enhancedPrompt = prompt;
        if (cameraMovement !== 'static') {
          enhancedPrompt += `, camera movement: ${cameraMovement}`;
        }
        if (speed !== 'normal') {
          enhancedPrompt += `, motion speed: ${speed}`;
        }

        console.log('Google Veo 3视频生成请求详情:', {
          originalPrompt: prompt,
          enhancedPrompt,
          aspectRatio,
          duration,
          cameraMovement,
          speed,
          model: model || 'realistic'
        });

        // 使用常规的文生视频API
        const result = await videoService.generateVideo(
          enhancedPrompt,
          model || 'realistic', // 使用传入的模型风格
          aspectRatio || '16:9',
          duration || 5
        );

        console.log('Google Veo 3视频生成服务返回:', result);

        // 检查返回结果的格式
        if (result.output && result.output.task_id) {
          // 异步任务模式
          return res.status(200).json({
            success: true,
            taskId: result.output.task_id, // 使用taskId保持一致性
            model: 'gen3_text2video', // 使用Google Veo 3标识
            status: 'PROCESSING',
            message: 'Google Veo 3视频生成任务已提交，请等待处理完成',
            data: result
          });
        } else if (result.output && result.output.results) {
          // 直接返回结果模式
          return res.status(200).json({
            success: true,
            results: result.output.results,
            model: 'gen3_text2video', // 使用Google Veo 3标识
            message: 'Google Veo 3视频生成完成',
            data: result
          });
        } else {
          // 未知格式
          console.warn('未知的返回格式:', result);
          return res.status(200).json({
            success: true,
            model: 'gen3_text2video', // 使用Google Veo 3标识
            message: 'Google Veo 3视频生成请求已提交',
            data: result
          });
        }
        
      } catch (fetchError) {
        console.error('Google Veo 3视频生成失败:', fetchError);
        return res.status(500).json({ 
          error: 'Google Veo 3视频生成失败，请稍后重试',
          details: fetchError instanceof Error ? fetchError.message : '生成过程中发生未知错误',
          code: 'GENERATION_ERROR'
        });
      }
    }

    // 调用相应的视频生成服务
    let result;
    if (mode === 'img2video') {
      result = await videoService.generateVideoFromImage(
        prompt,
        processedImageUrl,
        aspectRatio || '16:9',
        0.7
      );
    } else {
      result = await videoService.generateVideo(
        prompt,
        model || 'realistic',
        aspectRatio || '16:9',
        duration || 5
      );
    }

    console.log('视频生成服务返回:', result);

    // 检查返回结果的格式
    if (result.output && result.output.task_id) {
      // 异步任务模式
      res.status(200).json({
        success: true,
        taskId: result.output.task_id,
        message: '视频生成任务已提交，请等待处理完成',
        data: result
      });
    } else if (result.output && result.output.results) {
      // 直接返回结果模式
      res.status(200).json({
        success: true,
        results: result.output.results,
        message: '视频生成完成',
        data: result
      });
    } else {
      // 未知格式
      console.warn('未知的返回格式:', result);
      res.status(200).json({
        success: true,
        message: '视频生成请求已提交',
        data: result
      });
    }

  } catch (error) {
    console.error('视频生成API错误:', error);
    
    // 提供详细的错误信息
    if (error instanceof Error) {
      // 检查是否是权限相关错误
      if (error.message.includes('Model not exist')) {
        return res.status(400).json({
          error: '视频生成失败，请稍后重试',
          details: '视频生成模型暂时不可用。可能原因：\n1. 您的API密钥可能没有视频生成权限\n2. 视频生成服务可能需要单独开通\n3. 请在阿里云百炼控制台检查服务状态',
          code: 'MODEL_NOT_EXIST',
          suggestions: [
            '在阿里云百炼控制台检查是否已开通视频生成服务',
            '确认API密钥权限是否包含视频生成',
            '联系阿里云技术支持获取帮助'
          ]
        });
      } else if (error.message.includes('Access denied') || error.message.includes('AccessDenied')) {
        return res.status(403).json({
          error: '访问被拒绝',
          details: '您的账户可能没有视频生成服务权限，请检查服务开通状态',
          code: 'ACCESS_DENIED',
          suggestions: [
            '确认已在阿里云百炼控制台开通视频生成服务',
            '检查API密钥是否有效且有足够权限',
            '确认账户余额充足'
          ]
        });
      } else if (error.message.includes('请求超时') || error.message.includes('timeout')) {
        return res.status(408).json({
          error: '请求超时',
          details: '视频生成服务响应超时，请稍后重试',
          code: 'TIMEOUT'
        });
      } else if (error.message.includes('网络连接失败') || error.message.includes('ENOTFOUND')) {
        return res.status(503).json({
          error: '网络连接失败',
          details: '无法连接到视频生成服务，请检查网络连接',
          code: 'NETWORK_ERROR'
        });
      } else {
        // 其他错误
        return res.status(500).json({
          error: '视频生成失败，请稍后重试',
          details: error.message,
          code: 'GENERATION_ERROR'
        });
      }
    } else {
      // 非Error对象
      return res.status(500).json({
        error: '视频生成失败，请稍后重试',
        details: '发生未知错误',
        code: 'UNKNOWN_ERROR'
      });
    }
  }
} 