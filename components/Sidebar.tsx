import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  VStack,
  Text,
  Icon,
  Flex,
  IconButton,
  useColorModeValue,
  Image,
  Heading,
  Divider,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
} from '@chakra-ui/react';
import { FaRobot, FaBook, FaPlus, FaUserCircle, FaHistory, FaTrash, FaPaintBrush, FaVideo } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiMessageSquare, FiMoreVertical, FiTrash2, FiEdit2, FiImage, FiBook, FiVideo, FiDatabase } from 'react-icons/fi';
import { ChatHistory } from '../types/chat';
import { getHistories, clearHistories, deleteHistory, updateHistory } from '../utils/storage';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  showAddButton?: boolean;
  onAdd?: () => void;
  onClear?: () => void;
  showClearButton?: boolean;
  t?: (key: string) => string;
}

const NavItem: React.FC<NavItemProps> = ({
  href,
  icon,
  children,
  showAddButton,
  onAdd,
  onClear,
  showClearButton,
  t
}) => {
  const router = useRouter();
  const isActive = router.pathname === href;
  const hoverBgColor = useColorModeValue('gray.100', 'gray.600');
  const activeBgColor = useColorModeValue('gray.200', 'gray.700');
  const { user } = useAuth();
  const toast = useToast();

  const handleNavClick = () => {
    // 如果是历史记录页面，需要检查登录状态
    if (href === '/history' && !user) {
      toast({
        title: '请先登录',
        description: '登录后即可查看历史记录',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    router.push(href);
  };

  return (
      <Flex 
        align="center" 
      justify="space-between"
      p={3}
        borderRadius="md" 
      cursor="pointer"
      bg={isActive ? activeBgColor : 'transparent'}
      _hover={{ bg: hoverBgColor }}
      onClick={handleNavClick}
      role="group"
    >
      <Flex align="center" flex={1}>
        <Icon as={icon} mr={3} />
        <Text display={{ base: 'none', md: 'block' }}>{children}</Text>
      </Flex>
      {showAddButton && (
        <IconButton
          aria-label={t('session.newButton')}
          icon={<FaPlus />}
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onAdd?.();
          }}
          opacity={{ base: 1, md: 0 }}
          _groupHover={{ opacity: 1 }}
          display={{ base: 'flex', md: 'flex' }}
        />
      )}
      {showClearButton && (
        <IconButton
          aria-label="清除所有历史记录"
          icon={<FaTrash />}
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onClear?.();
          }}
          opacity={{ base: 1, md: 0 }}
          _groupHover={{ opacity: 1 }}
          display={{ base: 'flex', md: 'flex' }}
        />
      )}
    </Flex>
  );
};

interface SidebarProps {
  onNewChat?: () => void;
  onNewDraw?: () => void;
  onNewRead?: () => void;
  onNewVideo?: () => void;
  onLoadChat?: (history: ChatHistory) => void;
  onClearHistory: () => void;
  onUpdateHistory?: (history: ChatHistory) => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  onNewChat,
  onNewDraw,
  onNewRead,
  onNewVideo,
  onLoadChat,
  onClearHistory,
  onUpdateHistory,
  isMobile = false
}) => {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ChatHistory | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [deleteHistoryId, setDeleteHistoryId] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isClearOpen, onOpen: onClearOpen, onClose: onClearClose } = useDisclosure();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
  const router = useRouter();
  const lastUpdateRef = useRef<number>(0);
  const updateIntervalRef = useRef<number>(30000); // 30秒更新一次

  useEffect(() => {
    const loadHistories = async () => {
      if (!user) {
        setHistories([]);
        return;
      }

      // 首次加载时获取本地历史记录（快速显示）
      const localHistories = getHistories();
      setHistories(localHistories);
      
      try {
        // 异步获取合并后的历史记录（本地 + 数据库）
        const { getHistoriesAsync } = await import('../utils/storage');
        const mergedHistories = await getHistoriesAsync();
        // 只有当合并后的历史记录与当前显示的不同时才更新
        if (JSON.stringify(mergedHistories) !== JSON.stringify(histories)) {
          setHistories(mergedHistories);
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
      }
    };

    loadHistories();

    // 监听历史记录更新事件
    const { historyEventBus } = require('../utils/storage');
    const unsubscribe = historyEventBus.subscribe(async () => {
      try {
        // 当收到更新事件时，重新获取合并后的历史记录
        const { getHistoriesAsync } = await import('../utils/storage');
        const mergedHistories = await getHistoriesAsync();
        setHistories(mergedHistories);
      } catch (error) {
        console.error('更新历史记录失败:', error);
        // 如果获取合并记录失败，至少更新本地记录
        const localHistories = getHistories();
        setHistories(localHistories);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]); // 只在用户状态改变时重新加载

  const handleClearHistory = async () => {
    try {
      await onClearHistory();
      toast({
        title: t('history.clearSuccess'),
        status: 'success',
        duration: 2000,
      });
      onClearClose();
    } catch (error) {
      console.error('清除历史记录失败:', error);
      toast({
        title: t('history.clearFailed'),
        status: 'error',
        duration: 2000,
      });
    }
  };

  const handleLoadChat = (history: ChatHistory) => {
    if (!checkLoginStatus()) return;
    if (history.type === 'chat') {
      if (router.pathname === '/' && onLoadChat) {
        onLoadChat(history);
      } else {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pendingHistory', JSON.stringify(history));
        }
        router.push('/');
      }
    } else if (history.type === 'draw') {
      router.push({
        pathname: '/draw',
        query: { loadHistory: history.id }
      });
    } else if (history.type === 'read') {
      router.push({
        pathname: '/read',
        query: { loadHistory: history.id }
      });
    } else if (history.type === 'video') {
      // 修复：Google Veo 3模型历史点击后自动跳转gen3页面并还原视频
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingVideoHistory', JSON.stringify(history));
        console.log('保存video历史记录到sessionStorage:', history.id);
      }
      // 判断是否为Google Veo 3模型
      if (history.model && history.model.includes('Google Veo 3')) {
        router.push({
          pathname: '/video',
          query: { loadHistory: history.id, type: 'video', modelType: 'gen3' }
        });
      } else {
        router.push({
          pathname: '/video',
          query: { loadHistory: history.id, type: 'video' }
        });
      }
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      // 动态导入存储函数
      const { deleteHistory } = await import('../utils/storage');
      await deleteHistory(id);
      
      // 重新获取最新的历史记录
      const updatedHistories = getHistories();
      setHistories(updatedHistories);
      
      toast({
        title: t('history.deleteSuccess'),
        status: 'success',
        duration: 2000,
      });
      setDeleteHistoryId(null);
      onDeleteClose();
    } catch (error) {
      console.error('删除历史记录失败:', error);
      toast({
        title: t('history.deleteFailed'),
        status: 'error',
        duration: 2000,
      });
    }
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteHistoryId(id);
    onDeleteOpen();
  };

  const handleRename = (history: ChatHistory) => {
    setSelectedHistory(history);
    setNewTitle(history.title);
    onOpen();
  };

  const handleSaveRename = async () => {
    if (selectedHistory && newTitle.trim()) {
      const updatedHistory = { ...selectedHistory, title: newTitle.trim() };
      // 动态导入存储函数
      const { updateHistory } = await import('../utils/storage');
      updateHistory(updatedHistory);
      // 重新获取最新的历史记录
      const updatedHistories = getHistories();
      setHistories(updatedHistories);
      if (onUpdateHistory) {
        onUpdateHistory(updatedHistory);
      }
      onClose();
    }
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // 检查登录状态的函数
  const checkLoginStatus = () => {
    if (!user) {
      onLoginOpen();
      toast({
        title: '请先登录',
        description: '登录后即可查看历史记录',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }
    return true;
  };

  return (
    <>
    <Box 
        as="nav"
        pos={isMobile ? "static" : "fixed"}
        top={0}
        left={0}
        h={isMobile ? "auto" : "100vh"}
        w={isMobile ? "full" : { base: '60px', md: '250px' }}
        bg={useColorModeValue('gray.50', 'gray.900')}
        borderRight={isMobile ? "none" : "1px"}
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        zIndex={30}
        transition="width 0.2s"
        p={4}
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
            height: '0px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.1)'),
            borderRadius: '24px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: useColorModeValue('rgba(0,0,0,0.2)', 'rgba(255,255,255,0.2)'),
          },
        }}
    >
        {/* Logo - 在移动端不显示，因为已经在顶部显示了 */}
        {!isMobile && (
          <Flex align="center" justify="flex-start" h="60px" mb={4}>
        <Image src="/images/logo.png" alt="BrainBox Logo" boxSize="40px" />
            <Heading
              as="h1"
              size="md"
              ml={2}
              display={{ base: 'none', md: 'block' }}
            >
          BrainBox
        </Heading>
      </Flex>
        )}

        <VStack spacing={4} align="stretch">
          <NavItem
            href="/"
            icon={FaRobot}
            showAddButton={!!onNewChat}
            onAdd={onNewChat}
            t={t}
          >
            {t('nav.aiChat')}
          </NavItem>
          <NavItem
            href="/draw"
            icon={FaPaintBrush}
            showAddButton={!!onNewDraw}
            onAdd={onNewDraw}
            t={t}
          >
            {t('nav.aiDraw')}
          </NavItem>
          <NavItem
            href="/read"
            icon={FaBook}
            showAddButton={!!onNewRead}
            onAdd={onNewRead}
            t={t}
          >
            {t('nav.aiRead')}
          </NavItem>
          <NavItem
            href="/video"
            icon={FaVideo}
            showAddButton={!!onNewVideo}
            onAdd={onNewVideo}
            t={t}
          >
            {t('nav.aiVideo')}
          </NavItem>
        </VStack>

        <Divider my={4} />

        <VStack spacing={4} align="stretch">
          <NavItem
            href="/space"
            icon={FaUserCircle}
            t={t}
          >
            {t('nav.space')}
          </NavItem>
          <NavItem
            href="/history"
            icon={FaHistory}
            showClearButton
            onClear={onClearOpen}
            t={t}
          >
            {t('nav.history')}
          </NavItem>
        </VStack>

      <Divider my={4} />

        <VStack spacing={2} align="stretch">
          {histories.map((history) => {
            // 根据历史记录类型选择图标
            const getHistoryIcon = (type: string) => {
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

            return (
              <Box
                key={history.id}
                p={2}
                borderRadius="md"
                _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                cursor="pointer"
                position="relative"
              >
                <Flex align="center" justify="space-between">
                  <Button
                    variant="ghost"
                    w="full"
                    justifyContent="flex-start"
                    onClick={() => handleLoadChat(history)}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    pr={8}
                  >
                    <Icon as={getHistoryIcon(history.type || 'chat')} mr={{ base: 0, md: 2 }} />
                    <Text display={{ base: 'none', md: 'block' }} fontSize="sm">
                      {history.title}
                    </Text>
                  </Button>
                  <Box position="relative">
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        aria-label={t('history.moreOptions')}
                        display="flex"
                        _hover={{ bg: useColorModeValue('gray.200', 'gray.500') }}
                        color={useColorModeValue('gray.600', 'gray.400')}
                        borderRadius="full"
                        zIndex={2}
                      />
                      <MenuList>
                        <MenuItem icon={<FiEdit2 />} onClick={() => handleRename(history)}>
                          {t('history.rename')}
                        </MenuItem>
                        <MenuItem icon={<FiTrash2 />} onClick={() => handleDeleteConfirm(history.id)} color="red.500">
                          {t('history.delete')}
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </VStack>
    </Box>

      {/* 重命名对话框 */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('history.rename')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('history.renamePlaceholder')}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button colorScheme="purple" onClick={handleSaveRename}>
              {t('common.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除历史记录确认对话框 */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={deleteRef}
        onClose={onDeleteClose}
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
              <Button ref={deleteRef} onClick={onDeleteClose}>
                {t('common.cancel')}
              </Button>
              <Button 
                colorScheme="red" 
                onClick={() => deleteHistoryId && handleDeleteChat(deleteHistoryId)} 
                ml={3}
              >
                {t('history.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* 清除所有历史记录确认对话框 */}
      <AlertDialog
        isOpen={isClearOpen}
        leastDestructiveRef={clearRef}
        onClose={onClearClose}
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
              <Button ref={clearRef} onClick={onClearClose}>
                {t('common.cancel')}
              </Button>
              <Button colorScheme="red" onClick={handleClearHistory} ml={3}>
                {t('history.clearAll')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};

export default Sidebar; 