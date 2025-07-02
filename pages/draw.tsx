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
} from '@chakra-ui/react';
import { FiImage, FiDownload, FiRefreshCw, FiUpload, FiX, FiHeart, FiFile, FiSend, FiMessageSquare, FiBookmark } from 'react-icons/fi';
import { RiPaintBrushFill, RiImageEditFill } from 'react-icons/ri';
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

export default function Draw() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [size, setSize] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();
  const { t } = useLanguage();
  const { addActivity, addFavorite, removeFavorite, favorites, userStats, getUserQuota, checkFreeQuotaExceeded, getRemainingFreeQuota } = useUserActivity();
  const { user } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 判断是否免费用户
  const isFreeUser = getUserQuota('image') !== Infinity;
  const freeQuota = getUserQuota('image');
  const freeUsed = userStats.images;
  const creditCost = 100;

  // 从URL参数加载历史记录
  useEffect(() => {
    const { loadHistory, prompt: urlPrompt, style: urlStyle, size: urlSize } = router.query;
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
    if (targetHistory && targetHistory.type === 'draw') {
      // 还原prompt
      if (targetHistory.messages.length > 0) {
        setPrompt(targetHistory.messages[0].content);
      }
      // 还原风格和尺寸
      if (targetHistory.messages.length > 1 && targetHistory.messages[1].metadata) {
        const metadata = targetHistory.messages[1].metadata as any;
        if (metadata.style) setStyle(metadata.style);
        if (metadata.size) setSize(metadata.size);
      } else {
        const modelParts = targetHistory.model.split('-');
        if (modelParts.length >= 2) {
          setStyle(modelParts[0]);
          setSize(modelParts.slice(1).join('-'));
        } else {
          setStyle(targetHistory.model);
        }
      }
      // 还原生成的图片
      if (targetHistory.messages.length > 1) {
        const aiResponse = targetHistory.messages[1].content;
        const match = aiResponse.match(/生成的图片：(https?:\/\/[^\s]+)/);
        if (match) {
          const originalUrl = match[1];
          // 无论什么外链都用代理
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
          setGeneratedImage(proxyUrl);
        } else {
          setGeneratedImage(null); // 没有图片
        }
      }
    } else if (urlPrompt && typeof urlPrompt === 'string') {
      setPrompt(urlPrompt);
      if (urlStyle && typeof urlStyle === 'string') {
        setStyle(urlStyle);
      }
      if (urlSize && typeof urlSize === 'string') {
        setSize(urlSize);
      }
    }
  }, [router.query]);

  // 检查当前图片是否已收藏
  useEffect(() => {
    if (generatedImage) {
      const isAlreadyFavorited = favorites.some(fav => 
        fav.type === 'image' && fav.description.includes(prompt.slice(0, 50))
      );
      setIsFavorited(isAlreadyFavorited);
    }
  }, [favorites, generatedImage, prompt]);

  // 页面加载时恢复状态
  useEffect(() => {
    if (user && !router.query.loadHistory) {
      restorePageState();
    }
  }, [user]);

  // 页面状态变化时自动保存
  useEffect(() => {
    if (user && (prompt || generatedImage)) {
      saveCurrentState();
    }
  }, [prompt, style, size, generatedImage, isFavorited, user]);

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
        // 设置从其他页面返回的标记
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
        // 设置从其他页面返回的标记
        sessionStorage.setItem('fromOtherPage', 'true');
      }
    };
  }, [user, prompt, style, size, generatedImage, isFavorited, router.events]);

  // 监听认证状态变化
  useEffect(() => {
    const handleAuthStateChange = () => {
      if (!user) {
        // 用户退出登录，立即清空绘画状态
        setPrompt('')
        setGeneratedImage(null)
        setIsGenerating(false)
        setGeneratingProgress(0)
        setIsFavorited(false)
        setSize('1:1')
        setStyle('realistic')
        pageStateManager.clearPageState('draw')
      } else {
        // 用户登录，恢复状态
        restorePageState()
      }
    }

    // 监听认证状态变化事件
    window.addEventListener('auth-state-changed', handleAuthStateChange)
    
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange)
    }
  }, [user])

  // 页面状态管理
  const saveCurrentState = () => {
    if (user) {
      pageStateManager.savePageState('draw', {
        prompt,
        style,
        size,
        mode: 'text2img',
        referenceImage: null,
        strength: 0.7,
        generatedImage,
        isFavorited
      });
    }
  };

  const restorePageState = () => {
    if (user) {
      const savedState = pageStateManager.getPageState('draw');
      if (savedState.prompt || savedState.generatedImage) {
        setPrompt(savedState.prompt || '');
        setStyle(savedState.style || 'realistic');
        setSize(savedState.size || '1:1');
        setGeneratedImage(savedState.generatedImage || null);
        setIsFavorited(savedState.isFavorited || false);
        console.log('恢复绘画页面状态:', savedState);
      }
    }
  };

  const startNewDraw = () => {
    setPrompt('');
    setStyle('realistic');
    setSize('1:1');
    setGeneratedImage(null);
    setIsFavorited(false);
    pageStateManager.clearPageState('draw');
    toast({
      title: '已开始新的绘图会话',
      status: 'success',
      duration: 2000,
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!user) {
      setIsLoginOpen(true);
      toast({
        title: '请先登录',
        description: '登录后即可使用AI绘图功能',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // 检查免费额度
    if (checkFreeQuotaExceeded('image')) {
      toast({
        title: '已达免费绘图上限',
        description: `您已用完 ${userStats.free_images_limit} 次免费绘图，请开通会员享受更多权益`,
        status: 'warning',
        duration: 4000,
      });
      return;
    }
    setIsGenerating(true);
    setGeneratingProgress(0);
    try {
        // 文生图模式，保持原有逻辑
        const sizeMap: { [key: string]: string } = {
        '1:1': '1024*1024',
        '3:4': '768*1152',
        '4:3': '1280*720',
        '16:9': '1280*720',
        '9:16': '720*1280'
        };
        const styleMap: { [key: string]: string } = {
          'realistic': '<photography>',
          'anime': '<anime>',
          'oil-painting': '<oil painting>',
          'watercolor': '<watercolor>',
          'sketch': '<sketch>'
        };
        if (!sizeMap[size]) {
          toast({
            title: '错误',
            description: `不支持的尺寸: ${size}`,
            status: 'error',
            duration: 3000,
          });
          return;
        }
        if (!styleMap[style]) {
          toast({
            title: '错误',
            description: `不支持的风格: ${style}`,
            status: 'error',
            duration: 3000,
          });
          return;
        }
      const requestData = {
          prompt: prompt.trim(),
          style: styleMap[style] || '<auto>',
          size: sizeMap[size] || '1024*1024',
        mode: 'text2img'
        };
      setGeneratingProgress(10);
      const response = await fetch('/api/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      setGeneratingProgress(90);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `生成失败 (${response.status})`);
      }
      const data = await response.json();
      if (data.success && data.imageUrl) {
        setGeneratingProgress(100);
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(data.imageUrl)}`;
        setGeneratedImage(proxyUrl);
        addActivity({
          type: 'image',
          title: 'AI绘图',
          description: `提示词: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`
        });
        const drawHistory: ChatHistory = {
          id: Date.now().toString(),
          title: prompt.slice(0, 30) + '...',
          model: `${style}-${size}`,
          messages: [
            {
              content: prompt,
              isUser: true,
              timestamp: new Date().toISOString(),
            },
            {
              content: `生成的图片：${data.imageUrl}\n图片链接: ${data.imageUrl}`,
              isUser: false,
              timestamp: new Date().toISOString(),
              modelName: `文生图 - ${style} - ${size}`,
              metadata: {
                style: style,
                size: size,
                mode: 'text2img',
                actualSize: requestData.size,
                prompt: prompt.trim(),
                referenceImage: null
              }
            }
          ],
          timestamp: Date.now(),
          type: 'draw' as const,
        };
        saveHistory(drawHistory.messages, drawHistory.model, 'draw');
        toast({
          title: '生成成功',
          description: '图片已生成完成',
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error('生成失败');
      }
    } catch (error) {
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brainbox-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t('draw.downloadSuccess'),
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('下载失败:', error);
      toast({
        title: t('draw.downloadError'),
        description: t('draw.downloadErrorDesc'),
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleToggleFavorite = async () => {
    if (!generatedImage) return;
    
    if (isFavorited) {
      // 取消收藏
      const favoriteToRemove = favorites.find(fav => 
        fav.type === 'image' && fav.description.includes(prompt.slice(0, 50))
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
      // 添加收藏 - 先保存图片到本地
      try {
        let finalImageUrl = generatedImage;
        
        // 如果是阿里云OSS链接，先保存到本地
        if (generatedImage.includes('dashscope-result-bj.oss-cn-beijing.aliyuncs.com') || 
            generatedImage.includes('/api/image-proxy')) {
          
          toast({
            title: '正在保存图片...',
            status: 'info',
            duration: 1000,
          });
          
          // 获取原始URL（如果是代理URL）
          let originalUrl = generatedImage;
          if (generatedImage.includes('/api/image-proxy')) {
            const urlParams = new URLSearchParams(generatedImage.split('?')[1] || '');
            originalUrl = urlParams.get('url') || generatedImage;
          }
          
          const saveResponse = await fetch('/api/save-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: originalUrl,
              prompt: prompt
            }),
          });
          
          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            if (saveData.success) {
              finalImageUrl = saveData.savedUrl;
              console.log('图片已保存到本地:', finalImageUrl);
            }
          }
        }
        
        // 区分不同类型的图片生成
        const favoriteTitle = `AI绘图 - ${prompt.slice(0, 20)}...`;
        
        const favoriteDescription = `提示词: ${prompt}\n风格: ${style}\n尺寸: ${size}\n图片链接: ${finalImageUrl}`;
        
        await addFavorite({
          type: 'image',
          title: favoriteTitle,
          description: favoriteDescription
        });
        setIsFavorited(true);
        toast({
          title: '已收藏图片',
          status: 'success',
          duration: 2000,
        });
      } catch (error) {
        console.error('收藏图片失败:', error);
        // 即使保存失败，也尝试用原始URL收藏
        await addFavorite({
          type: 'image',
          title: `AI绘图 - ${prompt.slice(0, 20)}...`,
          description: `提示词: ${prompt}\n风格: ${style}\n尺寸: ${size}\n图片链接: ${generatedImage}`
        });
        setIsFavorited(true);
        toast({
          title: '已收藏图片',
          description: '图片可能会在一段时间后失效',
          status: 'warning',
          duration: 3000,
        });
      }
    }
  };

  const handleNewDraw = () => {
    // 清空所有状态，开始新的绘图会话
    setPrompt('');
    setStyle('realistic');
    setSize('1:1');
    setGeneratedImage('');
    setIsFavorited(false);
    setIsGenerating(false);
    setGeneratingProgress(0);
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // 清除URL参数
    router.push('/draw', undefined, { shallow: true });
    
    toast({
      title: t('session.newDrawStarted'),
      status: 'info',
      duration: 2000,
    });
  };

  const handleClearHistory = () => {
    // 清空当前的绘图状态（类似聊天页面的逻辑）
    setPrompt('');
    setGeneratedImage('');
    setIsGenerating(false);
    setGeneratingProgress(0);
    
    // 也可以在这里添加清除本地存储的绘图历史记录的逻辑
    // 但现在先保持与聊天页面一致的行为
  };

  return (
    <Box minH="100vh" bg="white" _dark={{ bg: 'gray.900' }}>
      <MobileNav onClearHistory={handleClearHistory} onNewDraw={handleNewDraw} />
      <Box display={{ base: 'none', md: 'block' }}>
        <Sidebar onNewDraw={handleNewDraw} onClearHistory={handleClearHistory} />
      </Box>
        <Header />
      <Box
        ml={{ base: '0', md: '250px' }}
        pt={{ base: "60px", md: "60px" }}
        transition="margin-left 0.2s"
        minH="calc(100vh - 60px)"
        display="flex"
        alignItems="center"
      >
        <Container maxW="1400px" py={8}>
          <VStack spacing={8} align="stretch">
            <VStack spacing={4}>
              <Heading size="lg" textAlign="center">{t('draw.title')}</Heading>
              
              {/* 状态指示器和新建会话按钮 */}
              {(prompt || generatedImage) && (
                <HStack justify="space-between" w="full" maxW="800px">
                  <HStack>
                    <Badge colorScheme="purple" variant="subtle">
                      进行中的绘图
                    </Badge>
                    {pageStateManager.hasPageState('draw') && (
                      <Tooltip label="此绘图已自动保存状态">
                        <Badge colorScheme="blue" variant="outline">
                          已保存状态
                        </Badge>
                      </Tooltip>
                    )}
                  </HStack>
                  <Tooltip label="开始新的绘图">
                    <Button
                      size="sm"
                      leftIcon={<Icon as={FiRefreshCw} />}
                      variant="outline"
                      colorScheme="purple"
                      onClick={startNewDraw}
                    >
                      新建绘图
                    </Button>
                  </Tooltip>
                </HStack>
              )}
            </VStack>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full">
              {/* 左侧控制区域 */}
              <VStack spacing={6} align="stretch">
                {/* 模式选择 */}
                <VStack spacing={4} align="stretch">
                  <Heading size="md">{t('draw.mode')}</Heading>
                  <Tabs index={0} onChange={(index) => {}}>
                    <TabList>
                      <Tab>
                        <HStack spacing={2}>
                          <Icon as={RiPaintBrushFill} color="purple.500" />
                          <Text>{t('draw.textToImage')}</Text>
                        </HStack>
                      </Tab>
                    </TabList>
                    <TabPanels>
                      <TabPanel p={0} pt={4}>
                        <Text color="gray.500" fontSize="sm">
                          {t('draw.describe')}
                        </Text>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                </VStack>

                {/* 提示词输入 */}
                <VStack spacing={4} align="stretch">
                  <Heading size="md">{t('draw.describe')}</Heading>
                  <Textarea
                    placeholder={t('draw.placeholder')}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={useColorModeValue('gray.200', 'gray.500')}
                    _hover={{
                      borderColor: useColorModeValue('gray.300', 'gray.400'),
                    }}
                    _focus={{
                      borderColor: 'purple.500',
                      boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
                    }}
                  />
                </VStack>

                {/* 生成设置 */}
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">{t('draw.settings')}</Heading>
                    <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                      <Box flex={1}>
                        <Text mb={2} fontSize="sm" fontWeight="medium">{t('draw.style')}</Text>
                        <Select value={style} onChange={(e) => setStyle(e.target.value)}>
                          <option value="realistic">{t('draw.styleRealistic')}</option>
                          <option value="anime">{t('draw.styleAnime')}</option>
                          <option value="oil-painting">{t('draw.styleOilPainting')}</option>
                          <option value="watercolor">{t('draw.styleWatercolor')}</option>
                          <option value="sketch">{t('draw.styleSketch')}</option>
                        </Select>
                      </Box>
                      <Box flex={1}>
                        <Text mb={2} fontSize="sm" fontWeight="medium">{t('draw.size')}</Text>
                        <Select value={size} onChange={(e) => setSize(e.target.value)}>
                          <option value="1:1">{t('draw.sizeSquare')} (1024×1024)</option>
                          <option value="3:4">{t('draw.sizePortrait')} (720×1280)</option>
                          <option value="4:3">{t('draw.sizeLandscape')} (1280×720)</option>
                          <option value="16:9">{t('draw.sizeWidescreen')} (1280×720)</option>
                          <option value="9:16">{t('draw.sizeMobilePortrait')} (720×1280)</option>
                        </Select>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {t('draw.sizeNote')}
                        </Text>
                      </Box>
            </Flex>
                  </VStack>

                {/* 生成按钮 */}
                <VStack spacing={4} align="stretch">
                  <Button 
                    colorScheme="purple"
                    size="lg"
                    width="full"
                    leftIcon={<Icon as={FiImage} />}
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    loadingText={t('draw.generating')}
                    disabled={!prompt.trim() || isGenerating}
                  >
                    {t('draw.generate')}
                    {isFreeUser ? (
                      <Text fontSize="md" ml={2} color="white" fontWeight="bold" px={3} py={1} borderRadius="md" bg="purple.500" boxShadow="sm">
                        {t('credits.remainingFreeImages')}：{freeQuota - freeUsed}/{freeQuota}
                      </Text>
                    ) : (
                    <Text fontSize="xs" ml={2} color="gray.300">
                        ({t('credits.consume')}{creditCost}{t('credits.credits')})
                    </Text>
                    )}
                  </Button>
                </VStack>
              </VStack>
              
              {/* 右侧预览区域 */}
              <VStack spacing={4} align="stretch" h="full">
                <Heading size="md">{t('draw.result')}</Heading>
                <Box flex={1}>
                  <Box
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderRadius="md"
                    bg={useColorModeValue('gray.50', 'gray.700')}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    minH="500px"
                    maxH="700px"
                    w="full"
                    overflow="hidden"
                  >
                    {generatedImage ? (
                      <>
                        <Image
                          src={generatedImage}
                          alt="Generated artwork"
                          objectFit="contain"
                          maxW="100%"
                          maxH="680px"
                          borderRadius="md"
                          onError={(e) => {
                            console.error('图片加载失败:', generatedImage);
                            // 如果代理失败，尝试直接使用原始URL
                            const originalUrl = new URLSearchParams(generatedImage.split('?')[1] || '').get('url');
                            if (originalUrl && !e.currentTarget.src.includes('proxy')) {
                              console.log('尝试使用原始URL:', originalUrl);
                              e.currentTarget.src = originalUrl;
                            }
                          }}
                        />
                        <Flex
                          position="absolute"
                          top={2}
                          right={2}
                          gap={2}
                        >
                          <Button
                            size="sm"
                            leftIcon={<Icon as={FiDownload} />}
                            bg={useColorModeValue('gray.100', 'gray.600')}
                            color={useColorModeValue('gray.700', 'gray.200')}
                            _hover={{
                              bg: useColorModeValue('gray.200', 'gray.700'),
                            }}
                            onClick={handleDownloadImage}
                          >
                            {t('draw.download')}
                          </Button>
                        </Flex>
                      </>
                    ) : isGenerating ? (
                      <VStack spacing={4} w="80%">
                        <Spinner size="xl" color="purple.500" />
                        <VStack spacing={2} w="full">
                          <Text color="gray.600" fontWeight="medium">
                            {t('draw.generatingText')}
                          </Text>
                          <Progress 
                            value={generatingProgress} 
                            colorScheme="purple" 
                            size="sm" 
                            w="full"
                            borderRadius="full"
                          />
                          <Text fontSize="sm" color="gray.500">
                            {generatingProgress}%
                          </Text>
                        </VStack>
                      </VStack>
                    ) : (
                      <VStack spacing={4}>
                        <Icon as={FiImage} size="48px" color="gray.400" />
                        <Text color="gray.500" textAlign="center">
                          {t('draw.placeholder')}
                        </Text>
                      </VStack>
                    )}
            </Box>
        </Box>
        
                {/* 收藏按钮 - 仅在有生成图片时显示 */}
                {generatedImage && (
                  <Flex justify="center" mt={4}>
                    <Button
                      leftIcon={<Icon as={FiHeart} />}
                      colorScheme={isFavorited ? 'red' : 'gray'}
                      variant={isFavorited ? 'solid' : 'outline'}
                      size="sm"
                      onClick={handleToggleFavorite}
                    >
                      {isFavorited ? t('draw.favorited') : t('draw.favorite')}
                    </Button>
                  </Flex>
                )}
                          </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>
      
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </Box>
  );
}