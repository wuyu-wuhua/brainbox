import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  Button,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Avatar,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  HStack,
  Image,
  Checkbox,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Badge,
} from '@chakra-ui/react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import { FiMessageSquare, FiImage, FiBook, FiStar, FiClock, FiVideo, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { FaTrash, FaCheck } from 'react-icons/fa';
import { MdSelectAll, MdClear } from 'react-icons/md';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { useRouter } from 'next/router';

const SpacePage = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { userStats, recentActivities, favorites, removeFavorite } = useUserActivity();
  const router = useRouter();
  const toast = useToast();
  const [isClient, setIsClient] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  
  // 批量删除收藏相关状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);
  const { 
    isOpen: isBatchDeleteOpen, 
    onOpen: onBatchDeleteOpen, 
    onClose: onBatchDeleteClose 
  } = useDisclosure();

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDeleteFavorite = (id: string) => {
    removeFavorite(id);
    toast({
      title: '已取消收藏',
      status: 'info',
      duration: 2000,
    });
  };

  const handleViewFavorite = (favorite) => {
    setSelectedFavorite(favorite);
    onOpen();
  };

  // 批量删除相关函数
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedFavorites([]);
  };

  const handleSelectFavorite = (id: string) => {
    setSelectedFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(favId => favId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFavorites.length === favorites.length) {
      setSelectedFavorites([]);
    } else {
      setSelectedFavorites(favorites.map(fav => fav.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedFavorites.length === 0) {
      toast({
        title: '请先选择要删除的收藏',
        status: 'warning',
        duration: 2000,
      });
      return;
    }
    
    selectedFavorites.forEach(id => removeFavorite(id));
    toast({
      title: '批量删除成功',
      description: `已删除 ${selectedFavorites.length} 个收藏`,
      status: 'success',
      duration: 2000,
    });
    setSelectedFavorites([]);
    setIsSelectionMode(false);
    onBatchDeleteClose();
  };

  const handleClearAllFavorites = () => {
    if (favorites.length === 0) {
      toast({
        title: '没有收藏可以清空',
        status: 'info',
        duration: 2000,
      });
      return;
    }
    
    favorites.forEach(fav => removeFavorite(fav.id));
    toast({
      title: '已清空所有收藏',
      description: `共清空了 ${favorites.length} 个收藏`,
      status: 'info',
      duration: 2000,
    });
    onBatchDeleteClose();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation': return FiMessageSquare;
      case 'image': return FiImage;
      case 'document': return FiBook;
      case 'video': return FiVideo;
      default: return FiMessageSquare;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'conversation': return 'blue.500';
      case 'image': return 'pink.500';
      case 'document': return 'green.500';
      case 'video': return 'purple.500';
      default: return 'gray.500';
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'conversation': return t('space.aiChat');
      case 'image': return t('space.imageGeneration');
      case 'document': return t('space.documentReading');
      case 'video': return t('space.videoGeneration');
      default: return '未知活动';
    }
  };

  // 加载状态
  if (!isClient || authLoading) {
    return (
      <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
        <MobileNav onNewChat={() => {}} onClearHistory={() => {}} />
        <Box display={{ base: 'none', md: 'block' }}>
          <Sidebar onNewChat={() => {}} onClearHistory={() => {}} />
        </Box>
        <Header />
        <Box
          ml={{ base: '0', md: '250px' }}
          pt={{ base: "60px", md: "60px" }}
          transition="margin-left 0.2s"
        >
          <Center h="50vh">
            <VStack spacing={4}>
              <Spinner size="xl" color="purple.500" />
              <Text>加载中...</Text>
            </VStack>
          </Center>
        </Box>
      </Box>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
        <MobileNav onNewChat={() => {}} onClearHistory={() => {}} />
        <Box display={{ base: 'none', md: 'block' }}>
          <Sidebar onNewChat={() => {}} onClearHistory={() => {}} />
        </Box>
        <Header />
        <Box
          ml={{ base: '0', md: '250px' }}
          pt={{ base: "60px", md: "60px" }}
          transition="margin-left 0.2s"
        >
          <Box maxW="1200px" mx="auto" p={8}>
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>需要登录</AlertTitle>
                <AlertDescription>
                  请先登录以查看个人空间。
                  <Button ml={4} size="sm" onClick={() => router.push('/')}>
                    返回首页
                  </Button>
                </AlertDescription>
              </Box>
            </Alert>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <MobileNav onNewChat={() => {}} onClearHistory={() => {}} />
      <Box display={{ base: 'none', md: 'block' }}>
        <Sidebar onNewChat={() => {}} onClearHistory={() => {}} />
      </Box>
      <Header />
      <Box
        ml={{ base: '0', md: '250px' }}
        pt={{ base: "60px", md: "60px" }}
        transition="margin-left 0.2s"
      >
        <Box maxW="1200px" mx="auto">
          <VStack spacing={8} p={{ base: 4, md: 8 }} align="stretch">
            {/* 用户信息 */}
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align="center"
              gap={6}
              bg={bgColor}
              p={6}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <Avatar 
                size="2xl" 
                src={user.user_metadata?.avatar_url}
                name={user.user_metadata?.full_name || user.email}
                bg="purple.500"
              />
              <VStack align={{ base: 'center', md: 'flex-start' }} spacing={4} flex={1}>
                <Heading size="lg">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || '用户名'}
                </Heading>
                <Text color="gray.500">{user.email}</Text>
              </VStack>
              {/* 右侧积分信息区域 */}
              <VStack align="end" spacing={4} minW="200px">
                <Box textAlign="right">
                  <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                    剩余积分
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                    {userStats?.credits || 0}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    积分
                  </Text>
                </Box>
                <Button
                  colorScheme="purple"
                  variant="solid"
                  size="md"
                  onClick={() => router.push('/membership')}
                  leftIcon={<Icon as={FiStar} />}
                  bg="linear-gradient(45deg, #8B5CF6, #A855F7)"
                  _hover={{
                    bg: "linear-gradient(45deg, #7C3AED, #9333EA)",
                    transform: "translateY(-2px)",
                    boxShadow: "lg"
                  }}
                  transition="all 0.2s"
                >
                  充值积分
                </Button>
              </VStack>
            </Flex>

            {/* 使用统计 */}
            <StatGroup
              bg={bgColor}
              p={6}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={borderColor}
              display="grid"
              gridTemplateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }}
              gap={3}
            >
              <Stat>
                <StatLabel>{t('space.chatCount')}</StatLabel>
                <StatNumber>{userStats.conversations}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>{t('space.imageCount')}</StatLabel>
                <StatNumber>{userStats.images}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>{t('space.readCount')}</StatLabel>
                <StatNumber>{userStats.documents}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>{t('space.videos')}</StatLabel>
                <StatNumber>{userStats.videos || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>{t('space.favoriteCount')}</StatLabel>
                <StatNumber>{favorites.length}</StatNumber>
              </Stat>
            </StatGroup>

            {/* 最近活动 */}
            <VStack align="stretch" spacing={4}>
              <Heading size="md">{t('space.recentActivity')}</Heading>
              {recentActivities.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {recentActivities.slice(0, 3).map((activity, index) => (
                    <Box
                      key={index}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={borderColor}
                      bg={bgColor}
                    >
                      <Icon as={getActivityIcon(activity.type)} color={getActivityColor(activity.type)} mb={2} />
                      <Text fontWeight="bold">{getActivityTitle(activity.type)}</Text>
                      <Text color="gray.500" fontSize="sm">
                        {activity.timestamp}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Box
                  p={8}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={bgColor}
                  textAlign="center"
                >
                  <Text color="gray.500">{t('space.noRecentActivity')}</Text>
                </Box>
              )}
            </VStack>

            {/* 收藏内容 */}
            <VStack align="stretch" spacing={4}>
              <VStack align="stretch" spacing={2}>
                <Heading size="md">{t('space.myFavorites')}</Heading>
                <Text fontSize="sm" color="gray.500">
                  💾 带有"永久保存"标签的视频已保存到服务器，不会过期。⚠️ 外链视频可能会在一段时间后失效。
                </Text>
              </VStack>
              
              <HStack justify="space-between" align="center">
                <Box></Box>
                {favorites.length > 0 && (
                  <HStack spacing={2}>
                    {isSelectionMode && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<MdSelectAll />}
                          onClick={handleSelectAll}
                        >
                          {selectedFavorites.length === favorites.length ? '取消全选' : '全选'}
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          leftIcon={<FiTrash2 />}
                          isDisabled={selectedFavorites.length === 0}
                          onClick={onBatchDeleteOpen}
                        >
                          删除选中 ({selectedFavorites.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<FiX />}
                          onClick={handleToggleSelectionMode}
                        >
                          取消
                        </Button>
                      </>
                    )}
                    {!isSelectionMode && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<FiCheck />}
                          onClick={handleToggleSelectionMode}
                        >
                          多选
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          leftIcon={<MdClear />}
                          onClick={onBatchDeleteOpen}
                        >
                          清空所有
                        </Button>
                      </>
                    )}
                  </HStack>
                )}
              </HStack>
              {favorites.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {favorites.map((favorite) => (
                    <Box
                      key={favorite.id}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={isSelectionMode && selectedFavorites.includes(favorite.id) ? 'purple.500' : borderColor}
                      bg={bgColor}
                      position="relative"
                      cursor="pointer"
                      _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                      transition="all 0.2s"
                      onClick={(e) => {
                        if (isSelectionMode) {
                          e.stopPropagation();
                          handleSelectFavorite(favorite.id);
                        } else {
                          handleViewFavorite(favorite);
                        }
                      }}
                    >
                      <Flex align="center" gap={2} mb={2}>
                        {isSelectionMode && (
                          <Checkbox
                            isChecked={selectedFavorites.includes(favorite.id)}
                            onChange={() => handleSelectFavorite(favorite.id)}
                            colorScheme="purple"
                          />
                        )}
                        <Icon as={FiStar} color="yellow.500" />
                        <Text fontWeight="bold">
                          {favorite.type === 'conversation' ? t('space.favoriteConversation') : 
                           favorite.type === 'image' ? (
                             favorite.title.includes('图生图') ? '收藏的图生图' : 
                             favorite.title.includes('图像编辑') ? '收藏的图像编辑' : '收藏的文生图'
                           ) : 
                           favorite.type === 'video' ? (
                             favorite.title.includes('图生视频') ? '收藏的图生视频' : '收藏的文生视频'
                           ) : t('space.favoriteDocument')}
                        </Text>
                        {!isSelectionMode && (
                          <IconButton
                            aria-label={t('space.deleteFavorite')}
                            icon={<FaTrash />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            position="absolute"
                            top={2}
                            right={2}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFavorite(favorite.id);
                            }}
                          />
                        )}
                      </Flex>
                      
                      {/* 如果是图片类型，显示图片预览 */}
                      {favorite.type === 'image' && (() => {
                        const imageUrlMatch = favorite.description.match(/图片链接:\s*([^\n]+)/);
                        const imageUrl = imageUrlMatch ? imageUrlMatch[1].trim() : null;
                        const referenceImageMatch = favorite.description.match(/(?:参考图片|原始图片):\s*([^\n]+)/);
                        const referenceImage = referenceImageMatch ? referenceImageMatch[1].trim() : null;
                        const isImg2Img = favorite.title.includes('图生图') || favorite.title.includes('图像编辑');
                        
                        return (
                          <VStack spacing={3} align="stretch" mb={3}>
                            {/* 如果是图生图或图像编辑，显示参考/原始图片 */}
                            {isImg2Img && referenceImage && (
                              <Box>
                                <Text fontSize="xs" color="gray.600" mb={1}>
                                  {favorite.title.includes('图像编辑') ? '原始图片:' : '参考图片:'}
                                </Text>
                                <Image
                                  src={referenceImage}
                                  alt="参考图片"
                                  borderRadius="md"
                                  maxH="100px"
                                  w="full"
                                  objectFit="cover"
                                />
                              </Box>
                            )}
                            
                            {/* 显示生成的图片 */}
                            {imageUrl ? (
                              <Box>
                                <Text fontSize="xs" color="gray.600" mb={1}>
                                  {favorite.title.includes('图像编辑') ? '编辑后的图片:' : '生成的图片:'}
                                </Text>
                                <Image
                                  src={imageUrl}
                                  alt={t('space.favoriteImage')}
                                  borderRadius="md"
                                  maxH="120px"
                                  w="full"
                                  objectFit="cover"
                                  fallback={
                                    <Box
                                      h="120px"
                                      bg="gray.100"
                                      borderRadius="md"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                    >
                                      <Text color="gray.500" fontSize="sm">{t('space.imageExpired')}</Text>
                                    </Box>
                                  }
                                />
                              </Box>
                            ) : (
                              <Box>
                                <Text fontSize="xs" color="gray.600" mb={1}>生成的图片:</Text>
                                <Box
                                  h="120px"
                                  bg="gray.100"
                                  borderRadius="md"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Text color="gray.500" fontSize="sm">图片链接已失效</Text>
                                </Box>
                              </Box>
                            )}
                          </VStack>
                        );
                      })()}
                      
                      {/* 如果是视频类型，显示视频预览 */}
                      {favorite.type === 'video' && (() => {
                        const videoUrlMatch = favorite.description.match(/视频链接:\s*([^\n]+)/);
                        const videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
                        const referenceImageMatch = favorite.description.match(/参考图片:\s*([^\n]+)/);
                        const referenceImage = referenceImageMatch ? referenceImageMatch[1].trim() : null;
                        const isImg2Video = favorite.title.includes('图生视频');
                        
                        return (
                          <VStack spacing={3} align="stretch" mb={3}>
                            {/* 如果是图生视频，显示参考图片 */}
                            {isImg2Video && referenceImage && (
                              <Box>
                                <Text fontSize="xs" color="gray.600" mb={1}>参考图片:</Text>
                                <Image
                                  src={referenceImage}
                                  alt="参考图片"
                                  borderRadius="md"
                                  maxH="100px"
                                  w="full"
                                  objectFit="cover"
                                />
                              </Box>
                            )}
                            
                            {/* 显示生成的视频 */}
                            {videoUrl ? (
                              <Box>
                                <HStack justify="space-between" align="center" mb={1}>
                                  <Text fontSize="xs" color="gray.600">生成的视频:</Text>
                                  {videoUrl.startsWith('/uploads/') && (
                                    <Badge colorScheme="green" size="sm">永久保存</Badge>
                                  )}
                                  {videoUrl.startsWith('http') && !videoUrl.includes(window?.location?.hostname) && (
                                    <Badge colorScheme="orange" size="sm">外链可能过期</Badge>
                                  )}
                                </HStack>
                                <video
                                  src={videoUrl}
                                  controls
                                  style={{
                                    width: '100%',
                                    maxHeight: '120px',
                                    borderRadius: '8px',
                                    objectFit: 'cover'
                                  }}
                                />
                              </Box>
                            ) : (
                              <Box>
                                <Text fontSize="xs" color="gray.600" mb={1}>生成的视频:</Text>
                                <Box
                                  h="120px"
                                  bg="purple.100"
                                  borderRadius="md"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  _dark={{ bg: 'purple.800' }}
                                >
                                  <Icon as={FiVideo} size="30px" color="purple.500" />
                                </Box>
                              </Box>
                            )}
                          </VStack>
                        );
                      })()}
                      
                      <Text color="gray.500" fontSize="sm" noOfLines={favorite.type === 'image' || favorite.type === 'video' ? 2 : 5}>
                        {favorite.type === 'image' 
                          ? favorite.description.split('\n')[0] // 只显示提示词部分
                          : favorite.type === 'video'
                          ? favorite.description.split('|')[0].trim() // 显示视频提示词部分
                          : favorite.description
                        }
                      </Text>
                      <Text fontSize="xs" color="gray.400" mt={2}>
                        {favorite.timestamp}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Box
                  p={8}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={bgColor}
                  textAlign="center"
                >
                  <Text color="gray.500">{t('space.noFavorites')}</Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </Box>
      </Box>

      {/* 收藏详情模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FiStar} color="yellow.500" />
              <Text>{selectedFavorite?.title}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  类型: {selectedFavorite?.type === 'conversation' ? 'AI对话' : 
                        selectedFavorite?.type === 'image' ? '图片生成' : 
                        selectedFavorite?.type === 'video' ? '视频生成' : '文档阅读'}
                </Text>
                <Text fontSize="sm" color="gray.500" mb={4}>
                  收藏时间: {selectedFavorite?.timestamp}
                </Text>
              </Box>
              
              {/* 如果是图片类型，在模态框中显示图片 */}
              {selectedFavorite?.type === 'image' && (
                (() => {
                  const imageUrlMatch = selectedFavorite.description.match(/图片链接:\s*([^\n]+)/);
                  const imageUrl = imageUrlMatch ? imageUrlMatch[1].trim() : null;
                  const referenceImageMatch = selectedFavorite.description.match(/(?:参考图片|原始图片):\s*([^\n]+)/);
                  const referenceImage = referenceImageMatch ? referenceImageMatch[1].trim() : null;
                  const isImg2Img = selectedFavorite.title.includes('图生图') || selectedFavorite.title.includes('图像编辑');
                  
                  return (
                    <VStack spacing={4} align="stretch">
                      {/* 如果是图生图或图像编辑，显示参考/原始图片 */}
                      {isImg2Img && referenceImage && (
                        <Box mb={4}>
                          <Text fontSize="md" fontWeight="bold" mb={2}>
                            {selectedFavorite.title.includes('图像编辑') ? '原始图片:' : '参考图片:'}
                          </Text>
                          <Image
                            src={referenceImage}
                            alt="参考图片"
                            borderRadius="md"
                            maxH="300px"
                            w="full"
                            objectFit="contain"
                          />
                        </Box>
                      )}
                      
                      {/* 显示生成的图片 */}
                      {imageUrl ? (
                        <Box mb={4}>
                          <Text fontSize="md" fontWeight="bold" mb={2}>
                            {selectedFavorite.title.includes('图像编辑') ? '编辑后的图片:' : '生成的图片:'}
                          </Text>
                          <Image
                            src={imageUrl}
                            alt="收藏的图片"
                            borderRadius="md"
                            maxH="400px"
                            w="full"
                            objectFit="contain"
                            fallback={
                              <Box
                                h="300px"
                                bg="gray.100"
                                borderRadius="md"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Text color="gray.500">图片加载失败</Text>
                              </Box>
                            }
                          />
                        </Box>
                      ) : (
                        <Box mb={4}>
                          <Text fontSize="md" fontWeight="bold" mb={2}>生成的图片:</Text>
                          <Box
                            h="300px"
                            bg="gray.100"
                            borderRadius="md"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text color="gray.500">图片链接已失效</Text>
                          </Box>
                        </Box>
                      )}
                    </VStack>
                  );
                })()
              )}
              
              {/* 如果是视频类型，在模态框中显示视频 */}
              {selectedFavorite?.type === 'video' && (
                (() => {
                  const videoUrlMatch = selectedFavorite.description.match(/视频链接:\s*([^\n]+)/);
                  const videoUrl = videoUrlMatch ? videoUrlMatch[1].trim() : null;
                  const referenceImageMatch = selectedFavorite.description.match(/参考图片:\s*([^\n]+)/);
                  const referenceImage = referenceImageMatch ? referenceImageMatch[1].trim() : null;
                  const isImg2Video = selectedFavorite.title.includes('图生视频');
                  
                  return (
                    <VStack spacing={4} align="stretch">
                      {/* 如果是图生视频，显示参考图片 */}
                      {isImg2Video && referenceImage && (
                        <Box mb={4}>
                          <Text fontSize="md" fontWeight="bold" mb={2}>参考图片:</Text>
                          <Image
                            src={referenceImage}
                            alt="参考图片"
                            borderRadius="md"
                            maxH="300px"
                            w="full"
                            objectFit="contain"
                          />
                        </Box>
                      )}
                      
                      {/* 显示生成的视频 */}
                      {videoUrl ? (
                        <Box mb={4}>
                          <HStack justify="space-between" align="center" mb={2}>
                            <Text fontSize="md" fontWeight="bold">生成的视频:</Text>
                            {videoUrl.startsWith('/uploads/') && (
                              <Badge colorScheme="green">永久保存</Badge>
                            )}
                            {videoUrl.startsWith('http') && !videoUrl.includes(window?.location?.hostname) && (
                              <Badge colorScheme="orange">外链可能过期</Badge>
                            )}
                          </HStack>
                          <video
                            src={videoUrl}
                            controls
                            style={{
                              width: '100%',
                              maxHeight: '400px',
                              borderRadius: '8px'
                            }}
                          />
                        </Box>
                      ) : (
                        <Box mb={4}>
                          <Text fontSize="md" fontWeight="bold" mb={2}>生成的视频:</Text>
                          <Box
                            h="300px"
                            bg="purple.100"
                            borderRadius="md"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            _dark={{ bg: 'purple.800' }}
                          >
                            <VStack>
                              <Icon as={FiVideo} size="60px" color="purple.500" />
                              <Text color="gray.500">视频暂时无法预览</Text>
                            </VStack>
                          </Box>
                        </Box>
                      )}
                    </VStack>
                  );
                })()
              )}
              
              <Box>
                <Text fontSize="md" fontWeight="bold" mb={2}>详细信息:</Text>
                <Box
                  p={4}
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  borderRadius="md"
                  maxH="300px"
                  overflowY="auto"
                >
                  <Text whiteSpace="pre-wrap">
                    {selectedFavorite?.type === 'image' 
                      ? selectedFavorite.description.replace(/图片链接:\s*[^\n]+\n?/, '').trim() // 移除图片链接部分
                      : selectedFavorite?.type === 'video'
                      ? selectedFavorite.description.replace(/视频链接:\s*[^\n]+\n?/, '').trim() // 移除视频链接部分
                      : selectedFavorite?.description
                    }
                  </Text>
                </Box>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              关闭
            </Button>
            <Button 
              variant="outline" 
              colorScheme="red"
              onClick={() => {
                if (selectedFavorite) {
                  handleDeleteFavorite(selectedFavorite.id);
                  onClose();
                }
              }}
            >
              删除收藏
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 批量删除确认对话框 */}
      <AlertDialog isOpen={isBatchDeleteOpen} onClose={onBatchDeleteClose} leastDestructiveRef={undefined}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {isSelectionMode ? '批量删除收藏' : '清空所有收藏'}
            </AlertDialogHeader>
            <AlertDialogBody>
              {isSelectionMode 
                ? `确定要删除选中的 ${selectedFavorites.length} 个收藏吗？此操作不可撤销。`
                : `确定要清空所有 ${favorites.length} 个收藏吗？此操作不可撤销。`
              }
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onBatchDeleteClose}>
                取消
              </Button>
              <Button 
                colorScheme="red" 
                onClick={isSelectionMode ? handleBatchDelete : handleClearAllFavorites} 
                ml={3}
              >
                确认删除
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SpacePage;