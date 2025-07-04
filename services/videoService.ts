import axios from 'axios';

// 从环境变量获取API密钥 - 注意：这里不使用NEXT_PUBLIC_前缀，因为这是服务器端代码
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
if (!DASHSCOPE_API_KEY) {
  console.error('警告: DASHSCOPE_API_KEY 未设置');
}

// 配置API基础URL - 只包含域名和基础路径
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

interface VideoGenerationResponse {
  output: {
    task_status: string;
    task_id: string;
    video_url?: string;
    submit_time?: string;
    scheduled_time?: string;
    end_time?: string;
    orig_prompt?: string;
    actual_prompt?: string;
    error_message?: string;
    results?: Array<{
      video_url?: string;
      url?: string;
      video?: string;
      file_url?: string;
      download_url?: string;
      [key: string]: any;
    }>;
    task_metrics?: {
      [key: string]: any;
    };
  };
  request_id: string;
  usage?: {
    video_duration: number;
    video_ratio: string;
    video_count: number;
    image_count?: number;
  };
  code?: string;
  message?: string;
}

// 视频风格映射
const stylePromptMap: { [key: string]: string } = {
  'realistic': '以写实风格展现，真实细腻的画面效果，',
  'anime': '以日本动漫风格展现，动漫化的画面效果，',
  'cartoon': '以卡通风格展现，可爱生动的画面效果，',
  'cinematic': '以电影级别的视觉效果展现，电影般的画面质感，',
  'cyberpunk': '以赛博朋克风格展现，未来科技感的画面效果，',
  'fantasy': '以奇幻风格展现，魔幻梦幻的画面效果，'
};

// 宽高比映射到实际尺寸 - 根据API文档更新为支持的尺寸
const aspectRatioToSize: { [key: string]: string } = {
  '16:9': '1280*720',
  '9:16': '720*1280', 
  '1:1': '960*960',   // 修正为API支持的正方形尺寸
  '4:3': '1088*832',  // 修正为API支持的4:3尺寸
  '3:4': '832*1088'   // 添加3:4比例支持
};

// 视频生成状态管理
export interface VideoGenerationState {
  taskId: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  result?: {
    videoUrl?: string;
    error?: string;
  };
  timestamp: number;
  type: 'text2video' | 'img2video';
  referenceImage?: string | null;
}

// 本地存储键
const VIDEO_STATE_KEY = 'video_generation_state';

// 保存视频生成状态到本地存储
export const saveVideoState = (state: VideoGenerationState) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(VIDEO_STATE_KEY, JSON.stringify(state));
  }
};

// 从本地存储获取视频生成状态
export const getVideoState = (): VideoGenerationState | null => {
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem(VIDEO_STATE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
  }
  return null;
};

// 清除视频生成状态
export const clearVideoState = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(VIDEO_STATE_KEY);
  }
};

// 更新视频生成进度
export const updateVideoProgress = (taskId: string, progress: number) => {
  const currentState = getVideoState();
  if (currentState && currentState.taskId === taskId) {
    saveVideoState({
      ...currentState,
      progress,
      timestamp: Date.now()
    });
  }
};

// 检查视频生成状态是否过期（超过30分钟）
export const isVideoStateExpired = (state: VideoGenerationState): boolean => {
  const thirtyMinutes = 30 * 60 * 1000; // 30分钟（毫秒）
  return Date.now() - state.timestamp > thirtyMinutes;
};

export const videoService = {
  // 生成视频（文生视频）
  generateVideo: async (
    prompt: string,
    style: string = 'realistic',
    aspectRatio: string = '16:9',
    duration: number = 5
  ): Promise<VideoGenerationResponse> => {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    console.log('VideoService - API密钥检查:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      starts_with_sk: apiKey ? apiKey.startsWith('sk-') : false
    });
    
    if (!apiKey) {
      throw new Error('API密钥未设置，请在环境变量中设置 DASHSCOPE_API_KEY');
    }

    try {
      // 根据风格和其他参数增强提示词
      const stylePrefix = stylePromptMap[style] || '';
      const enhancedPrompt = `${stylePrefix}${prompt}`;
      
      // 获取对应的尺寸
      const size = aspectRatioToSize[aspectRatio] || '1280*720';

      // 使用官方文档中的正确模型名称和参数格式
      const requestData = {
        model: 'wanx2.1-t2v-turbo', // 官方文档确认的模型名称
        input: {
          prompt: enhancedPrompt
        },
        parameters: {
          size: size
          // 根据官方文档，duration可能不是必需参数
        }
      };

      console.log('发送视频生成请求:', {
        prompt: enhancedPrompt,
        size,
        duration,
        style,
        model: requestData.model,
        baseUrl: BASE_URL,
        endpoint: '/services/aigc/video-generation/video-synthesis'
      });

      // 使用正确的视频生成API端点
      const apiUrl = `${BASE_URL}/services/aigc/video-generation/video-synthesis`;
      
      console.log('尝试视频生成API调用...');
      console.log('完整API URL:', apiUrl);
      console.log('Request payload:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        apiUrl,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30秒超时
        }
      );

      console.log('收到响应:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.data.code && response.data.code !== 200) {
        console.error('API返回错误代码:', response.data);
        throw new Error(response.data.message || '视频生成请求失败');
      }

      return response.data;
    } catch (error) {
      console.error('视频生成请求失败:', error);
      
      // 如果是400错误且是模型不存在错误，尝试其他方案
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        const errorData = error.response.data;
        console.error('400错误详情:', errorData);
        
        if (errorData.message && (errorData.message.includes('Model not exist') || errorData.message.includes('No static resource'))) {
          console.log('检测到模型或端点错误，尝试其他配置...');
          
          // 尝试使用不同的模型和端点组合
          const fallbackConfigs = [
            { model: 'wanx-v1', endpoint: '/services/aigc/video-generation/video-synthesis' },
            { model: 'wanx-v2', endpoint: '/services/aigc/text2video/video-synthesis' },
            { model: 'wanx-v1', endpoint: '/services/aigc/text2video/video-synthesis' }
          ];
          
          for (const config of fallbackConfigs) {
            try {
              console.log(`尝试备用配置: ${config.model} - ${config.endpoint}`);
              
              const fallbackRequestData = {
                model: config.model,
                input: {
                  prompt: prompt // 使用原始prompt避免过度处理
                },
                parameters: {
                  size: aspectRatioToSize[aspectRatio] || '1280*720'
                  // 某些配置可能不支持duration参数
                }
              };
              
              const fallbackResponse = await axios.post(
                `${BASE_URL}${config.endpoint}`,
                fallbackRequestData,
                {
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'X-DashScope-Async': 'enable',
                    'Content-Type': 'application/json'
                  },
                  timeout: 30000
                }
              );
              
              console.log(`备用配置 ${config.model} 调用成功:`, fallbackResponse.data);
              return fallbackResponse.data;
              
            } catch (fallbackError) {
              console.error(`备用配置 ${config.model} 调用失败:`, fallbackError);
              continue; // 尝试下一个配置
            }
          }
          
          // 如果所有备用配置都失败，提供详细的错误信息和解决建议
          const suggestions = [
            '1. 请检查您的阿里云DashScope账户是否已开通视频生成服务权限',
            '2. 确认您的API密钥有访问视频生成模型的权限',
            '3. 视频生成模型可能需要单独申请开通，请在阿里云百炼控制台检查',
            '4. 如果问题持续，请联系阿里云技术支持'
          ];
          
          throw new Error(`视频生成模型暂时不可用。\n\n可能的解决方案:\n${suggestions.join('\n')}\n\n技术详情: ${errorData.message}`);
        }
        
        throw new Error(`视频生成参数错误: ${errorData.message || '请求参数不正确'}`);
      }
      
      // 处理其他错误
      if (axios.isAxiosError(error)) {
        console.error('Axios错误详情:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          url: error.config?.url,
          method: error.config?.method
        });
        
        if (error.response?.data) {
          const errorData = error.response.data;
          if (errorData.message) {
            throw new Error(errorData.message);
          } else if (errorData.error) {
            throw new Error(errorData.error);
          } else {
            throw new Error(`API请求失败: ${error.response.status} ${error.response.statusText}`);
          }
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('请求超时，请稍后重试');
        } else if (error.code === 'ENOTFOUND') {
          throw new Error('网络连接失败，请检查网络连接');
        } else {
          throw new Error(`网络错误: ${error.message}`);
        }
      }
      throw error;
    }
  },

  // 检查视频生成状态 - 根据官方文档使用GET方法
  checkVideoStatus: async (taskId: string): Promise<VideoGenerationResponse> => {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    
    if (!apiKey) {
      throw new Error('API密钥未设置');
    }

    try {
      console.log(`检查任务状态，taskId: ${taskId}`);
      
      // 根据官方文档，使用GET方法查询任务状态
      const response = await axios.get(
        `${BASE_URL}/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('状态查询响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('状态查询失败:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('任务不存在或已过期');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error(`状态查询失败: ${error.response?.status || error.message}`);
        }
      }
      throw error;
    }
  },

  // 诊断API权限和服务状态
  diagnoseAPIAccess: async (): Promise<{ [key: string]: any }> => {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const diagnosis: { [key: string]: any } = {
      apiKeyStatus: {
        exists: !!apiKey,
        length: apiKey ? apiKey.length : 0,
        format: apiKey ? (apiKey.startsWith('sk-') ? 'valid' : 'invalid') : 'missing'
      },
      services: {}
    };

    if (!apiKey) {
      diagnosis.error = 'API密钥未设置';
      return diagnosis;
    }

    try {
      // 测试文本生成服务（基础服务）
      console.log('测试文本生成服务权限...');
      const textResponse = await axios.post(
        `${BASE_URL}/services/aigc/text-generation/generation`,
        {
          model: 'qwen-turbo',
          input: {
            messages: [{ role: 'user', content: '你好' }]
          },
          parameters: {
            result_format: 'message'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      diagnosis.services.textGeneration = {
        status: 'success',
        statusCode: textResponse.status,
        hasOutput: !!textResponse.data?.output
      };
    } catch (error) {
      console.error('文本生成测试失败:', error);
      diagnosis.services.textGeneration = {
        status: 'failed',
        error: axios.isAxiosError(error) ? {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        } : error
      };
    }

    // 测试图像生成服务
    try {
      console.log('测试图像生成服务权限...');
      const imageResponse = await axios.post(
        `${BASE_URL}/services/aigc/text2image/image-synthesis`,
        {
          model: 'wanx-v1',
          input: {
            prompt: '一只可爱的猫咪'
          },
          parameters: {
            size: '960*960',  // 修正为API支持的尺寸
            n: 1
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      diagnosis.services.imageGeneration = {
        status: 'success',
        statusCode: imageResponse.status,
        hasTaskId: !!imageResponse.data?.output?.task_id
      };
    } catch (error) {
      console.error('图像生成测试失败:', error);
      diagnosis.services.imageGeneration = {
        status: 'failed',
        error: axios.isAxiosError(error) ? {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        } : error
      };
    }

    // 测试视频生成服务 - 使用官方文档中的模型
    try {
      console.log('测试视频生成服务权限...');
      const videoResponse = await axios.post(
        `${BASE_URL}/services/aigc/video-generation/video-synthesis`,
        {
          model: 'wanx2.1-t2v-turbo', // 使用官方文档中的模型名称
          input: {
            prompt: '一只小猫在阳光下玩耍'
          },
          parameters: {
            size: '1280*720'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      diagnosis.services.videoGeneration = {
        status: 'success',
        statusCode: videoResponse.status,
        hasTaskId: !!videoResponse.data?.output?.task_id,
        model: 'wanx2.1-t2v-turbo'
      };
    } catch (error) {
      console.error('视频生成测试失败:', error);
      diagnosis.services.videoGeneration = {
        status: 'failed',
        error: axios.isAxiosError(error) ? {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        } : error,
        model: 'wanx2.1-t2v-turbo'
      };
    }

    console.log('API权限诊断完成:', diagnosis);
    return diagnosis;
  },

  // 图生视频
  generateVideoFromImage: async (
    prompt: string,
    imageUrl: string,
    aspectRatio: string = '16:9',
    motionStrength: number = 0.7
  ): Promise<VideoGenerationResponse> => {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    console.log('VideoService - 图生视频API密钥检查:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      starts_with_sk: apiKey ? apiKey.startsWith('sk-') : false
    });
    
    if (!apiKey) {
      throw new Error('API密钥未设置，请在环境变量中设置 DASHSCOPE_API_KEY');
    }

    try {
      // 根据宽高比映射到具体分辨率
      const resolutionMap: { [key: string]: string } = {
        '16:9': '720P',
        '9:16': '720P',
        '1:1': '720P',
        '4:3': '720P',
        '3:4': '720P'
      };
      
      const resolution = resolutionMap[aspectRatio] || '720P';

      // 构建图生视频的请求数据
      const requestData = {
        model: 'wanx2.1-i2v-turbo', // 图生视频专用模型
        input: {
          prompt: prompt,
          img_url: imageUrl
        },
        parameters: {
          resolution: resolution,
          prompt_extend: true // 开启提示词扩展
        }
      };

      console.log('发送图生视频请求:', {
        prompt,
        imageUrl,
        resolution,
        motionStrength,
        model: requestData.model,
        baseUrl: BASE_URL,
        endpoint: '/services/aigc/video-generation/video-synthesis'
      });

      // 使用视频生成API端点
      const apiUrl = `${BASE_URL}/services/aigc/video-generation/video-synthesis`;
      
      console.log('尝试图生视频API调用...');
      console.log('完整API URL:', apiUrl);
      console.log('Request payload:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        apiUrl,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30秒超时
        }
      );

      console.log('收到图生视频响应:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.data.code && response.data.code !== 200) {
        console.error('图生视频API返回错误代码:', response.data);
        throw new Error(response.data.message || '图生视频请求失败');
      }

      return response.data;
    } catch (error) {
      console.error('图生视频请求失败:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          const errorData = error.response.data;
          console.error('400错误详情:', errorData);
          
          if (errorData.message && errorData.message.includes('Model not exist')) {
            throw new Error('图生视频模型暂时不可用，请稍后重试');
          } else if (errorData.message && errorData.message.includes('img_url')) {
            throw new Error('图片URL无效，请重新上传图片');
          } else {
            throw new Error(errorData.message || '图生视频请求失败');
          }
        } else if (error.response?.status === 403) {
          throw new Error('您的账户可能没有图生视频服务权限，请检查服务开通状态');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error(`图生视频请求失败: ${error.response?.status || error.message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        throw new Error(`网络错误: ${error.message}`);
      }
    }
  },

  // Gen-3 视频生成（使用DASHSCOPE API）- 仅支持文生视频
  generateGen3Video: async (
    prompt: string,
    aspectRatio: string = '16:9',
    cameraMovement: string = 'static',
    speed: string = 'normal'
  ): Promise<VideoGenerationResponse> => {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    console.log('VideoService - Gen-3 API密钥检查:', {
      exists: !!apiKey,
      length: apiKey ? apiKey.length : 0,
      starts_with_sk: apiKey ? apiKey.startsWith('sk-') : false
    });
    
    if (!apiKey) {
      throw new Error('API密钥未设置，请在环境变量中设置 DASHSCOPE_API_KEY');
    }

    try {
      // 根据宽高比映射到具体分辨率 - 使用API支持的尺寸
      const resolutionMap: { [key: string]: string } = {
        '16:9': '1280*720',
        '9:16': '720*1280', 
        '1:1': '960*960',    // 修正为API支持的正方形尺寸
        '4:3': '1088*832',   // 修正为API支持的4:3尺寸
        '3:4': '832*1088'    // 修正为API支持的3:4尺寸
      };
      
      const size = resolutionMap[aspectRatio] || '1280*720';

      // 增强提示词，加入摄像机运动和速度信息
      let enhancedPrompt = prompt;
      if (cameraMovement !== 'static') {
        enhancedPrompt += `, ${cameraMovement} camera movement`;
      }
      if (speed !== 'normal') {
        enhancedPrompt += `, ${speed} motion`;
      }

      let requestData;
      let apiUrl;

      // Gen-3只支持文生视频模式  
      requestData = {
        model: 'wanx2.1-t2v-turbo', // 使用文生视频模型
        input: {
          prompt: enhancedPrompt
        },
        parameters: {
          size: size
        }
      };
      apiUrl = `${BASE_URL}/services/aigc/video-generation/video-synthesis`;

      console.log('发送Gen-3视频生成请求:', {
        prompt: enhancedPrompt,
        size,
        cameraMovement,
        speed,
        model: requestData.model,
        baseUrl: BASE_URL,
        mode: 'text2video'
      });

      console.log('完整API URL:', apiUrl);
      console.log('Request payload:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        apiUrl,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-Async': 'enable',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('收到Gen-3视频生成响应:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.data.code && response.data.code !== 200) {
        console.error('Gen-3 API返回错误代码:', response.data);
        throw new Error(response.data.message || 'Gen-3视频生成请求失败');
      }

      return response.data;
    } catch (error) {
      console.error('Gen-3视频生成请求失败:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          const errorData = error.response.data;
          console.error('400错误详情:', errorData);
          
          if (errorData.message && errorData.message.includes('Model not exist')) {
            throw new Error('Gen-3视频生成模型暂时不可用，请稍后重试或联系技术支持');
          } else {
            throw new Error(errorData.message || 'Gen-3视频生成请求失败');
          }
        } else if (error.response?.status === 403) {
          throw new Error('您的账户可能没有Gen-3视频生成服务权限，请检查服务开通状态');
        } else if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else {
          throw new Error(`Gen-3视频生成请求失败: ${error.response?.status || error.message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('请求超时，请稍后重试');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        throw new Error(`网络错误: ${error.message}`);
      }
    }
  }
}; 