import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Flex,
  VStack,
  Text,
  IconButton,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Heading,
  Button,
  SimpleGrid,
  Icon,
  Badge,
  Image,
  AspectRatio,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Checkbox,
  Input,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react';
import { FiMoreVertical, FiMessageSquare, FiImage, FiBook, FiTrash2, FiEdit2, FiCheck, FiX, FiVideo } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ChatHistory } from '../types/chat';
import { 
  clearHistories, 
  deleteHistory, 
  renameHistory, 
  deleteMultipleHistories, 
  getHistories,
  getHistoriesAsync,
  historyEventBus
} from '../utils/storage';
import MobileNav from '../components/MobileNav';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const HistoryCard = ({ history, onDelete, onNavigate, onRename, isSelected, onSelect, isSelectionMode }) => {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [newTitle, setNewTitle] = useState(history.title);
  const { t } = useLanguage();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return FiMessageSquare;
      case 'draw':
        return FiImage;
      case 'read':
        return FiBook;
      case 'video':
        return FiVideo;
      default:
        return FiMessageSquare;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chat':
        return 'blue';
      case 'draw':
        return 'pink';
      case 'read':
        return 'green';
      case 'video':
        return 'purple';
      default:
        return 'gray';
    }
  };

  // 提取AI绘画生成的图片URL
  const getDrawImage = () => {
    if (history.type === 'draw' && history.messages.length > 1) {
      const aiResponse = history.messages[1].content;
      console.log('绘画历史记录内容:', aiResponse); // 调试日志
      
      // 尝试多种匹配模式
      const patterns = [
        /生成的图片：(https?:\/\/[^\s\n]+)/,
        /图片链接:\s*(https?:\/\/[^\s\n]+)/,
        /(https?:\/\/[^\s\n]*\.(?:png|jpg|jpeg|webp)[^\s\n]*)/,
        /(https?:\/\/dashscope-result[^\s\n]+)/
      ];
      
      for (const pattern of patterns) {
        const match = aiResponse.match(pattern);
        if (match) {
          console.log('找到图片URL:', match[1]);
          return match[1];
        }
      }
      
      console.log('未找到图片URL');
      return null;
    }
    return null;
  };

  // 提取AI视频生成的视频URL
  const getVideoUrl = () => {
    if (history.type === 'video' && history.messages.length > 1) {
      const aiMsg = history.messages[1];
      // 优先从videoUrl字段读取
      if (aiMsg.videoUrl) {
        return aiMsg.videoUrl;
      }
      const aiResponse = aiMsg.content;
      // 尝试多种匹配模式
      const patterns = [
        /视频链接:\s*(https?:\/\/[^\s\n]+)/,
        /生成的视频：(https?:\/\/[^\s\n]+)/,
        /(https?:\/\/[^\s\n]*\.mp4[^\s\n]*)/,
        /(https?:\/\/dashscope-result[^\s\n]+)/
      ];
      for (const pattern of patterns) {
        const match = aiResponse.match(pattern);
        if (match) {
          return match[1];
        }
      }
      return null;
    }
    return null;
  };

  const drawImageUrl = getDrawImage();
  const videoUrl = getVideoUrl();

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== history.title) {
      onRename(history.id, newTitle.trim());
    }
    onRenameClose();
  };

  const handleCardClick = () => {
    if (isSelectionMode) {
      onSelect(history.id);
    } else {
      onNavigate(history);
    }
  };

  return (
    <Box
      p={4}
      borderWidth={isSelected ? '2px' : '1px'}
      borderRadius="lg"
      bg={bgColor}
      borderColor={isSelected ? 'purple.500' : borderColor}
      transition="all 0.2s"
      _hover={{ 
        transform: isSelectionMode ? 'none' : 'translateY(-2px)', 
        shadow: 'md',
        zIndex: 1  // 防止hover时遮挡菜单
      }}
      cursor="pointer"
      onClick={handleCardClick}
      position="relative"
    >
      {/* 多选模式下的选择框 */}
      {isSelectionMode && (
        <Checkbox
          position="absolute"
          top={2}
          left={2}
          isChecked={isSelected}
          onChange={() => onSelect(history.id)}
          onClick={(e) => e.stopPropagation()}
          zIndex={1}
        />
      )}

      <Flex justify="space-between" align="center" mb={3}>
        <Flex align="center" gap={2}>
          <Icon as={getTypeIcon(history.type)} color={`${getTypeColor(history.type)}.500`} />
          <Badge colorScheme={getTypeColor(history.type)}>{history.type}</Badge>
        </Flex>
        {!isSelectionMode && (
          <Box position="relative" zIndex={1001}>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiMoreVertical />}
                variant="ghost"
                size="sm"
                aria-label={t('history.moreOptions')}
                onClick={(e) => e.stopPropagation()}
                position="relative"
                zIndex={1002}
              />
              <MenuList zIndex={1003}>
                <MenuItem icon={<FiEdit2 />} onClick={(e) => { e.stopPropagation(); onRenameOpen(); }}>
                  {t('history.rename')}
                </MenuItem>
                <MenuItem icon={<FiTrash2 />} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
                  {t('history.delete')}
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        )}
      </Flex>
      
      {/* 如果是绘画类型且有图片，显示预览图 */}
      {history.type === 'draw' && drawImageUrl && (
        <Box mb={3}>
          <AspectRatio ratio={1}>
            <Image
              src={drawImageUrl}
              alt="Generated artwork"
              objectFit="cover"
              borderRadius="md"
              onError={(e) => {
                console.error('图片加载失败:', drawImageUrl, e);
              }}
              onLoad={() => {
                console.log('图片加载成功:', drawImageUrl);
              }}
              fallback={
                <Box bg="gray.200" _dark={{ bg: 'gray.600' }} 
                     display="flex" alignItems="center" justifyContent="center">
                  <Icon as={FiImage} size="24px" color="gray.400" />
                </Box>
              }
            />
          </AspectRatio>
        </Box>
      )}
      
      {/* 如果是绘画类型但没有图片URL，显示占位符和调试信息 */}
      {history.type === 'draw' && !drawImageUrl && (
        <Box mb={3}>
          <AspectRatio ratio={1}>
            <Box bg="pink.100" _dark={{ bg: 'pink.800' }} 
                 display="flex" alignItems="center" justifyContent="center"
                 borderRadius="md"
                 flexDirection="column">
              <Icon as={FiImage} size="32px" color="pink.500" mb={2} />
              <Text fontSize="xs" color="pink.600" textAlign="center" px={2}>
                图片URL未找到
              </Text>
              {/* 调试信息 */}
              {process.env.NODE_ENV === 'development' && (
                <Text fontSize="10px" color="gray.500" textAlign="center" px={2} mt={1}>
                  消息数量: {history.messages.length}
                  {history.messages.length > 1 && (
                    <Text as="span" display="block">
                      内容: {history.messages[1].content.substring(0, 50)}...
                    </Text>
                  )}
                </Text>
              )}
            </Box>
          </AspectRatio>
        </Box>
      )}
      
      {/* 如果是视频类型且有视频，显示预览 */}
      {history.type === 'video' && videoUrl && (
        <Box mb={3}>
          <AspectRatio ratio={
            history.messages.length > 1 && history.messages[1].metadata?.aspectRatio === '9:16' ? 9/16 :
            history.messages.length > 1 && history.messages[1].metadata?.aspectRatio === '1:1' ? 1 :
            history.messages.length > 1 && history.messages[1].metadata?.aspectRatio === '4:3' ? 4/3 :
            16/9
          }>
            <video
              src={videoUrl}
              controls
              style={{
                borderRadius: '8px',
                objectFit: 'cover'
              }}
              onError={(e) => {
                console.error('视频加载失败:', videoUrl, e);
              }}
              onLoadStart={() => {
                console.log('视频开始加载:', videoUrl);
              }}
            />
          </AspectRatio>
        </Box>
      )}
      
      {/* 如果是视频类型但没有视频URL，显示占位符和调试信息 */}
      {history.type === 'video' && !videoUrl && (
        <Box mb={3}>
          <AspectRatio ratio={16/9}>
            <Box bg="purple.100" _dark={{ bg: 'purple.800' }} 
                 display="flex" alignItems="center" justifyContent="center"
                 borderRadius="md"
                 flexDirection="column">
              <Icon as={FiVideo} size="32px" color="purple.500" mb={2} />
              <Text fontSize="xs" color="purple.600" textAlign="center" px={2}>
                视频URL未找到
              </Text>
              {/* 调试信息 */}
              {process.env.NODE_ENV === 'development' && (
                <Text fontSize="10px" color="gray.500" textAlign="center" px={2} mt={1}>
                  消息数量: {history.messages.length}
                  {history.messages.length > 1 && (
                    <Text as="span" display="block">
                      内容: {history.messages[1].content.substring(0, 50)}...
                    </Text>
                  )}
                </Text>
              )}
            </Box>
          </AspectRatio>
        </Box>
      )}
      
      <Text fontWeight="bold" noOfLines={2} mb={2}>
        {history.title}
      </Text>
      <Text fontSize="sm" color="gray.500">
        {new Date(history.timestamp).toLocaleString()}
      </Text>

      {/* 重命名对话框 */}
      <Modal isOpen={isRenameOpen} onClose={onRenameClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('history.renameTitle')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('history.renamePlaceholderNew')}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRenameClose}>
              {t('common.cancel')}
            </Button>
            <Button colorScheme="purple" onClick={handleRename}>
              {t('common.confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除确认对话框 */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('history.deleteConfirm')}
            </AlertDialogHeader>

            <AlertDialogBody>
              {t('history.deleteConfirmText')}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="red" onClick={() => { onDelete(); onClose(); }} ml={3}>
                {t('history.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default function History() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const { isOpen: isClearAllOpen, onOpen: onClearAllOpen, onClose: onClearAllClose } = useDisclosure();
  const { isOpen: isBatchDeleteOpen, onOpen: onBatchDeleteOpen, onClose: onBatchDeleteClose } = useDisclosure();
  const clearAllCancelRef = useRef<HTMLButtonElement>(null);
  const batchDeleteCancelRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();
  const { user } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const updateIntervalRef = useRef<number>(30000); // 30秒更新一次

  // 获取历史记录的函数
  const loadHistories = async (forceSync = false) => {
    if (!user) {
      setHistories([]);
      setLoading(false);
      return;
    }

    const now = Date.now();
    // 如果不是强制同步且距离上次更新时间不足30秒，则不更新
    if (!forceSync && now - lastUpdateRef.current < updateIntervalRef.current) {
      return;
    }
    
    // 立即从本地获取历史记录并显示
    const localHistories = getHistories();
    setHistories(localHistories);
    setLoading(false);
    lastUpdateRef.current = now;
    
    // 在后台异步更新数据库数据
    try {
      const dbHistories = await getHistoriesAsync();
      if (dbHistories && dbHistories.length > 0 && JSON.stringify(dbHistories) !== JSON.stringify(localHistories)) {
        setHistories(dbHistories);
        lastUpdateRef.current = now;
      }
    } catch (error) {
      console.error('后台同步历史记录失败:', error);
    }
  };

  useEffect(() => {
    // 如果用户未登录，直接设置空状态
    if (!user) {
      setHistories([]);
      setLoading(false);
      return;
    }

    // 如果用户已登录，立即加载本地历史记录
    const localHistories = getHistories();
    setHistories(localHistories);
    setLoading(false);

    // 仅在首次加载时异步同步数据库数据
    loadHistories(false);

    // 监听历史记录更新事件
    const unsubscribe = historyEventBus.subscribe(() => {
      const now = Date.now();
      // 如果距离上次更新时间不足30秒，则不更新
      if (now - lastUpdateRef.current < updateIntervalRef.current) {
        return;
      }
      const updatedHistories = getHistories();
      setHistories(updatedHistories);
      lastUpdateRef.current = now;
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleClearAll = () => {
    clearHistories();
    setHistories([]);
    toast({
      title: t('history.clearSuccess'),
      status: 'success',
      duration: 2000,
    });
    onClearAllClose();
  };

  const handleDeleteHistory = (id: string) => {
    deleteHistory(id);
    const updatedHistories = getHistories();
    setHistories(updatedHistories);
    toast({
      title: t('history.deleteSuccess'),
      status: 'success',
      duration: 2000,
    });
  };

  const handleRenameHistory = (id: string, newTitle: string) => {
    renameHistory(id, newTitle);
    const updatedHistories = getHistories();
    setHistories(updatedHistories);
    toast({
      title: t('history.renameSuccess'),
      status: 'success',
      duration: 2000,
    });
  };

  const handleSelectHistory = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === histories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(histories.map(h => h.id));
    }
  };

  const handleBatchDelete = () => {
    deleteMultipleHistories(selectedIds);
    const updatedHistories = getHistories();
    setHistories(updatedHistories);
    setSelectedIds([]);
    setIsSelectionMode(false);
    toast({
      title: t('history.batchDeleteSuccess', { count: selectedIds.length.toString() }),
      status: 'success',
      duration: 2000,
    });
    onBatchDeleteClose();
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleNavigateToHistory = (history: ChatHistory) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingHistory', JSON.stringify(history));
    }
    
    if (history.type === 'chat' || history.type === 'read') {
      // 对话类型和文档类型都跳转到首页进行对话
      if (router.pathname === '/') {
        // 直接本地还原（触发index页的useEffect）
        window.location.reload(); // 强制刷新首页以触发pendingHistory逻辑
      } else {
        router.push('/'); // 跳转到首页，不带参数
      }
    } else if (history.type === 'draw') {
      const userMessage = history.messages[0]?.content || '';
      const modelParts = history.model.split('-');
      const style = modelParts[0] || 'realistic';
      router.push({
        pathname: '/draw',
        query: { 
          loadHistory: history.id,
          prompt: userMessage,
          style: style
        }
      });
    } else if (history.type === 'video') {
      const userMessage = history.messages[0]?.content || '';
      router.push({
        pathname: '/video',
        query: { 
          loadHistory: history.id,
          prompt: userMessage
        }
      });
    }
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <MobileNav onNewChat={() => {}} onClearHistory={handleClearAll} />
      <Box display={{ base: 'none', md: 'block' }}>
        <Sidebar onNewChat={() => {}} onClearHistory={handleClearAll} />
      </Box>
      <Header />
      <Box
        ml={{ base: '0', md: '250px' }}
        pt={{ base: "60px", md: "60px" }}
        transition="margin-left 0.2s"
      >
        <Box maxW="1200px" mx="auto">
          <VStack spacing={8} p={{ base: 4, md: 8 }} align="stretch">
            <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
              <Heading size="lg">{t('history.title')}</Heading>
              <HStack spacing={3}>
                {isSelectionMode ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAll}
                      leftIcon={<Icon as={FiCheck} />}
                    >
                      {selectedIds.length === histories.length ? t('history.cancelSelect') : t('history.selectAll')}
                    </Button>
                    {selectedIds.length > 0 && (
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={onBatchDeleteOpen}
                        leftIcon={<Icon as={FiTrash2} />}
                      >
                        {t('history.deleteSelected')} ({selectedIds.length})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleToggleSelectionMode}
                      leftIcon={<Icon as={FiX} />}
                    >
                      {t('history.cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleToggleSelectionMode}
                      leftIcon={<Icon as={FiCheck} />}
                    >
                      {t('history.multiSelect')}
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<Icon as={FiTrash2} />}
                      colorScheme="red"
                      variant="ghost"
                      onClick={onClearAllOpen}
                    >
                      {t('history.clearAll')}
                    </Button>
                  </>
                )}
              </HStack>
            </Flex>
            
            {loading ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} height="200px" borderRadius="lg" />
                ))}
              </SimpleGrid>
            ) : histories.length === 0 ? (
              <Box textAlign="center" py={10}>
                <Text fontSize="lg" color="gray.500" mb={4}>
                  {user ? t('history.noHistory') : t('history.pleaseLoginFirst')}
                </Text>
                {user && (
                  <Button 
                    colorScheme="purple" 
                    onClick={() => router.push('/')}
                  >
                    {t('history.startNewChat')}
                  </Button>
                )}
              </Box>
            ) : (
              <SimpleGrid 
                columns={{ base: 1, md: 2, lg: 3 }} 
                spacing={6}
                w="100%"
                overflowX="hidden"
              >
                {histories.map((item) => (
                  <HistoryCard
                    key={item.id}
                    history={item}
                    onDelete={() => handleDeleteHistory(item.id)}
                    onNavigate={handleNavigateToHistory}
                    onRename={handleRenameHistory}
                    isSelected={selectedIds.includes(item.id)}
                    onSelect={handleSelectHistory}
                    isSelectionMode={isSelectionMode}
                  />
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </Box>
      </Box>

      {/* 批量删除确认对话框 */}
      <AlertDialog
        isOpen={isBatchDeleteOpen}
        leastDestructiveRef={batchDeleteCancelRef}
        onClose={onBatchDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('history.batchDeleteConfirm')}
            </AlertDialogHeader>

            <AlertDialogBody>
              {t('history.batchDeleteConfirmText', { count: selectedIds.length.toString() })}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={batchDeleteCancelRef} onClick={onBatchDeleteClose}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleBatchDelete} ml={3}>
                {t('common.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* 清除所有历史记录确认对话框 */}
      <AlertDialog
        isOpen={isClearAllOpen}
        leastDestructiveRef={clearAllCancelRef}
        onClose={onClearAllClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('history.clearAllConfirm')}
            </AlertDialogHeader>

            <AlertDialogBody>
              {t('history.clearAllConfirmText')}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={clearAllCancelRef} onClick={onClearAllClose}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleClearAll} ml={3}>
                {t('history.clearAll')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 