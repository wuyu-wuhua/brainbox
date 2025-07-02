import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  useColorModeValue,
  SimpleGrid,
  Icon,
  Flex,
  Container,
  Select,
  Image,
  AspectRatio,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  useToast,
  IconButton,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  CardHeader,
  Tooltip,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Collapse,
  Wrap,
  useBreakpointValue,
} from '@chakra-ui/react';
import { 
  FiVideo, 
  FiDownload, 
  FiRefreshCw, 
  FiUpload, 
  FiX, 
  FiHeart, 
  FiFile, 
  FiSend, 
  FiMessageSquare, 
  FiBookmark,
  FiPlay,
  FiPause,
  FiSettings,
  FiImage,
  FiEdit,
  FiStar,
  FiUser,
  FiZap,
} from 'react-icons/fi';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { RiVideoFill, RiImageEditFill } from 'react-icons/ri';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import { LoginModal } from '../components/LoginModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { useAuth } from '../contexts/AuthContext';
import { saveHistory, getHistories } from '../utils/storage';
import { pageStateManager } from '../utils/pageState';
import { ChatHistory } from '../types/chat';
import { useRouter } from 'next/router';

const StylePreview = ({ style, isSelected }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log('视频自动播放失败:', error);
      });
    }
  }, []);

  return (
    <Box
      position="relative"
      cursor="pointer"
      borderRadius="lg"
      overflow="hidden"
      border="2px solid"
      borderColor={isSelected ? 'purple.500' : 'gray.200'}
      _dark={{ borderColor: isSelected ? 'purple.400' : 'gray.600' }}
      transition="all 0.2s"
      _hover={{ 
        borderColor: isSelected ? 'purple.600' : 'purple.300',
        transform: 'translateY(-2px)',
        boxShadow: 'lg'
      }}
    >
      <AspectRatio ratio={4/3}>
        <Box position="relative">
          <video
            ref={videoRef}
            src={style.image}
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
          {isSelected && (
            <Box
              position="absolute"
              top={2}
              right={2}
              bg="purple.500"
              borderRadius="full"
              p={1}
              zIndex={1}
            >
              <Icon as={FiVideo} size="12px" color="white" />
            </Box>
          )}
        </Box>
      </AspectRatio>
      <Box p={3} bg={useColorModeValue('white', 'gray.800')}>
        <Text fontSize="sm" fontWeight="bold" mb={1}>
          {style.label}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {style.description}
        </Text>
      </Box>
    </Box>
  );
};

export default function Video() {
  // 模型切换状态 - 从localStorage恢复
  const [modelType, setModelType] = useState<'regular' | 'gen3'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedModelType = localStorage.getItem('video_model_type');
        if (savedModelType === 'gen3' || savedModelType === 'regular') {
          console.log('🔄 恢复视频模型类型:', savedModelType);
          return savedModelType;
        }
      } catch (e) {
        console.warn('模型类型恢复失败:', e);
      }
    }
    return 'regular';
  });
  
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5); // 视频时长（秒）
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [mode, setMode] = useState<'text2video' | 'img2video'>('text2video');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [motionStrength, setMotionStrength] = useState(0.7);
  const [isFavorited, setIsFavorited] = useState(false);
  const [videoStyle, setVideoStyle] = useState('realistic');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();
  const { t } = useLanguage();
  const { addActivity, addFavorite, removeFavorite, favorites, userStats, getUserQuota, checkFreeQuotaExceeded, getRemainingFreeQuota } = useUserActivity();
  const { user } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 视频样式选项 - 调整为6个偶数风格
  const videoStyles = [
    { 
      value: 'realistic', 
      label: t('video.styles.realistic'), 
      description: t('video.styles.realisticDesc'),
      image: '/images/真实风格.mp4'
    },
    { 
      value: 'anime', 
      label: t('video.styles.anime'), 
      description: t('video.styles.animeDesc'),
      image: '/images/动漫风格.mp4'
    },
    { 
      value: 'cartoon', 
      label: t('video.styles.cartoon'), 
      description: t('video.styles.cartoonDesc'),
      image: '/images/卡通风格.mp4'
    },
    { 
      value: 'cinematic', 
      label: t('video.styles.cinematic'), 
      description: t('video.styles.cinematicDesc'),
      image: '/images/电影风格.mp4'
    },
    { 
      value: 'cyberpunk', 
      label: t('video.styles.cyberpunk'), 
      description: t('video.styles.cyberpunkDesc'),
      image: '/images/赛博朋克风格.mp4'
    },
    { 
      value: 'fantasy', 
      label: t('video.styles.fantasy'), 
      description: t('video.styles.fantasyDesc'),
      image: '/images/奇幻风格.mp4'
    },
  ];

  // 宽高比选项
  const aspectRatios = [
    { value: '16:9', label: t('video.aspectRatio.16-9'), description: t('video.aspectRatio.16-9.desc') },
    { value: '9:16', label: t('video.aspectRatio.9-16'), description: t('video.aspectRatio.9-16.desc') },
    { value: '1:1', label: t('video.aspectRatio.1-1'), description: t('video.aspectRatio.1-1.desc') },
    { value: '4:3', label: t('video.aspectRatio.4-3'), description: t('video.aspectRatio.4-3.desc') },
  ];

  // 时长选项
  const durationOptions = [1, 3, 5];

  // 从URL参数加载历史记录
  useEffect(() => {
    const { loadHistory, prompt: urlPrompt } = router.query;
    let targetHistory = null;
    if (typeof window !== 'undefined') {
      const pending = sessionStorage.getItem('pendingHistory');
      if (pending) {
        targetHistory = JSON.parse(pending);
        sessionStorage.removeItem('pendingHistory');
      }
    }
    if (!targetHistory && loadHistory && typeof loadHistory === 'string') {
      const histories = getHistories();
      targetHistory = histories.find(h => h.id === loadHistory);
    }
    if (targetHistory && targetHistory.type === 'video') {
      // 还原prompt
      if (targetHistory.messages.length > 0) {
        setPrompt(targetHistory.messages[0].content);
      }
      // 还原生成的视频（如有）
      if (targetHistory.messages.length > 1) {
        const aiResponse = targetHistory.messages[1].content;
        const match = aiResponse.match(/生成的视频：(https?:\/\/[^\s]+)/);
        if (match) {
          const originalUrl = match[1];
          // 无论什么外链都用代理
          const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(originalUrl)}`;
          setGeneratedVideo(proxyUrl);
        } else {
          setGeneratedVideo(null); // 没有视频
        }
      }
      // 还原其他参数（如风格、时长等）可根据实际历史结构补充
    } else if (urlPrompt && typeof urlPrompt === 'string') {
      setPrompt(urlPrompt);
    }
  }, [router.query]);

  // 检查当前视频是否已收藏
  useEffect(() => {
    if (generatedVideo) {
      const isAlreadyFavorited = favorites.some(fav => 
        fav.type === 'video' && fav.description.includes(prompt.slice(0, 50))
      );
      setIsFavorited(isAlreadyFavorited);
    }
  }, [favorites, generatedVideo, prompt]);

  // 根据模式自动调整默认尺寸
  useEffect(() => {
    if (mode === 'text2video') {
      setAspectRatio('1:1'); // 文生视频默认1:1
    } else if (mode === 'img2video') {
      setAspectRatio('9:16'); // 图生视频默认9:16
    }
  }, [mode]);

  // 页面状态管理
  const saveCurrentState = () => {
    if (user && (prompt || generatedVideo)) {
      const state = {
        prompt,
        videoStyle,
        aspectRatio,
        duration,
        mode,
        referenceImage,
        motionStrength,
        generatedVideo,
        isFavorited,
        timestamp: Date.now()
      };
      localStorage.setItem('video_page_state', JSON.stringify(state));
    }
  };

  const restorePageState = () => {
    if (user) {
      try {
        const savedState = localStorage.getItem('video_page_state');
        if (savedState) {
          const state = JSON.parse(savedState);
          const isStateValid = state.timestamp && 
            (Date.now() - state.timestamp) < 3600000; // 1小时
          
          if (isStateValid && (state.prompt || state.generatedVideo)) {
            setPrompt(state.prompt || '');
            setVideoStyle(state.videoStyle || 'realistic');
            setAspectRatio(state.aspectRatio || '16:9');
            setDuration(state.duration || 5);
            setMode(state.mode || 'text2video');
            setReferenceImage(state.referenceImage || null);
            setMotionStrength(state.motionStrength || 0.7);
            setGeneratedVideo(state.generatedVideo || null);
            setIsFavorited(state.isFavorited || false);
            console.log('恢复视频页面状态:', state);
          } else {
            localStorage.removeItem('video_page_state');
          }
        }
      } catch (error) {
        console.error('恢复页面状态失败:', error);
        localStorage.removeItem('video_page_state');
      }
    }
  };

  // 页面加载时恢复状态
  useEffect(() => {
    if (user && !router.query.loadHistory) {
      restorePageState();
    }
  }, [user]);

  // 页面状态变化时自动保存
  useEffect(() => {
    if (user && (prompt || generatedVideo)) {
      saveCurrentState();
    }
  }, [prompt, videoStyle, aspectRatio, duration, mode, referenceImage, motionStrength, generatedVideo, isFavorited, user]);

  // 页面卸载时保存状态并设置标记
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        saveCurrentState();
      }
    };

    const handleRouteChange = () => {
      if (user) {
        saveCurrentState();
        sessionStorage.setItem('fromOtherPage', 'true');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
      if (user) {
        saveCurrentState();
        sessionStorage.setItem('fromOtherPage', 'true');
      }
    };
  }, [user, prompt, videoStyle, aspectRatio, duration, mode, referenceImage, motionStrength, generatedVideo, isFavorited, router.events]);

  const startNewVideo = () => {
    setPrompt('');
    setVideoStyle('realistic');
    setAspectRatio('16:9');
    setDuration(5);
    setMode('text2video');
    setReferenceImage(null);
    setMotionStrength(0.7);
    setGeneratedVideo(null);
    setIsFavorited(false);
    localStorage.removeItem('video_page_state');
    toast({
      title: t('video.newSession'),
      status: 'success',
      duration: 2000,
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: t('video.pleaseInputDescription'),
        description: t('video.pleaseInputDescriptionDesc'),
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!user) {
      setIsLoginOpen(true);
      toast({
        title: t('video.pleaseLogin'),
        description: t('video.pleaseLoginDesc'),
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // 检查免费额度
    if (checkFreeQuotaExceeded('video')) {
      toast({
        title: '已达免费视频上限',
        description: `您已用完 ${userStats.free_videos_limit} 次免费视频生成，请开通会员享受更多权益`,
        status: 'warning',
        duration: 4000,
      });
      return;
    }

    if (mode === 'img2video' && !referenceImage) {
      toast({
        title: t('video.pleaseUploadReferenceImage'),
        description: t('video.pleaseUploadReferenceImageDesc'),
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsGenerating(true);
    setGeneratingProgress(0);

    try {
      // 显示初始化提示
      toast({
        title: '开始生成视频',
        description: '正在初始化视频生成任务...',
        status: 'info',
        duration: 2000,
      });

      // 进度更新
      const progressInterval = setInterval(() => {
        setGeneratingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 5;
        });
      }, 2000);

      // 调用视频生成API
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: videoStyle, // 修复：使用 model 而不是 style
          aspectRatio,
          duration,
          mode,
          referenceImage: mode === 'img2video' ? referenceImage : null,
          motionStrength: mode === 'img2video' ? motionStrength : null,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('视频生成API错误:', errorData);
        throw new Error(errorData.error || '视频生成失败');
      }

      const data = await response.json();
      console.log('视频生成响应:', data);
      
      // 处理不同的响应格式
      if (data.success && data.taskId) {
        // 异步任务模式 - 需要轮询状态
        console.log('检测到异步任务模式，开始轮询状态...');
        const taskId = data.taskId;
        let retries = 0;
        const maxRetries = 60; // 最多等待5分钟
        
        setGeneratingProgress(20); // 任务已提交
        
        const pollStatus = async () => {
          try {
            const statusResponse = await fetch('/api/check-video-status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ taskId }),
            });
            
            if (!statusResponse.ok) {
              throw new Error('状态查询失败');
            }
            
            const statusData = await statusResponse.json();
            console.log('任务状态:', statusData);
            
            if (statusData.status === 'SUCCEEDED' && statusData.videoUrl) {
              // 视频生成完成
              setGeneratedVideo(statusData.videoUrl);
              setGeneratingProgress(100);
              
              // 检查是否已收藏
              const isAlreadyFavorited = favorites.some(fav => 
                fav.type === 'video' && fav.description.includes(statusData.videoUrl)
              );
              setIsFavorited(isAlreadyFavorited);
              
                      // 添加活动记录
        await addActivity({
          type: 'video',
          title: 'AI视频生成',
          description: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '')
        });

              // 保存到历史记录 - 区分文生视频和图生视频
              const messages = [
                {
                  content: prompt,
                  isUser: true,
                  timestamp: new Date().toISOString(),
                },
                {
                  content: mode === 'img2video' 
                    ? `生成的视频：${statusData.videoUrl}\n视频链接: ${statusData.videoUrl}\n参考图片: ${referenceImage}`
                    : `生成的视频：${statusData.videoUrl}\n视频链接: ${statusData.videoUrl}`,
                  isUser: false,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    videoStyle,
                    aspectRatio,
                    duration,
                    mode,
                    motionStrength: mode === 'img2video' ? motionStrength : null,
                    referenceImage: mode === 'img2video' ? referenceImage : null,
                    taskId: taskId
                  }
                }
              ];

              const historyModel = mode === 'img2video' 
                ? `图生视频-${videoStyle}-${aspectRatio}-${duration}s`
                : `文生视频-${videoStyle}-${aspectRatio}-${duration}s`;

              saveHistory(messages, historyModel, 'video');

              toast({
                title: '视频生成成功！',
                description: '您的AI视频已经生成完成',
                status: 'success',
                duration: 3000,
              });
              
              return true; // 完成
            } else if (statusData.status === 'FAILED') {
              throw new Error(statusData.error || '视频生成失败');
            } else if (statusData.status === 'RUNNING' || statusData.status === 'PENDING') {
              // 更新进度
              const progress = Math.min(20 + (retries / maxRetries) * 70, 90);
              setGeneratingProgress(progress);
              return false; // 继续轮询
            } else {
              console.warn('未知状态:', statusData.status);
              return false; // 继续轮询
            }
          } catch (statusError) {
            console.error('状态查询错误:', statusError);
            if (retries >= maxRetries - 5) {
              throw statusError; // 接近超时时抛出错误
            }
            return false; // 其他情况继续轮询
          }
        };
        
        // 开始轮询
        while (retries < maxRetries) {
          const isComplete = await pollStatus();
          if (isComplete) {
            break;
          }
          
          // 等待5秒后继续
          await new Promise(resolve => setTimeout(resolve, 5000));
          retries++;
        }
        
        if (retries >= maxRetries) {
          throw new Error('视频生成超时，请稍后重试');
        }
        
      } else if (data.success && data.videoUrl) {
        // 直接返回结果模式
        setGeneratedVideo(data.videoUrl);
        setGeneratingProgress(100);
        
        // 检查是否已收藏
        const isAlreadyFavorited = favorites.some(fav => 
          fav.type === 'video' && fav.description.includes(data.videoUrl)
        );
        setIsFavorited(isAlreadyFavorited);
        
        // 添加活动记录
        await addActivity({
          type: 'video',
          title: 'AI视频生成',
          description: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : '')
        });

        // 保存到历史记录 - 区分文生视频和图生视频
        const messages = [
          {
            content: prompt,
            isUser: true,
            timestamp: new Date().toISOString(),
          },
          {
            content: mode === 'img2video' 
              ? `生成的视频：${data.videoUrl}\n视频链接: ${data.videoUrl}\n参考图片: ${referenceImage}`
              : `生成的视频：${data.videoUrl}\n视频链接: ${data.videoUrl}`,
            isUser: false,
            timestamp: new Date().toISOString(),
            metadata: {
              videoStyle,
              aspectRatio,
              duration,
              mode,
              motionStrength: mode === 'img2video' ? motionStrength : null,
              referenceImage: mode === 'img2video' ? referenceImage : null,
              taskId: data.metadata?.taskId
            }
          }
        ];

        const historyModel = mode === 'img2video' 
          ? `图生视频-${videoStyle}-${aspectRatio}-${duration}s`
          : `文生视频-${videoStyle}-${aspectRatio}-${duration}s`;

        saveHistory(messages, historyModel, 'video');

        toast({
          title: '视频生成成功！',
          description: '您的AI视频已经生成完成',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(data.error || data.details || '视频生成失败');
      }
    } catch (error) {
      console.error('视频生成错误:', error);
      setGeneratingProgress(0);
      
      // 显示更详细的错误信息
      let errorMessage = '生成过程中出现错误，请重试';
      let errorDescription = '';
      
      if (error instanceof Error) {
        console.log('错误详情:', error.message);
        
        // 根据错误类型提供更具体的提示
        if (error.message.includes('API密钥')) {
          errorMessage = 'API密钥问题';
          errorDescription = '请检查API密钥是否正确设置';
        } else if (error.message.includes('权限')) {
          errorMessage = '权限不足';
          errorDescription = '请确认已开通视频生成服务权限';
        } else if (error.message.includes('超时')) {
          errorMessage = '生成超时';
          errorDescription = '视频生成时间较长，请稍后重试';
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接错误';
          errorDescription = '请检查网络连接后重试';
        } else if (error.message.includes('任务不存在')) {
          errorMessage = '任务丢失';
          errorDescription = '生成任务意外中断，请重新开始';
        } else if (error.message.includes('视频生成完成但未获取到视频链接')) {
          errorMessage = '生成异常';
          errorDescription = '视频已生成但下载链接获取失败，请重试';
        } else if (error.message.includes('状态查询')) {
          errorMessage = '状态检查失败';
          errorDescription = '无法获取生成进度，请稍后重试';
        } else {
          errorMessage = error.message || '视频生成失败';
          errorDescription = '请检查网络连接和参数设置后重试';
        }
      }

      // 添加通用的解决建议
      const solutions = [
        '🔧 建议的解决方案：',
        '• 检查网络连接是否稳定',
        '• 尝试简化视频描述',
        '• 稍等片刻后重新尝试',
        '• 如问题持续存在，请联系客服'
      ];

      toast({
        title: errorMessage,
        description: errorDescription + '\n\n' + solutions.join('\n'),
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 检查用户是否已登录
    if (!user) {
      setIsLoginOpen(true);
      toast({
        title: '请先登录',
        description: '登录后即可使用AI视频功能',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setReferenceImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: '文件格式错误',
          description: '请上传图片文件',
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadVideo = async () => {
    if (!generatedVideo) return;
    
    try {
      const response = await fetch(generatedVideo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: '下载开始',
        description: '视频正在下载到您的设备',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: '下载失败',
        description: '无法下载视频，请重试',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleToggleFavorite = async () => {
    if (!generatedVideo || !user) return;

    try {
      // 检查当前视频是否在收藏列表中
      const isCurrentlyFavorited = favorites.some(fav => 
        fav.type === 'video' && (
          fav.description.includes(generatedVideo) || 
          fav.description.includes(prompt.slice(0, 50))
        )
      );

      if (isCurrentlyFavorited) {
        // 取消收藏 - 找到对应的收藏项并删除
        const favoriteToRemove = favorites.find(fav => 
          fav.type === 'video' && (
            fav.description.includes(generatedVideo) || 
            fav.description.includes(prompt.slice(0, 50))
          )
        );
        if (favoriteToRemove) {
          await removeFavorite(favoriteToRemove.id);
          setIsFavorited(false);
          toast({
            title: '已取消收藏',
            status: 'info',
            duration: 2000,
          });
        }
      } else {
        // 添加收藏 - 先下载视频并上传到本地服务器
        toast({
          title: '正在保存视频...',
          description: '视频正在下载并保存到服务器，请稍候',
          status: 'info',
          duration: 3000,
        });

        let permanentVideoUrl = generatedVideo;

        // 如果是外部链接（包含http/https且不是本站链接），则下载并上传
        if (generatedVideo.startsWith('http') && !generatedVideo.includes(window.location.hostname)) {
          try {
            console.log('开始下载视频:', generatedVideo);
            
            // 下载视频
            const response = await fetch(generatedVideo);
            if (!response.ok) {
              throw new Error('视频下载失败');
            }
            
            const blob = await response.blob();
            console.log('视频下载完成，大小:', blob.size);

            // 创建FormData并上传
            const formData = new FormData();
            formData.append('file', blob, `video-${Date.now()}.mp4`);

            console.log('开始上传视频到服务器...');
            const uploadResponse = await fetch('/api/upload-video', {
              method: 'POST',
              body: formData,
            });

            if (!uploadResponse.ok) {
              throw new Error('视频上传失败');
            }

            const uploadResult = await uploadResponse.json();
            if (uploadResult.success) {
              permanentVideoUrl = uploadResult.url;
              console.log('视频上传成功，永久链接:', permanentVideoUrl);
              
              toast({
                title: '视频保存成功',
                description: '视频已永久保存到服务器',
                status: 'success',
                duration: 2000,
              });
            } else {
              throw new Error(uploadResult.error || '上传失败');
            }
          } catch (uploadError) {
            console.error('视频保存失败:', uploadError);
            toast({
              title: '视频保存失败',
              description: '将使用原始链接收藏，可能会过期',
              status: 'warning',
              duration: 3000,
            });
            // 继续使用原始链接进行收藏
          }
        }

        // 添加收藏 - 区分文生视频和图生视频
        const favoriteTitle = mode === 'img2video' ? '生成的AI图生视频' : '生成的AI文生视频';
        const favoriteDescription = mode === 'img2video'
          ? `${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''} | ${videoStyle} | ${aspectRatio} | ${duration}秒\n视频链接: ${permanentVideoUrl}\n参考图片: ${referenceImage}`
          : `${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''} | ${videoStyle} | ${aspectRatio} | ${duration}秒\n视频链接: ${permanentVideoUrl}`;
        
        await addFavorite({
          type: 'video',
          title: favoriteTitle,
          description: favoriteDescription
        });
        setIsFavorited(true);
        toast({
          title: '已添加到收藏',
          description: permanentVideoUrl.startsWith('/uploads/') ? '视频已永久保存' : '使用原始链接收藏',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('收藏操作错误:', error);
      toast({
        title: '操作失败',
        description: '收藏操作失败，请重试',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleNewVideo = () => {
    startNewVideo();
  };

  const handleClearHistory = async () => {
    const histories = await getHistories();
    const nonVideoHistories = histories.filter(h => h.type !== 'video');
    localStorage.setItem('chatHistories', JSON.stringify(nonVideoHistories));
    
    toast({
      title: '历史记录已清除',
      description: '所有视频生成历史记录已被删除',
      status: 'success',
      duration: 3000,
    });
  };

  const handleDeleteVideo = () => {
    if (!generatedVideo) return;
    
    setGeneratedVideo(null);
    setIsFavorited(false);
    
    // 清除本地状态
    const state = JSON.parse(localStorage.getItem('video_page_state') || '{}');
    delete state.generatedVideo;
    delete state.isFavorited;
    localStorage.setItem('video_page_state', JSON.stringify(state));
    
    toast({
      title: '视频已删除',
      description: '生成的视频已被删除',
      status: 'info',
      duration: 2000,
    });
  };

  // Google Veo 3 视频页面组件
  const Gen3VideoPage = () => {
    const router = useRouter();
    
    const [gen3Prompt, setGen3Prompt] = useState('');
    const [gen3IsGenerating, setGen3IsGenerating] = useState(false);
    const [gen3GeneratedVideo, setGen3GeneratedVideo] = useState<string | null>(null);
    const [gen3Progress, setGen3Progress] = useState(0);
    const [gen3AspectRatio, setGen3AspectRatio] = useState('16:9');
    const [gen3CameraMovement, setGen3CameraMovement] = useState('static');
    const [gen3Speed, setGen3Speed] = useState('normal');
    const [gen3Lighting, setGen3Lighting] = useState('natural');
    const [gen3Mode, setGen3Mode] = useState<'img2video'>('img2video');
    const [gen3ReferenceImage, setGen3ReferenceImage] = useState<string | null>(null);
    const gen3FileInputRef = useRef<HTMLInputElement>(null);
    // 在Gen3VideoPage组件内增加风格状态
    const [gen3VideoStyle, setGen3VideoStyle] = useState('realistic');
    
    // 对话消息状态 - 从localStorage恢复
      const [gen3Messages, setGen3Messages] = useState<Array<{
    content: string;
    isUser: boolean;
    timestamp: string;
    videoUrl?: string;
    metadata?: any;
  }>>(() => {
    // 初始化时从localStorage恢复消息
    if (typeof window !== 'undefined') {
      try {
        const backup = localStorage.getItem('gen3_messages_backup');
        if (backup) {
          const parsedMessages = JSON.parse(backup);
          console.log('🔄 从localStorage恢复Gen3消息:', parsedMessages.length, '条');
          return parsedMessages;
        }
      } catch (e) {
        console.warn('localStorage恢复失败:', e);
      }
    }
    return [];
  });
  
      // 🎯 关键修复：使用 useRef 来持久化消息状态，防止被路由重置
  const gen3MessagesRef = useRef(gen3Messages);
  useEffect(() => {
    // 🔥 强化ref同步：只有当消息数量增加时才更新ref
    if (gen3Messages.length > 0 && gen3Messages.length >= gen3MessagesRef.current.length) {
      gen3MessagesRef.current = gen3Messages;
      console.log('🔄 ref已同步，当前消息数:', gen3Messages.length);
    }
  }, [gen3Messages]);

  // 只在首次加载且gen3Messages为空时恢复gen3Messages，生成新视频后绝不再自动恢复
  const isFirstLoadRef = useRef(true);
  useEffect(() => {
    if (isFirstLoadRef.current && gen3Messages.length === 0) {
      isFirstLoadRef.current = false;
      if (typeof window !== 'undefined') {
        try {
          const backup = localStorage.getItem('gen3_messages_backup');
          if (backup) {
            const parsedMessages = JSON.parse(backup);
            if (parsedMessages.length > 0) {
              setGen3Messages(parsedMessages);
            }
          }
        } catch (e) {}
      }
    }
    // 只依赖首次加载和gen3Messages为空，后续不再触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 禁止任何模式切换、路由变化等副作用自动恢复历史，只允许明确带loadHistory参数时恢复
  useEffect(() => {
    const { loadHistory } = router.query;
    if (loadHistory && typeof loadHistory === 'string') {
      const restoreHistory = async () => {
        const histories = await getHistories();
        const targetHistory = histories.find(h => h.id === loadHistory);
        if (targetHistory && targetHistory.type === 'video' && (targetHistory.model.includes('Google Veo 3') || targetHistory.model.includes('DashScope'))) {
          // 恢复对话消息
          if (targetHistory.messages && targetHistory.messages.length > 0) {
            const messagesWithVideoUrl = targetHistory.messages.map(msg => ({
              ...msg,
              videoUrl: (msg as any).videoUrl
            }));
            setGen3Messages(messagesWithVideoUrl);
          }
          // 恢复参数
          if (targetHistory.messages.length > 1 && targetHistory.messages[1].metadata) {
            const metadata = targetHistory.messages[1].metadata as any;
            if (metadata.aspectRatio) setGen3AspectRatio(metadata.aspectRatio);
            if (metadata.cameraMovement) setGen3CameraMovement(metadata.cameraMovement);
            if (metadata.speed) setGen3Speed(metadata.speed);
            if (metadata.lighting) setGen3Lighting(metadata.lighting);
          }
          // 恢复生成的视频
          if (targetHistory.messages.length > 1 && (targetHistory.messages[1] as any).videoUrl) {
            setGen3GeneratedVideo((targetHistory.messages[1] as any).videoUrl);
          }
        }
      };
      restoreHistory();
    }
    // 只依赖router.query.loadHistory，其他情况绝不自动恢复
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.loadHistory]);

  // 🎯 模式切换恢复逻辑：当切换到Gen3模式时，确保显示对话记录
  // useEffect(() => {
  //   // 保存当前模型类型到localStorage
  //   if (typeof window !== 'undefined') {
  //     localStorage.setItem('video_model_type', modelType);
  //   }
  //   
  //   if (modelType === 'gen3') {
  //     console.log('🔄 切换到Gen3模式，当前消息数:', gen3Messages.length);
  //     // 如果当前没有消息但localStorage中有备份，则恢复
  //     if (gen3Messages.length === 0 && typeof window !== 'undefined') {
  //       try {
  //         const backup = localStorage.getItem('gen3_messages_backup');
  //         if (backup) {
  //           const parsedMessages = JSON.parse(backup);
  //           if (parsedMessages.length > 0) {
  //             console.log('🔄 从备份恢复Gen3消息:', parsedMessages.length, '条');
  //             setGen3Messages(parsedMessages);
  //           }
  //         }
  //       } catch (e) {
  //         console.warn('备份恢复失败:', e);
  //       }
  //     }
  //   }
  // }, [modelType]);
  
  // 🔒 防止在生成过程中页面被意外重置
  useEffect(() => {
    if (gen3IsGenerating) {
      console.log('🔒 视频生成中，阻止页面跳转...');
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '视频正在生成中，确定要离开吗？';
        return '视频正在生成中，确定要离开吗？';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [gen3IsGenerating]);
    
    // 强制更新状态，用于确保UI重新渲染
    const [forceUpdateCount, setForceUpdateCount] = useState(0);
    
    // 历史记录恢复逻辑
    useEffect(() => {
      const { loadHistory } = router.query;
      
      const restoreHistory = async () => {
        // 只在明确有历史记录需要恢复时才处理
        if (loadHistory && typeof loadHistory === 'string') {
          const histories = await getHistories();
          const targetHistory = histories.find(h => h.id === loadHistory);
          if (targetHistory && targetHistory.type === 'video' && (targetHistory.model.includes('Google Veo 3') || targetHistory.model.includes('DashScope'))) {
            console.log('恢复DashScope历史记录:', targetHistory);
            
            // 恢复对话消息
            if (targetHistory.messages && targetHistory.messages.length > 0) {
              const messagesWithVideoUrl = targetHistory.messages.map(msg => ({
                ...msg,
                videoUrl: (msg as any).videoUrl
              }));
              setGen3Messages(messagesWithVideoUrl);
            }
            
            // 恢复参数
            if (targetHistory.messages.length > 1 && targetHistory.messages[1].metadata) {
              const metadata = targetHistory.messages[1].metadata as any;
              if (metadata.aspectRatio) setGen3AspectRatio(metadata.aspectRatio);
              if (metadata.cameraMovement) setGen3CameraMovement(metadata.cameraMovement);
              if (metadata.speed) setGen3Speed(metadata.speed);
              if (metadata.lighting) setGen3Lighting(metadata.lighting);
            }
            
            // 恢复生成的视频
            if (targetHistory.messages.length > 1 && (targetHistory.messages[1] as any).videoUrl) {
              setGen3GeneratedVideo((targetHistory.messages[1] as any).videoUrl);
            }
          }
        }
      };
      
      restoreHistory();
    }, [router.query?.loadHistory]);

      // 简化状态变化监听，只做必要的同步
  useEffect(() => {
    // 同步到 ref，用于状态持久化
    if (gen3Messages.length > 0) {
      gen3MessagesRef.current = gen3Messages;
      // 备份到 localStorage
      try {
        localStorage.setItem('gen3_messages_backup', JSON.stringify(gen3Messages));
      } catch (e) {
        console.warn('localStorage 备份失败:', e);
      }
    }
  }, [gen3Messages]);

    // Google Veo 3 专用参数选项
    const gen3AspectRatios = [
      { value: '16:9', label: '横屏 (16:9)', description: '适合桌面观看' },
      { value: '9:16', label: '竖屏 (9:16)', description: '适合手机观看' },
      { value: '1:1', label: '方形 (1:1)', description: '适合社交平台' },
      { value: '4:3', label: '传统 (4:3)', description: '经典比例' },
    ];

    const cameraMovements = [
      { value: 'static', label: '静态镜头', description: '无相机运动' },
      { value: 'pan_left', label: '左移', description: '相机向左平移' },
      { value: 'pan_right', label: '右移', description: '相机向右平移' },
      { value: 'tilt_up', label: '上仰', description: '相机向上倾斜' },
      { value: 'tilt_down', label: '下俯', description: '相机向下倾斜' },
      { value: 'zoom_in', label: '推进', description: '相机推近镜头' },
      { value: 'zoom_out', label: '拉远', description: '相机拉远镜头' },
    ];

    const speedOptions = [
      { value: 'slow', label: t('video.speeds.slow'), description: '缓慢动作' },
      { value: 'normal', label: t('video.speeds.normal'), description: '自然速度' },
      { value: 'fast', label: t('video.speeds.fast'), description: '加速动作' },
    ];

    const lightingOptions = [
      { value: 'natural', label: '自然光', description: '真实光照' },
      { value: 'cinematic', label: '电影感', description: '戏剧性光照' },
      { value: 'soft', label: '柔光', description: '温柔光线' },
      { value: 'dramatic', label: '戏剧性', description: '强烈对比' },
      { value: 'golden_hour', label: '黄金时段', description: '温暖光线' },
    ];

    // 图片上传处理
    const handleGen3ImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      // 检查用户是否已登录
      if (!user) {
        setIsLoginOpen(true);
        toast({
          title: '请先登录',
          description: '登录后即可使用AI视频功能',
          status: 'warning',
          duration: 3000,
        });
        return;
      }

      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setGen3ReferenceImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleGen3UploadClick = () => {
      gen3FileInputRef.current?.click();
    };

    const handleGen3RemoveImage = () => {
      setGen3ReferenceImage(null);
      if (gen3FileInputRef.current) {
        gen3FileInputRef.current.value = '';
      }
    };

    // 检查是否已收藏 - 根据视频URL和描述判断
    const isGen3VideoFavorited = gen3GeneratedVideo ? favorites.some(fav => 
      fav.type === 'video' && fav.description.includes(gen3Prompt.slice(0, 50))
    ) : false;

    // Gen3专用的新建对话功能
    const handleGen3NewConversation = () => {
      setGen3Prompt('');
      setGen3Messages([]);
      setGen3GeneratedVideo(null);
      setGen3IsGenerating(false);
      setGen3Progress(0);
      
      // 清除localStorage备份
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gen3_messages_backup');
      }
      
      toast({
        title: '✨ 开始新的对话',
        description: '已清空对话记录，可以开始新的视频创作了！',
        status: 'success',
        duration: 2000,
      });
    };

    // 收藏/取消收藏功能
    const handleGen3ToggleFavorite = async () => {
      if (!gen3GeneratedVideo) return;
      
      if (!user) {
        setIsLoginOpen(true);
        return;
      }

      try {
        if (isGen3VideoFavorited) {
          // 取消收藏 - 找到对应的收藏项
          const favoriteItem = favorites.find(fav => 
            fav.type === 'video' && (
              fav.description.includes(gen3GeneratedVideo) ||
              fav.description.includes(gen3Prompt.slice(0, 50))
            )
          );
          if (favoriteItem) {
            await removeFavorite(favoriteItem.id);
            toast({
              title: '已取消收藏',
              status: 'info',
              duration: 2000,
            });
          }
        } else {
          // 添加收藏 - 先下载视频并上传到本地服务器
          toast({
            title: '正在保存视频...',
            description: '视频正在下载并保存到服务器，请稍候',
            status: 'info',
            duration: 3000,
          });

          let permanentVideoUrl = gen3GeneratedVideo;

          // 如果是外部链接（包含http/https且不是本站链接），则下载并上传
          if (gen3GeneratedVideo.startsWith('http') && !gen3GeneratedVideo.includes(window.location.hostname)) {
            try {
              console.log('开始下载Google Veo 3视频:', gen3GeneratedVideo);
              
              // 下载视频
              const response = await fetch(gen3GeneratedVideo);
              if (!response.ok) {
                throw new Error('视频下载失败');
              }
              
              const blob = await response.blob();
              console.log('Google Veo 3视频下载完成，大小:', blob.size);

              // 创建FormData并上传
              const formData = new FormData();
              formData.append('file', blob, `google-veo3-video-${Date.now()}.mp4`);

              console.log('开始上传Google Veo 3视频到服务器...');
              const uploadResponse = await fetch('/api/upload-video', {
                method: 'POST',
                body: formData,
              });

              if (!uploadResponse.ok) {
                throw new Error('视频上传失败');
              }

              const uploadResult = await uploadResponse.json();
              if (uploadResult.success) {
                permanentVideoUrl = uploadResult.url;
                console.log('Google Veo 3视频上传成功，永久链接:', permanentVideoUrl);
                
                toast({
                  title: '视频保存成功',
                  description: '视频已永久保存到服务器',
                  status: 'success',
                  duration: 2000,
                });
              } else {
                throw new Error(uploadResult.error || '上传失败');
              }
            } catch (uploadError) {
              console.error('Google Veo 3视频保存失败:', uploadError);
              toast({
                title: '视频保存失败',
                description: '将使用原始链接收藏，可能会过期',
                status: 'warning',
                duration: 3000,
              });
              // 继续使用原始链接进行收藏
            }
          }

          // 添加收藏
          await addFavorite({
            type: 'video',
            title: `Google Veo 3 视频 - ${gen3AspectRatio}`,
            description: `视频链接: ${permanentVideoUrl}\n\n提示词：${gen3Prompt}\n宽高比：${gen3AspectRatio}\n相机运动：${gen3CameraMovement}\n速度：${gen3Speed}\n光照：${gen3Lighting}`
          });
          toast({
            title: '已添加到收藏',
            description: permanentVideoUrl.startsWith('/uploads/') ? '视频已永久保存' : '使用原始链接收藏',
            status: 'success',
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('收藏操作失败:', error);
        toast({
          title: '操作失败',
          description: '请稍后重试',
          status: 'error',
          duration: 2000,
        });
      }
    };

    // 下载视频功能
    const handleGen3DownloadVideo = async () => {
      if (!gen3GeneratedVideo) return;
      
      try {
        const response = await fetch(gen3GeneratedVideo);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `google-veo3-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: '下载成功',
          status: 'success',
          duration: 2000,
        });
      } catch (error) {
        console.error('下载失败:', error);
        toast({
          title: '下载失败',
          description: '请稍后重试',
          status: 'error',
          duration: 2000,
        });
      }
    };

    const handleGen3Generate = async () => {
      // 确保页面处于DashScope模式
      if (modelType !== 'gen3') {
        setModelType('gen3');
      }
      
      if (!gen3Prompt.trim()) {
        toast({
          title: '请输入视频提示词',
          status: 'warning',
          duration: 2000,
        });
        return;
      }

      if (!user) {
        setIsLoginOpen(true);
        return;
      }

      setGen3IsGenerating(true);
      setGen3Progress(0);

      // 生成前清空对话，只保留本次新发的用户消息
      const userPrompt = gen3Prompt;
      setGen3Prompt('');
      const userMessage = {
        content: userPrompt,
        isUser: true,
        timestamp: new Date().toISOString(),
        metadata: {
          aspectRatio: gen3AspectRatio,
          cameraMovement: gen3CameraMovement,
          speed: gen3Speed,
          lighting: gen3Lighting,
          videoStyle: gen3VideoStyle
        }
      };
      // 先只保留用户消息
      setGen3Messages([userMessage]);

      try {
        // 构建增强的提示词
        const enhancedPrompt = `${userPrompt}. Camera movement: ${gen3CameraMovement}, Speed: ${gen3Speed}, Lighting: ${gen3Lighting}`;
        
        const requestBody: any = {
          prompt: enhancedPrompt,
          model: gen3VideoStyle, // 传递风格
          aspectRatio: gen3AspectRatio,
          duration: 5,
          mode: 'gen3_text2video',
          cameraMovement: gen3CameraMovement,
          speed: gen3Speed
        };
        
        const response = await fetch('/api/generate-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (data.success && data.taskId) {
          // 异步任务模式 - 需要轮询状态
          console.log('检测到DashScope异步任务模式，开始轮询状态...');
          const taskId = data.taskId;
          let retries = 0;
          const maxRetries = 60; // 最多等待5分钟
          
          setGen3Progress(20); // 任务已提交
          
          const pollStatus = async () => {
            try {
              const statusResponse = await fetch('/api/check-video-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ taskId }),
              });
              
              if (!statusResponse.ok) {
                throw new Error('状态查询失败');
              }

              const statusData = await statusResponse.json();
              
              // 正确获取状态数据结构
              const taskStatus = statusData.output?.task_status || statusData.status;
              const videoUrl = statusData.output?.video_url || statusData.videoUrl;
              
              if (taskStatus === 'SUCCEEDED' && videoUrl) {
                // 视频生成完成
                // 创建AI回复消息
                const aiMessage = {
                  content: ``,
                  isUser: false,
                  timestamp: new Date().toISOString(),
                  videoUrl: videoUrl,
                  metadata: {
                    videoStyle: 'dashscope',
                    aspectRatio: gen3AspectRatio,
                    duration: 5,
                    mode: 'text2video',
                    cameraMovement: gen3CameraMovement,
                    speed: gen3Speed,
                    lighting: gen3Lighting,
                    referenceImage: gen3ReferenceImage,
                    taskId: taskId
                  }
                };
                // 关键修复：始终用[用户消息, AI消息]覆盖gen3Messages，防止异步追加被覆盖
                setGen3Messages([userMessage, aiMessage]);

                // 立即备份到localStorage
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.setItem('gen3_messages_backup', JSON.stringify([userMessage, aiMessage]));
                  } catch (e) {}
                }
                // 滚动到底部
                setTimeout(() => {
                  const chatContainer = document.querySelector('[data-chat-container]');
                  if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                  }
                }, 100);

                // 延迟关闭生成状态，保证AI消息能渲染
                setTimeout(() => {
                  setModelType('gen3');
                  setGen3IsGenerating(false);
                  setGen3Progress(100);
                  setGen3GeneratedVideo(videoUrl);
                }, 200);

                // ...后续活动记录、历史保存等保持不变...

                // 添加活动记录
                await addActivity({
                  type: 'video',
                  title: 'DashScope 视频生成',
                  description: userPrompt.slice(0, 100) + (userPrompt.length > 100 ? '...' : '')
                });

                // 保存到历史记录 - 包含用户消息和AI消息
                const finalUserMessage = {
                  content: userPrompt,
                  isUser: true,
                  timestamp: new Date().toISOString(),
                  metadata: {
                    aspectRatio: gen3AspectRatio,
                    cameraMovement: gen3CameraMovement,
                    speed: gen3Speed,
                    lighting: gen3Lighting
                  }
                };
                
                const historyMessages = [finalUserMessage, aiMessage];
                const historyModel = `Google Veo 3-文生视频-${gen3AspectRatio}-5s`;
                saveHistory(historyMessages, historyModel, 'video');
                
                return true; // 完成
              } else if (taskStatus === 'FAILED') {
                throw new Error(statusData.output?.error || statusData.error || '视频生成失败');
              } else if (taskStatus === 'RUNNING' || taskStatus === 'PENDING') {
                // 更新进度
                const progress = Math.min(20 + (retries / maxRetries) * 70, 90);
                setGen3Progress(progress);
                return false; // 继续轮询
              } else {
                console.warn('未知状态:', taskStatus);
                return false; // 继续轮询
              }
            } catch (statusError) {
              console.error('状态查询错误:', statusError);
              if (retries >= maxRetries - 5) {
                throw statusError; // 接近超时时抛出错误
              }
              return false; // 其他情况继续轮询
            }
          };

          // 开始轮询
          while (retries < maxRetries) {
            const isComplete = await pollStatus();
            if (isComplete) {
              break;
            }
            
            // 等待5秒后继续
            await new Promise(resolve => setTimeout(resolve, 5000));
            retries++;
          }
          
          if (retries >= maxRetries) {
            throw new Error('视频生成超时，请稍后重试');
          }
          
        } else if (data.success && data.videoUrl) {
          // 直接返回结果模式
          
          // 创建AI回复消息
          const aiMessage = {
                            content: ``,
            isUser: false,
            timestamp: new Date().toISOString(),
            videoUrl: data.videoUrl,
            metadata: {
              videoStyle: 'dashscope',
              aspectRatio: gen3AspectRatio,
              duration: 5,
              mode: 'text2video',
              cameraMovement: gen3CameraMovement,
              speed: gen3Speed,
              lighting: gen3Lighting,
              referenceImage: gen3ReferenceImage,
              taskId: data.metadata?.taskId
            }
          };
          
          // 🎯 关键修复：立即更新所有状态并添加AI消息
          setModelType('gen3');
          setGen3IsGenerating(false);
          setGen3Progress(100);
          setGen3GeneratedVideo(data.videoUrl);
          
          // 添加AI消息到对话
          setGen3Messages(prev => {
            const newMessages = [...prev, aiMessage];
            console.log('✅ 直接返回模式：AI消息已添加，新消息数:', newMessages.length);
            
            // 显示成功通知并滚动到底部
            setTimeout(() => {
              toast({
                title: '🎉 Google Veo 3 视频生成成功！',
                description: '视频已生成完成并显示在对话中！',
                status: 'success',
                duration: 5000,
              });
              
              // 滚动到对话底部，确保用户能看到新生成的视频
              setTimeout(() => {
                const chatContainer = document.querySelector('[data-chat-container]');
                if (chatContainer) {
                  chatContainer.scrollTop = chatContainer.scrollHeight;
                }
              }, 200);
            }, 100);
            
            return newMessages;
          });

          // 添加活动记录
          addActivity({
            type: 'video',
            title: 'DashScope 视频生成',
            description: userPrompt.slice(0, 100) + (userPrompt.length > 100 ? '...' : '')
          });

          // 保存到历史记录 - 包含用户消息和AI消息
          const finalUserMessage = {
            content: userPrompt,
            isUser: true,
            timestamp: new Date().toISOString(),
            metadata: {
              aspectRatio: gen3AspectRatio,
              cameraMovement: gen3CameraMovement,
              speed: gen3Speed,
              lighting: gen3Lighting
            }
          };
          
          const historyMessages = [finalUserMessage, aiMessage];
          const historyModel = `Google Veo 3-文生视频-${gen3AspectRatio}-5s`;
          saveHistory(historyMessages, historyModel, 'video');
        } else {
          throw new Error(data.error || data.details || '视频生成失败');
        }

      } catch (error) {
        console.error('DashScope视频生成失败:', error);
        setGen3IsGenerating(false);
        setGen3Progress(0);
        
        const errorMessage = error instanceof Error ? error.message : '请稍后重试';
        toast({
          title: 'DashScope 生成失败',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    return (
                        <VStack spacing={8} align="stretch" w="70%" mx="auto">
            
            {/* Google Veo 3 模型说明 */}
        <Box
          bgGradient="linear(135deg, purple.500, pink.500)"
          borderRadius="2xl"
          p={6}
          color="white"
          position="relative"
          overflow="hidden"
              w="full"
        >
          <Box position="relative" zIndex={2}>
            <HStack spacing={3} mb={2}>
              <Icon as={RiVideoFill} boxSize={6} />
              <Text fontSize="xl" fontWeight="bold">
                {t('video.googleVeo3Title')}
              </Text>
              <Badge colorScheme="whiteAlpha" variant="solid" fontSize="xs">
                {t('common.latest')}
              </Badge>
            </HStack>
            <Text fontSize="md" opacity={0.9}>
              {t('video.dashscopeDesc')}
            </Text>
            <HStack spacing={4} mt={3}>
              <Text fontSize="sm" opacity={0.8}>{t('video.feature5SecHD')}</Text>
              <Text fontSize="sm" opacity={0.8}>{t('video.featureCinemaQuality')}</Text>
              <Text fontSize="sm" opacity={0.8}>{t('video.featurePreciseControl')}</Text>
              <Text fontSize="sm" opacity={0.8}>{t('video.featureText2Video')}</Text>
            </HStack>
          </Box>
          {/* 装饰性背景 */}
          <Box
            position="absolute"
            top={-10}
            right={-10}
            width="120px"
            height="120px"
            bg="whiteAlpha.200"
            borderRadius="full"
            zIndex={1}
          />
        </Box>

        {/* 模式切换 */}

        <VStack spacing={8} w="full" mx="auto">
          {/* AI对话界面 - 单列居中布局 */}
          <Card 
            shadow="2xl" 
            borderRadius="2xl" 
            w="full"
            minH="800px"
            bg={useColorModeValue('white', 'gray.800')}
            border="1px"
            borderColor={useColorModeValue('purple.100', 'purple.700')}
          >
            <CardHeader 
              bgGradient="linear(135deg, purple.500, pink.500)" 
              borderTopRadius="2xl"
              color="white"
            >
              <HStack justify="space-between" align="center">
                <HStack>
                  <Icon as={FiMessageSquare} color="white" />
                  <Heading size="md" color="white">
                    {t('video.googleVeo3Chat')}
                  </Heading>
                  <Text fontSize="sm" color="purple.200" fontWeight="bold" ml={3}>{t('credits.consume')}1250{t('credits.credits')}</Text>
                </HStack>
                {gen3Messages.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="whiteAlpha"
                    leftIcon={<Icon as={FiRefreshCw} />}
                    onClick={handleGen3NewConversation}
                    color="white"
                    borderColor="whiteAlpha.400"
                    bg="whiteAlpha.200"
                    _hover={{
                      bg: 'whiteAlpha.300',
                      borderColor: 'whiteAlpha.600'
                    }}
                  >
                    新建对话
                  </Button>
                )}
              </HStack>
            </CardHeader>
            <CardBody flex="1" display="flex" flexDirection="column" p={0}>
              {/* 对话记录区域 */}
              <Box
                  flex="1"
                overflowY="auto"
                p={8}
                maxH="700px"
                bgGradient={useColorModeValue('linear(to-br, purple.50, pink.50, blue.50)', 'linear(to-br, gray.700, purple.900, gray.800)')}
                data-chat-container
              >
                  <VStack spacing={4} align="stretch">
                    {/* AI欢迎消息 */}
                    {gen3Messages.length === 0 && (
                      <HStack align="start" spacing={3}>
                        <Box
                          w="32px"
                          h="32px"
                          borderRadius="full"
                          bg="purple.500"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Icon as={FiVideo} color="white" size="16px" />
                        </Box>
                        <Box
                          bg={useColorModeValue('white', 'gray.700')}
                          p={6}
                          borderRadius="xl"
                          shadow="md"
                          w="100%"
                          border="1px solid"
                          borderColor={useColorModeValue('purple.100', 'purple.600')}
                          position="relative"
                          _before={{
                            content: '""',
                            position: 'absolute',
                            top: '-1px',
                            left: '-1px',
                            right: '-1px',
                            bottom: '-1px',
                            background: 'linear-gradient(135deg, purple.400, pink.400)',
                            borderRadius: 'xl',
                            zIndex: -1
                          }}
                        >
                          <Text fontSize="sm" fontWeight="medium" mb={2}>
                            {t('video.assistantGreeting')} 🎬
                </Text>
                          <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} mb={6}>
                            {t('video.assistantDesc')}
                    </Text>
                          <Box 
                            mt={3} 
                            p={3} 
                            bg={useColorModeValue('purple.50', 'purple.900')} 
                          borderRadius="lg"
                            border="1px dashed"
                            borderColor={useColorModeValue('purple.200', 'purple.600')}
                          >
                            <Text fontSize="xs" color="purple.600" _dark={{ color: 'purple.300' }} fontWeight="medium">
                              💡 {t('video.exampleText')}
                            </Text>
                  </Box>
                    </Box>
                </HStack>
                    )}

                    {/* 历史对话消息 */}
                    {gen3Messages.map((message, index) => (
                        <Box key={index}>
                          {message.isUser ? (
                          // 用户消息
                          <HStack align="start" spacing={3} justify="flex-end">
                            <Box
                              bgGradient="linear(135deg, purple.500, purple.600, pink.500)"
                              color="white"
                              p={6}
                              borderRadius="xl"
                              shadow="lg"
                              position="relative"
                              maxW={message.metadata?.aspectRatio === '9:16' ? '240px' : message.metadata?.aspectRatio === '1:1' ? '300px' : message.metadata?.aspectRatio === '4:3' ? '350px' : '400px'}
                              minW="120px"
                              w="auto"
                              // 移除w="95%"，让内容自适应
                            >
                              <Text fontSize="sm" fontWeight="medium" mb={2}>{message.content}</Text>
                              {message.metadata && (
                                <Box 
                                  bg="whiteAlpha.200" 
                                  p={2} 
                                  borderRadius="md"
                                  fontSize="xs"
                                >
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Badge colorScheme="whiteAlpha" variant="solid" size="sm">
                                      📐 {message.metadata.aspectRatio}
                                    </Badge>
                                    <Badge colorScheme="whiteAlpha" variant="solid" size="sm">
                                      🎥 {message.metadata.cameraMovement}
                                    </Badge>
                                    <Badge colorScheme="whiteAlpha" variant="solid" size="sm">
                                      ⚡ {message.metadata.speed}
                                    </Badge>
                  </HStack>
                  </Box>
                              )}
                            </Box>
                            <Box
                              w="32px"
                              h="32px"
                              borderRadius="full"
                              bg="gray.300"
                              _dark={{ bg: 'gray.600' }}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              flexShrink={0}
                            >
                              <Icon as={FiUser} color="gray.600" _dark={{ color: 'gray.300' }} size="16px" />
                  </Box>
                  </HStack>
                        ) : (
                          // AI消息
                          <HStack align="start" spacing={3}>
                            <Box
                              w="32px"
                              h="32px"
                              borderRadius="full"
                              bg="purple.500"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              flexShrink={0}
                              position="relative"
                            >
                              <Icon as={FiVideo} color="white" size="16px" />
                              {/* 箭头移动到头像右侧 */}
                              <Box
                                position="absolute"
                                left="32px"
                                top="12px"
                                width="0"
                                height="0"
                                borderTop="8px solid transparent"
                                borderBottom="8px solid transparent"
                                borderLeft={`8px solid ${useColorModeValue('#fff', '#2D3748')}`}
                              />
                            </Box>
                            <Box
                              bg={useColorModeValue('white', 'gray.700')}
                              p={6}
                              borderRadius="xl"
                              shadow="lg"
                              border="1px solid"
                              borderColor={useColorModeValue('gray.200', 'gray.600')}
                              position="relative"
                              maxW={message.videoUrl ? (message.metadata?.aspectRatio === '9:16' ? '240px' : message.metadata?.aspectRatio === '1:1' ? '300px' : message.metadata?.aspectRatio === '4:3' ? '350px' : '400px') : '480px'}
                              minW="120px"
                              w="auto"
                            >
                              <VStack spacing={3} align="start">
                                <Text fontSize="sm" whiteSpace="pre-line">{message.content}</Text>
                                {message.videoUrl && (
                                  <Box 
                                    borderRadius="lg" 
                                    overflow="hidden" 
                                    border="2px solid" 
                                    borderColor="purple.200"
                                    bg="purple.50"
                                    p={2}
                                    w="100%"
                                    maxW={message.metadata?.aspectRatio === '9:16' ? '200px' : 
                                          message.metadata?.aspectRatio === '1:1' ? '250px' : 
                                          message.metadata?.aspectRatio === '4:3' ? '300px' : '350px'}
                                  >
                                    <video
                                      src={message.videoUrl}
                                      controls
                                      style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '8px'
                                      }}
                                    />
                                  </Box>
                                )}
                                <HStack spacing={2}>
                                  <Button
                                    size="xs"
                                    leftIcon={<FiDownload />}
                      colorScheme="purple"
                                    variant="outline"
                                    onClick={() => {
                                      // 下载当前视频
                                      const link = document.createElement('a');
                                      link.href = message.videoUrl;
                                      link.download = `google-veo3-video-${Date.now()}.mp4`;
                                      link.click();
                                    }}
                                  >
                                    下载
                                  </Button>
                                  <Button
                                    size="xs"
                                    leftIcon={favorites.some(fav => 
                                      fav.type === 'video' && fav.description.includes(message.videoUrl)
                                    ) ? <AiFillHeart /> : <AiOutlineHeart />}
                                    colorScheme={favorites.some(fav => 
                                      fav.type === 'video' && fav.description.includes(message.videoUrl)
                                    ) ? "red" : "gray"}
                                    variant="outline"
                                    onClick={async () => {
                                      // 收藏当前视频
                                      if (!user) {
                                        setIsLoginOpen(true);
                                        return;
                                      }
                                      
                                      const isCurrentlyFavorited = favorites.some(fav => 
                                        fav.type === 'video' && fav.description.includes(message.videoUrl)
                                      );
                                      
                                      if (isCurrentlyFavorited) {
                                        const favoriteItem = favorites.find(fav => 
                                          fav.type === 'video' && fav.description.includes(message.videoUrl)
                                        );
                                        if (favoriteItem) {
                                          await removeFavorite(favoriteItem.id);
                                          toast({
                                            title: '已取消收藏',
                                            status: 'info',
                                            duration: 2000,
                                          });
                                        }
                                      } else {
                                        await addFavorite({
                                          type: 'video',
                                          title: `Google Veo 3 视频 - ${message.metadata?.aspectRatio || '16:9'}`,
                                          description: `视频链接: ${message.videoUrl}\n\n提示词：${message.content}`
                                        });
                                        toast({
                                          title: '已添加到收藏',
                                          status: 'success',
                                          duration: 2000,
                                        });
                                      }
                                    }}
                                  >
                                    {favorites.some(fav => 
                                      fav.type === 'video' && fav.description.includes(message.videoUrl)
                                    ) ? "已收藏" : "收藏"}
                                  </Button>
                                </HStack>
                              </VStack>
                            </Box>
                          </HStack>
                        )}
                      </Box>
                    ))}

                    {/* 生成中状态 */}
                    {gen3IsGenerating && (
                      <HStack align="start" spacing={3}>
                        <Box
                          w="32px"
                          h="32px"
                          borderRadius="full"
                          bg="purple.500"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Icon as={FiVideo} color="white" size="16px" />
                        </Box>
                        <Box
                          bg={useColorModeValue('white', 'gray.700')}
                          p={6}
                          borderRadius="xl"
                          shadow="lg"
                          w="95%"
                          border="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          position="relative"
                          _after={{
                            content: '""',
                            position: 'absolute',
                            bottom: '-8px',
                            left: '20px',
                            width: '0',
                            height: '0',
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid',
                            borderTopColor: useColorModeValue('white', 'gray.700')
                      }}
                    >
                          <VStack spacing={2} align="start">
                            <HStack spacing={2}>
                              <Spinner size="sm" color="purple.500" />
                              <Text fontSize="sm">正在生成您的视频...</Text>
                            </HStack>
                            <Progress 
                              value={gen3Progress} 
                              colorScheme="purple" 
                              size="sm"
                              w="200px"
                              borderRadius="full"
                            />
                            <Text fontSize="xs" color="gray.500">
                              预计等待 2-3 分钟
                          </Text>
                        </VStack>
                    </Box>
                      </HStack>
                    )}
                </VStack>
                </Box>

                {/* 快速设置区域 */}
                <Box 
                  p={6} 
                  borderTop="1px" 
                  borderColor={useColorModeValue('purple.100', 'purple.700')}
                  bg={useColorModeValue('gray.50', 'gray.750')}
                >
                  <VStack spacing={4}>
                    {/* 视频尺寸快速选择 */}
                    <Box w="full">
                      <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }} mb={3} fontWeight="medium">
                        {t('video.videoSize')}
                      </Text>
                      <HStack spacing={3} justify="center">
                        {gen3AspectRatios.map(ratio => (
            <Button
                            key={ratio.value}
                            size="sm"
                            variant={gen3AspectRatio === ratio.value ? "solid" : "outline"}
                            colorScheme={gen3AspectRatio === ratio.value ? "purple" : "gray"}
                            onClick={() => setGen3AspectRatio(ratio.value)}
                      borderRadius="lg"
                            px={4}
                            py={2}
                            fontWeight="medium"
                      _hover={{
                              transform: 'translateY(-1px)',
                              shadow: 'md'
                            }}
                            transition="all 0.2s"
                          >
                            {ratio.value}
                          </Button>
                        ))}
                      </HStack>
                    </Box>

                    {/* 输入框和发送按钮 */}
                    <HStack spacing={3} w="full" align="center">
                      <Input
                        placeholder={t('video.promptPlaceholder')}
                        value={gen3Prompt}
                        onChange={(e) => setGen3Prompt(e.target.value)}
                        onFocus={() => {
                          if (!user) {
                            setIsLoginOpen(true);
                            toast({
                              title: '请先登录',
                              description: '登录后即可使用AI视频功能',
                              status: 'warning',
                              duration: 3000,
                            });
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleGen3Generate();
                          }
                        }}
                        bg={useColorModeValue('white', 'gray.700')}
                        borderColor={useColorModeValue('purple.200', 'purple.600')}
                        borderWidth="2px"
                        borderRadius="xl"
                        px={4}
                        py={3}
                        fontSize="md"
                        _focus={{
                          borderColor: 'purple.400',
                          boxShadow: '0 0 0 3px rgba(159, 122, 234, 0.1)'
                        }}
                        _hover={{
                          borderColor: 'purple.300'
                        }}
                      />
                      <IconButton
                        aria-label="发送"
                        icon={<FiSend />}
                        bgGradient="linear(135deg, purple.500, pink.500)"
                        color="white"
                        onClick={handleGen3Generate}
                        isLoading={gen3IsGenerating}
                        isDisabled={!gen3Prompt.trim()}
                        size="lg"
                        borderRadius="xl"
                        _hover={{
                          bgGradient: "linear(135deg, purple.600, pink.600)",
                          transform: 'translateY(-1px)',
                          shadow: 'lg'
                        }}
                        _active={{
                          transform: 'translateY(0)'
                        }}
                        transition="all 0.2s"
                      />
                      {gen3Prompt.trim() && (
                        <Text fontSize="sm" color="purple.500" fontWeight="bold" ml={2} minW="90px">
                          {t('credits.consume')}1250{t('credits.credits')}
                        </Text>
                      )}
                    </HStack>

                    {/* 增大输入区和下方风格选项之间的间距 */}
                    <Box h={8} />

                    {/* 美化风格选项区域 */}
                    <Box w="full" bg={useColorModeValue('purple.50', 'gray.800')} borderRadius="xl" p={4} mb={2} boxShadow="sm">
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiImage} color="purple.400" />
                        <Text fontSize="md" fontWeight="bold" color="purple.700" _dark={{ color: 'purple.200' }}>
                          {t('video.style')}
                        </Text>
                      </HStack>
                      <Wrap spacing={3} shouldWrapChildren>
                        {['realistic', 'cartoon', 'fantasy', 'movie', 'cyberpunk'].map(style => (
                          <Button
                            key={style}
                            size="md"
                            variant={gen3VideoStyle === style ? "solid" : "outline"}
                            colorScheme={gen3VideoStyle === style ? "purple" : "gray"}
                            onClick={() => setGen3VideoStyle(style)}
                            borderRadius="2xl"
                            px={6}
                            py={2}
                            fontWeight={gen3VideoStyle === style ? "bold" : "normal"}
                            boxShadow={gen3VideoStyle === style ? "md" : "none"}
                            borderWidth={gen3VideoStyle === style ? "2px" : "1px"}
                            borderColor={gen3VideoStyle === style ? "purple.400" : "gray.200"}
                            _hover={{
                              transform: 'translateY(-2px)',
                              shadow: 'lg',
                              borderColor: 'purple.300'
                            }}
                            transition="all 0.2s"
                          >
                            {t(`video.styles.${style}`)}
                          </Button>
                        ))}
                      </Wrap>
                    </Box>

                    {/* 美化速度选项区域 */}
                    <Box w="full" bg={useColorModeValue('purple.50', 'gray.800')} borderRadius="xl" p={4} mb={2} boxShadow="sm">
                      <HStack spacing={2} mb={2}>
                        <Icon as={FiZap} color="purple.400" />
                        <Text fontSize="md" fontWeight="bold" color="purple.700" _dark={{ color: 'purple.200' }}>
                          {t('video.speed')}
                        </Text>
                      </HStack>
                      <Wrap spacing={3} shouldWrapChildren>
                        {speedOptions.map(opt => (
                          <Button
                            key={opt.value}
                            size="md"
                            variant={gen3Speed === opt.value ? "solid" : "outline"}
                            colorScheme={gen3Speed === opt.value ? "purple" : "gray"}
                            onClick={() => setGen3Speed(opt.value)}
                            borderRadius="2xl"
                            px={6}
                            py={2}
                            fontWeight={gen3Speed === opt.value ? "bold" : "normal"}
                            boxShadow={gen3Speed === opt.value ? "md" : "none"}
                            borderWidth={gen3Speed === opt.value ? "2px" : "1px"}
                            borderColor={gen3Speed === opt.value ? "purple.400" : "gray.200"}
                            _hover={{
                              transform: 'translateY(-2px)',
                              shadow: 'lg',
                              borderColor: 'purple.300'
                            }}
                            transition="all 0.2s"
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </Wrap>
                    </Box>
              </VStack>
                </Box>
              </CardBody>
            </Card>
          </VStack>

        {/* 生成进度 */}
        {gen3IsGenerating && (
          <Card shadow="lg" borderRadius="xl" mt={4}>
            <CardBody>
              <VStack spacing={4}>
                <HStack spacing={3} w="full">
                  <Spinner size="sm" color="purple.500" />
                  <Text fontSize="sm" fontWeight="medium">
                    Google Veo 3 AI正在根据描述生成视频...
                  </Text>
                </HStack>
                
                <Box w="full">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                      生成进度
                    </Text>
                    <Text fontSize="xs" color="purple.600" fontWeight="medium">
                      {gen3Progress}%
                    </Text>
                  </HStack>
                  <Progress 
                    value={gen3Progress} 
                    colorScheme="purple" 
                    size="sm" 
                    borderRadius="full"
                    bg="gray.100"
                    _dark={{ bg: 'gray.700' }}
                  />
                </Box>
                
                <Alert status="info" borderRadius="lg" size="sm">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" fontWeight="medium">
                      预计等待时间：2-3分钟
                    </Text>
                    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                      {t('video.veo3Rendering')}
                    </Text>
                  </VStack>
                </Alert>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    );
  };

  // 判断是否免费用户
  const isFreeUser = getUserQuota('video') !== Infinity;
  const freeQuota = getUserQuota('video');
  const freeUsed = userStats.videos;
  const creditCost = 500;

  return (
    <Box w="100%" maxW="100vw" overflow="hidden">
      {/* 移动端导航 */}
      <MobileNav onClearHistory={handleClearHistory} onNewVideo={handleNewVideo} />
      
      {/* 桌面端侧边栏 */}
      <Box display={{ base: 'none', md: 'block' }}>
        <Sidebar onNewVideo={handleNewVideo} onClearHistory={handleClearHistory} />
      </Box>
      
      <Header />
      
      {/* 主要内容区域 */}
      <Box
        ml={{ base: '0', md: '250px' }}
        pt={{ base: "60px", md: "60px" }}
        transition="margin-left 0.2s"
        minH="calc(100vh - 60px)"
        maxW="100vw"
        overflow="hidden"
      >
        <Box w="100%" px={2}>
          <VStack spacing={{ base: 6, md: 8 }} align="stretch" w="100%">
            <VStack spacing={4} w="100%">
              <Heading size={{ base: 'lg', md: 'xl' }} textAlign="center">
                {t('video.title')}
              </Heading>
              
              {/* 模型切换按钮 */}
              <HStack 
                spacing={0} 
                bg={useColorModeValue('gray.100', 'gray.700')} 
                borderRadius="lg" 
                p={1}
              >
                <Button
                  size="md"
                  variant={modelType === 'regular' ? 'solid' : 'ghost'}
                  colorScheme={modelType === 'regular' ? 'purple' : 'gray'}
                  borderRadius="md"
                  onClick={() => setModelType('regular')}
                  _hover={{
                    bg: modelType === 'regular' ? 'purple.600' : 'gray.200',
                    _dark: { bg: modelType === 'regular' ? 'purple.600' : 'gray.600' }
                  }}
                >
                  {t('video.regularModel')}
                </Button>
                <Button
                  size="md"
                  variant={modelType === 'gen3' ? 'solid' : 'ghost'}
                  colorScheme={modelType === 'gen3' ? 'purple' : 'gray'}
                  borderRadius="md"
                  onClick={() => setModelType('gen3')}
                  _hover={{
                    bg: modelType === 'gen3' ? 'purple.600' : 'gray.200',
                    _dark: { bg: modelType === 'gen3' ? 'purple.600' : 'gray.600' }
                  }}
                >
                  {t('video.googleVeo3Model')}
                </Button>
              </HStack>
            </VStack>
            
            {/* 根据模型类型渲染不同内容 */}
            {modelType === 'regular' ? (
              <>
                {/* 模式选择 */}
                <Tabs 
                  variant="enclosed" 
                  index={mode === 'text2video' ? 0 : 1} 
                  onChange={(index) => setMode(index === 0 ? 'text2video' : 'img2video')}
                >
              <TabList>
                <Tab>
                  <Icon as={FiMessageSquare} mr={2} />
                  {t('video.textToVideo')}
                </Tab>
                <Tab>
                  <Icon as={FiImage} mr={2} />
                  {t('video.imageToVideo')}
                </Tab>
              </TabList>
              
              <TabPanels>
                {/* 文生视频 */}
                <TabPanel p={0} pt={6}>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 6, md: 8 }} w="full">
                    {/* 左侧控制面板 */}
                    <VStack spacing={6} align="stretch">
                      <Card>
                        <CardHeader>
                          <Heading size="md">{t('video.description')}</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <HStack spacing={3} align="center" mb={4}>
                              <Textarea
                                placeholder={t('video.descriptionPlaceholder')}
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                onFocus={() => {
                                  if (!user) {
                                    setIsLoginOpen(true);
                                    toast({
                                      title: '请先登录',
                                      description: '登录后即可使用AI视频功能',
                                      status: 'warning',
                                      duration: 3000,
                                    });
                                  }
                                }}
                                rows={2}
                                size="lg"
                                borderRadius="md"
                                bg={useColorModeValue('white', 'gray.700')}
                                color={useColorModeValue('gray.800', 'white')}
                                _placeholder={{ color: 'gray.400' }}
                                isDisabled={isGenerating}
                              />
                            </HStack>
                            
                            {/* 视频样式选择 */}
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={4}>{t('video.selectStyle')}</Text>
                              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                                {videoStyles.map(style => (
                                  <Box key={style.value} onClick={() => setVideoStyle(style.value)}>
                                    <StylePreview style={style} isSelected={videoStyle === style.value} />
                                  </Box>
                                ))}
                              </SimpleGrid>
                            </Box>
                            
                            {/* 宽高比选择 */}
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={2}>{t('video.aspectRatio')}</Text>
                              <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                                {aspectRatios.map(ratio => (
                                  <option key={ratio.value} value={ratio.value}>
                                    {ratio.label} - {ratio.description}
                                  </option>
                                ))}
                              </Select>
                            </Box>
                            

                          </VStack>
                        </CardBody>
                      </Card>
                      
                      {/* 生成按钮 */}
                      <Button
                        colorScheme="purple"
                        size="lg"
                        width="full"
                        leftIcon={<Icon as={FiVideo} />}
                        onClick={handleGenerate}
                        isLoading={isGenerating}
                        loadingText={t('video.generating')}
                        disabled={!prompt.trim() || isGenerating}
                      >
                        {t('video.generateVideo')}
                        <Text as="span" fontSize="sm" fontWeight="bold" ml={2} px={3} py={0.5} borderRadius="full" bgGradient="linear(to-r, purple.400, purple.600)" color="white" display="inline-block">
                          {isFreeUser ? `${t('credits.remainingFreeVideos')} ${freeQuota - freeUsed}/${freeQuota}` : `${t('credits.consume')}${creditCost}${t('credits.credits')}`}
                        </Text>
                      </Button>
                      
                      {/* 生成进度 */}
                      {isGenerating && (
                        <Box>
                          <Text fontSize="sm" mb={2}>{t('video.progress')}: {Math.round(generatingProgress)}%</Text>
                          <Progress value={generatingProgress} colorScheme="purple" />
                        </Box>
                      )}
                    </VStack>
                    
                    {/* 右侧预览区域 */}
                    <VStack spacing={4} align="stretch">
                      <Card>
                        <CardHeader>
                          <HStack justify="space-between">
                            <Heading size="md">{t('video.preview')}</Heading>
                            {generatedVideo && (
                              <HStack spacing={2}>
                                <Tooltip label={isFavorited ? '取消收藏' : '添加收藏'}>
                                  <IconButton
                                    aria-label="收藏"
                                    icon={isFavorited ? <AiFillHeart /> : <AiOutlineHeart />}
                                    size="sm"
                                    variant="outline"
                                    colorScheme={isFavorited ? "red" : "gray"}
                                    color={isFavorited ? "red.500" : "gray.500"}
                                    borderColor={isFavorited ? "red.500" : "gray.300"}
                                    bg={isFavorited ? "red.50" : "transparent"}
                                    _hover={{
                                      bg: isFavorited ? "red.100" : "gray.100",
                                      color: isFavorited ? "red.600" : "red.500",
                                      borderColor: isFavorited ? "red.600" : "red.500"
                                    }}
                                    onClick={handleToggleFavorite}
                                  />
                                </Tooltip>
                                <Tooltip label={t('video.download')}>
                                  <IconButton
                                    aria-label="下载"
                                    icon={<FiDownload />}
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDownloadVideo}
                                  />
                                </Tooltip>
                                <Tooltip label="删除视频">
                                  <IconButton
                                    aria-label="删除视频"
                                    icon={<FiX />}
                                    size="sm"
                                    variant="outline"
                                    colorScheme="red"
                                    onClick={handleDeleteVideo}
                                  />
                                </Tooltip>
                              </HStack>
                            )}
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          {generatedVideo ? (
                            <Box position="relative" w="full">
                              <AspectRatio 
                                ratio={aspectRatio === '16:9' ? 16/9 : aspectRatio === '9:16' ? 9/16 : aspectRatio === '1:1' ? 1 : aspectRatio === '3:4' ? 3/4 : 4/3}
                                w="full"
                              >
                                <video
                                  src={generatedVideo}
                                  controls
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '8px',
                                    objectFit: 'contain'
                                  }}
                                />
                              </AspectRatio>
                            </Box>
                          ) : (
                            <Box w="full">
                              <AspectRatio 
                                ratio={aspectRatio === '16:9' ? 16/9 : aspectRatio === '9:16' ? 9/16 : aspectRatio === '1:1' ? 1 : aspectRatio === '3:4' ? 3/4 : 4/3}
                                w="full"
                              >
                                <Flex
                                  align="center"
                                  justify="center"
                                  bg={useColorModeValue('gray.100', 'gray.700')}
                                  borderRadius="md"
                                  border="2px dashed"
                                  borderColor={useColorModeValue('gray.300', 'gray.600')}
                                  w="full"
                                  h="full"
                                >
                                  <VStack spacing={4}>
                                    <Icon as={FiVideo} size="64px" color="gray.400" />
                                    <VStack spacing={2}>
                                      <Text color="gray.500" textAlign="center" fontSize="lg" fontWeight="medium">
                                        {t('video.previewArea')}
                                      </Text>
                                      <Text color="gray.400" textAlign="center" fontSize="sm">
                                        {t('video.previewDesc')}
                                      </Text>
                                      <Text color="purple.500" textAlign="center" fontSize="xs" fontWeight="medium" mt={2}>
                                        {t('video.durationNote')}
                                      </Text>
                                    </VStack>
                                  </VStack>
                                </Flex>
                              </AspectRatio>
                            </Box>
                          )}
                        </CardBody>
                      </Card>
                    </VStack>
                  </SimpleGrid>
                </TabPanel>
                
                {/* 图生视频 */}
                <TabPanel p={0} pt={6}>
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 6, md: 8 }} w="full">
                    {/* 左侧控制面板 */}
                    <VStack spacing={6} align="stretch">
                      <Card>
                        <CardHeader>
                          <Heading size="md">{t('video.referenceImage')}</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <Input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              display="none"
                              onChange={handleImageUpload}
                            />
                            
                            {referenceImage ? (
                              <Box position="relative">
                                <Image
                                  src={referenceImage}
                                  alt={t('video.referenceImage')}
                                  borderRadius="md"
                                  maxH="200px"
                                  w="full"
                                  objectFit="cover"
                                />
                                <IconButton
                                                                      aria-label={t('video.deleteImage')}
                                  icon={<FiX />}
                                  size="sm"
                                  position="absolute"
                                  top={2}
                                  right={2}
                                  colorScheme="red"
                                  onClick={handleRemoveImage}
                                />
                              </Box>
                            ) : (
                              <Button
                                leftIcon={<Icon as={FiUpload} />}
                                variant="outline"
                                h="120px"
                                onClick={handleUploadClick}
                                borderStyle="dashed"
                                bg={useColorModeValue('gray.50', 'gray.700')}
                                borderColor={useColorModeValue('gray.300', 'gray.600')}
                                _hover={{
                                  bg: useColorModeValue('gray.100', 'gray.600'),
                                  borderColor: useColorModeValue('gray.400', 'gray.500')
                                }}
                              >
                                <VStack spacing={2}>
                                  <Text>{t('video.uploadImage')}</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {t('video.uploadDesc')}
                                  </Text>
                                </VStack>
                              </Button>
                            )}
                            
                            {/* 运动强度 */}
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={2}>
                                {t('video.motionStrength')}: {Math.round(motionStrength * 100)}%
                              </Text>
                              <Slider
                                value={motionStrength}
                                onChange={setMotionStrength}
                                min={0.1}
                                max={1.0}
                                step={0.1}
                              >
                                <SliderTrack>
                                  <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb />
                              </Slider>
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {t('video.motionStrengthDesc')}
                              </Text>
                            </Box>
                          </VStack>
                        </CardBody>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <Heading size="md">{t('video.motionDescription')}</Heading>
                        </CardHeader>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <Textarea
                              placeholder={t('video.motionPlaceholder')}
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              onFocus={() => {
                                if (!user) {
                                  setIsLoginOpen(true);
                                  toast({
                                    title: '请先登录',
                                    description: '登录后即可使用AI视频功能',
                                    status: 'warning',
                                    duration: 3000,
                                  });
                                }
                              }}
                              rows={3}
                              resize="vertical"
                            />
                            
                            {/* 其他参数 */}
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={4}>{t('video.selectStyle')}</Text>
                              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                                {videoStyles.map(style => (
                                  <Box
                                    key={style.value}
                                    position="relative"
                                    cursor="pointer"
                                    onClick={() => setVideoStyle(style.value)}
                                    borderRadius="lg"
                                    overflow="hidden"
                                    border="2px solid"
                                    borderColor={videoStyle === style.value ? 'purple.500' : 'gray.200'}
                                    _dark={{ borderColor: videoStyle === style.value ? 'purple.400' : 'gray.600' }}
                                    transition="all 0.2s"
                                    _hover={{ 
                                      borderColor: videoStyle === style.value ? 'purple.600' : 'purple.300',
                                      transform: 'translateY(-2px)',
                                      boxShadow: 'lg'
                                    }}
                                  >
                                    <AspectRatio ratio={4/3}>
                                      <Box position="relative">
                                        <video
                                          src={style.image}
                                          autoPlay
                                          loop
                                          muted
                                          playsInline
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                          }}
                                        />
                                        {videoStyle === style.value && (
                                          <Box
                                            position="absolute"
                                            top={2}
                                            right={2}
                                            bg="purple.500"
                                            borderRadius="full"
                                            p={1}
                                            zIndex={1}
                                          >
                                            <Icon as={FiVideo} size="12px" color="white" />
                                          </Box>
                                        )}
                                      </Box>
                                    </AspectRatio>
                                    <Box p={3} bg={useColorModeValue('white', 'gray.800')}>
                                      <Text fontSize="sm" fontWeight="bold" mb={1}>
                                        {style.label}
                                      </Text>
                                      <Text fontSize="xs" color="gray.500" noOfLines={2}>
                                        {style.description}
                                      </Text>
                                    </Box>
                                  </Box>
                                ))}
                              </SimpleGrid>
                            </Box>
                            
                            {/* 宽高比选择 */}
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={3}>{t('video.aspectRatio')}</Text>
                              <SimpleGrid columns={2} spacing={3}>
                                {aspectRatios.map(ratio => (
                                  <Button
                                    key={ratio.value}
                                    variant={aspectRatio === ratio.value ? "solid" : "outline"}
                                    colorScheme={aspectRatio === ratio.value ? "purple" : "gray"}
                                    onClick={() => setAspectRatio(ratio.value)}
                                    h="auto"
                                    py={3}
                                    px={4}
                                  >
                                    <VStack spacing={1}>
                                      <Text fontSize="sm" fontWeight="medium">
                                        {ratio.label}
                                      </Text>
                                      <Text fontSize="xs" color="gray.500" textAlign="center">
                                        {ratio.description}
                                      </Text>
                                    </VStack>
                                  </Button>
                                ))}
                              </SimpleGrid>
                            </Box>
                          </VStack>
                        </CardBody>
                      </Card>
                      
                      {/* 生成按钮 */}
                      <Button
                        colorScheme="purple"
                        size="lg"
                        width="full"
                        leftIcon={<Icon as={FiVideo} />}
                        onClick={handleGenerate}
                        isLoading={isGenerating}
                        loadingText={t('video.generating')}
                        disabled={!prompt.trim() || !referenceImage || isGenerating}
                      >
                        {t('video.generateVideo')}
                        <Text as="span" fontSize="sm" fontWeight="bold" ml={2} px={3} py={0.5} borderRadius="full" bgGradient="linear(to-r, purple.400, purple.600)" color="white" display="inline-block">
                          {isFreeUser ? `${t('credits.remainingFreeVideos')} ${freeQuota - freeUsed}/${freeQuota}` : `${t('credits.consume')}${creditCost}${t('credits.credits')}`}
                        </Text>
                      </Button>
                      
                      {/* 生成进度 */}
                      {isGenerating && (
                        <Box>
                          <Text fontSize="sm" mb={2}>{t('video.progress')}: {Math.round(generatingProgress)}%</Text>
                          <Progress value={generatingProgress} colorScheme="purple" />
                        </Box>
                      )}
                    </VStack>
                    
                    {/* 右侧预览区域 */}
                    <VStack spacing={4} align="stretch">
                      <Card>
                        <CardHeader>
                          <HStack justify="space-between">
                            <Heading size="md">{t('video.preview')}</Heading>
                            {generatedVideo && (
                              <HStack spacing={2}>
                                <Tooltip label={isFavorited ? '取消收藏' : '添加收藏'}>
                                  <IconButton
                                    aria-label="收藏"
                                    icon={isFavorited ? <AiFillHeart /> : <AiOutlineHeart />}
                                    size="sm"
                                    variant="outline"
                                    colorScheme={isFavorited ? "red" : "gray"}
                                    color={isFavorited ? "red.500" : "gray.500"}
                                    borderColor={isFavorited ? "red.500" : "gray.300"}
                                    bg={isFavorited ? "red.50" : "transparent"}
                                    _hover={{
                                      bg: isFavorited ? "red.100" : "gray.100",
                                      color: isFavorited ? "red.600" : "red.500",
                                      borderColor: isFavorited ? "red.600" : "red.500"
                                    }}
                                    onClick={handleToggleFavorite}
                                  />
                                </Tooltip>
                                <Tooltip label={t('video.download')}>
                                  <IconButton
                                    aria-label="下载"
                                    icon={<FiDownload />}
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDownloadVideo}
                                  />
                                </Tooltip>
                                <Tooltip label="删除视频">
                                  <IconButton
                                    aria-label="删除视频"
                                    icon={<FiX />}
                                    size="sm"
                                    variant="outline"
                                    colorScheme="red"
                                    onClick={handleDeleteVideo}
                                  />
                                </Tooltip>
                              </HStack>
                            )}
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          {generatedVideo ? (
                            <Box position="relative" w="full">
                              <AspectRatio 
                                ratio={aspectRatio === '16:9' ? 16/9 : aspectRatio === '9:16' ? 9/16 : aspectRatio === '1:1' ? 1 : aspectRatio === '3:4' ? 3/4 : 4/3}
                                w="full"
                              >
                                <video
                                  src={generatedVideo}
                                  controls
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '8px',
                                    objectFit: 'contain'
                                  }}
                                />
                              </AspectRatio>
                            </Box>
                          ) : (
                            <Box w="full">
                              <AspectRatio 
                                ratio={aspectRatio === '16:9' ? 16/9 : aspectRatio === '9:16' ? 9/16 : aspectRatio === '1:1' ? 1 : aspectRatio === '3:4' ? 3/4 : 4/3}
                                w="full"
                              >
                                <Flex
                                  align="center"
                                  justify="center"
                                  bg={useColorModeValue('gray.100', 'gray.700')}
                                  borderRadius="md"
                                  border="2px dashed"
                                  borderColor={useColorModeValue('gray.300', 'gray.600')}
                                  w="full"
                                  h="full"
                                >
                                  <VStack spacing={4}>
                                    <Icon as={FiVideo} size="64px" color="gray.400" />
                                    <VStack spacing={2}>
                                      <Text color="gray.500" textAlign="center" fontSize="lg" fontWeight="medium">
                                        {t('video.previewArea')}
                                      </Text>
                                      <Text color="gray.400" textAlign="center" fontSize="sm">
                                        {t('video.previewDesc')}
                                      </Text>
                                      <Text color="purple.500" textAlign="center" fontSize="xs" fontWeight="medium" mt={2}>
                                        {t('video.durationNote')}
                                      </Text>
                                    </VStack>
                                  </VStack>
                                </Flex>
                              </AspectRatio>
                            </Box>
                          )}
                        </CardBody>
                      </Card>
                    </VStack>
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
              </>
            ) : (
              /* DashScope 模型页面 */
              <Gen3VideoPage />
            )}
          </VStack>
        </Box>
      </Box>
      
      {/* 登录模态框 */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </Box>
  );
} 