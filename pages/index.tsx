import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  Heading,
  SimpleGrid,
  Button,
  Icon,
  useColorModeValue,
  Flex,
  Tag,
  Avatar,
  useDisclosure,
  useToast,
  Spinner,
  Text,
  HStack,
  Badge,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { FiEdit, FiGlobe, FiMapPin, FiFileText, FiFilm, FiRefreshCw, FiVideo, FiTrash2 } from 'react-icons/fi';
import { FaTimes } from 'react-icons/fa';
import { Message, ChatMode, ChatHistory } from '../types/chat';
import ChatInput from '../components/ChatInput';
import MobileNav from '../components/MobileNav';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChatMessage from '../components/ChatMessage';
import WriteView from '../components/ChatModes/WriteView';
import TranslateView from '../components/ChatModes/TranslateView';
import TravelView from '../components/ChatModes/TravelView';
import ScriptView from '../components/ChatModes/ScriptView';
import ModelModal from '../components/ModelModal';
import ModelDropdown from '../components/ModelDropdown';
import { LoginModal } from '../components/LoginModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { saveSessionHistory, updateSessionHistory, getHistories } from '../utils/storage';
import { pageStateManager } from '../utils/pageState';
import { useRouter } from 'next/router';
import VideoView from '../components/VideoView';

const models = [
  { name: 'DeepSeek-R1-0528', displayName: 'DeepSeek R1 0528', logo: '/images/deepseek.png' },
  { name: 'GPT-3.5-Turbo', displayName: 'GPT-3.5 Turbo', logo: '/images/Chat.jpg' },
  { name: 'Claude-3.5-Sonnet', displayName: 'Claude 3.5 Sonnet', logo: '/images/claude.png' },
  { name: 'Gemini-1.5-Pro', displayName: 'Gemini 1.5 Pro', logo: '/images/gemini.png' },
  { name: 'Llama-3.1-70B', displayName: 'Llama 3.1 70B', logo: '/images/llama.png' },
  { name: 'Qwen-Plus', displayName: 'Qwen Plus', logo: '/images/qwen.png' },
  { name: 'Grok-Beta', displayName: 'Grok Beta', logo: '/images/grok.png' },
];

// 额外的模型名称映射，确保兼容性
const modelNameMapping: { [key: string]: string } = {
  'GPT-4': 'GPT-3.5-Turbo',
  'GPT-4-Turbo': 'GPT-3.5-Turbo',
  'GPT-4o': 'GPT-3.5-Turbo',
  'GPT-4.5-Turbo': 'GPT-3.5-Turbo',
  'Claude-3-Opus': 'Claude-3.5-Sonnet',
  'Claude-3-Sonnet': 'Claude-3.5-Sonnet',
  'Claude-3-Haiku': 'Claude-3.5-Sonnet',
  'Claude-3.5-Opus': 'Claude-3.5-Sonnet',
  'Claude-3.7-Sonnet': 'Claude-3.5-Sonnet',
  'Gemini-1.5-Flash': 'Gemini-1.5-Pro',
  'Gemini-1.0-Ultra': 'Gemini-1.5-Pro',
  'Gemini-2.5-Flash': 'Gemini-1.5-Pro',
  'Gemini-2.5-Pro': 'Gemini-1.5-Pro',
  'Llama-3.1-8B': 'Llama-3.1-70B',
  'Llama-3-70B-Instruct': 'Llama-3.1-70B',
  'Code-Llama-70B': 'Llama-3.1-70B',
  'Llama-3.1-405B': 'Llama-3.1-70B',
  'DeepSeek-R1-Lite': 'DeepSeek-R1-0528',
  'DeepSeek-V3': 'DeepSeek-R1-0528',
  'Grok-1.5': 'Grok-Beta',
  'Grok-2': 'Grok-Beta',
  'Qwen-Turbo': 'Qwen-Plus',
  'Qwen-Max': 'Qwen-Plus',
};

// 高级模型列表（20积分）
const advancedModels = [
  'DeepSeek-V3',
  'GPT-4.5-Turbo', 
  'Claude-3.7-Sonnet',
  'Claude-3.7-Opus',
  'Claude-4',
  'Gemini-2.5-Flash',
  'Gemini-2.5-Pro',
  'Llama-3.1-405B',
  'Grok-Beta',
  'Grok-2-Pro',
  'Qwen-Plus',
  'Qwen-Max-Pro'
];

// 判断模型类型
const getModelType = (modelName: string): 'basic' | 'advanced' => {
  return advancedModels.includes(modelName) ? 'advanced' : 'basic';
};

// 获取模型头像的函数
const getModelAvatar = (modelName: string): string => {
  // 首先尝试直接匹配
  let model = models.find(m => m.name === modelName);
  
  // 如果没找到，尝试使用映射
  if (!model && modelNameMapping[modelName]) {
    model = models.find(m => m.name === modelNameMapping[modelName]);
  }
  
  // 如果还是没找到，尝试模糊匹配
  if (!model) {
    model = models.find(m => 
      modelName.toLowerCase().includes(m.name.toLowerCase().split('-')[0]) ||
      m.name.toLowerCase().includes(modelName.toLowerCase().split('-')[0])
    );
  }
  
  return model?.logo || '/images/ai-avatar.png';
};

// 获取模型显示名称的函数
const getModelDisplayName = (modelName: string): string => {
  // 首先尝试直接匹配
  let model = models.find(m => m.name === modelName);
  
  // 如果没找到，尝试使用映射
  if (!model && modelNameMapping[modelName]) {
    model = models.find(m => m.name === modelNameMapping[modelName]);
  }
  
  // 如果还是没找到，尝试模糊匹配
  if (!model) {
    model = models.find(m => 
      modelName.toLowerCase().includes(m.name.toLowerCase().split('-')[0]) ||
      m.name.toLowerCase().includes(modelName.toLowerCase().split('-')[0])
    );
  }
  
  return model?.displayName || modelName;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('DeepSeek-R1-0528');
  const [chatMode, setChatMode] = useState<ChatMode>('default');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const currentSessionIdRef = useRef<string>('');
  const [isNewSession, setIsNewSession] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
  const toast = useToast();
  const router = useRouter();
  const { t } = useLanguage();

  const { addFavorite, addActivity, userStats, getUserQuota, checkFreeQuotaExceeded, getRemainingFreeQuota } = useUserActivity();
  const { user } = useAuth();
  const isHistoryRestored = useRef(false);

  // 判断是否免费用户
  const isFreeUser = getUserQuota('conversation') !== Infinity;
  const freeQuota = getUserQuota('conversation');
  const freeUsed = userStats.free_conversations_used;
  const creditCost = getModelType(selectedModel) === 'advanced' ? 20 : 5;

  // 添加防抖计时器引用
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRestoreRef = useRef<number>(0);

  // 页面状态变化时自动保存 - 添加防抖机制
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);
  
  useEffect(() => {
    if (isHistoryRestored.current) return; // 历史还原后不自动保存

    if (user) {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const now = Date.now();
      // 防抖机制：1秒内只保存一次状态
      if (now - lastSaveRef.current < 1000) {
        saveTimeoutRef.current = setTimeout(() => {
          lastSaveRef.current = Date.now();
          saveCurrentState();
        }, 1000);
        return;
      }

      lastSaveRef.current = now;
      saveCurrentState();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, selectedModel, inputValue, currentSessionId, chatMode, user]);

  useEffect(() => {
    const history = localStorage.getItem('search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
    
    // 检查认证错误
    const { auth_error } = router.query;
    if (auth_error && typeof auth_error === 'string') {
      toast({
        title: '登录失败',
        description: decodeURIComponent(auth_error),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // 清除URL参数
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.query.auth_error, toast]);

  // 单独的useEffect处理历史记录加载
  useEffect(() => {
    // 检查是否需要加载历史记录
    const { loadHistory } = router.query;
    let targetHistory = null;
    // 优先从sessionStorage读取完整历史对象
    if (typeof window !== 'undefined') {
      const pending = sessionStorage.getItem('pendingHistory');
      const pendingLoad = sessionStorage.getItem('pendingHistoryLoad');
      if (pending) {
        targetHistory = JSON.parse(pending);
        sessionStorage.removeItem('pendingHistory');
      } else if (pendingLoad) {
        targetHistory = JSON.parse(pendingLoad);
        sessionStorage.removeItem('pendingHistoryLoad');
      }
    }
    if (!targetHistory && loadHistory && typeof loadHistory === 'string') {
      const histories = getHistories();
      targetHistory = histories.find(h => h.id === loadHistory);
    }
    if (targetHistory && (targetHistory.type === 'chat' || targetHistory.type === 'read')) {
      console.log(t('history.loadingHistory'));
      console.log(t('history.targetHistoryId', { id: targetHistory.id }));
      console.log(t('history.historyType', { type: targetHistory.type }));
      console.log(t('history.historyMessages', { length: targetHistory.messages.length }));

      // 如果是阅读类型的历史记录，重定向到阅读页面
      if (targetHistory.type === 'read') {
        console.log('检测到阅读类型历史记录，重定向到阅读页面');
        router.push({
          pathname: '/read',
          query: { loadHistory: targetHistory.id }
        });
        return;
      }

      // 检查是否是相同的历史记录，避免重复加载和刷新
      if (currentSessionIdRef.current === targetHistory.id && messages.length === targetHistory.messages.length) {
        console.log('相同历史记录，跳过加载');
        // 清除URL参数但不重复加载
        router.replace('/', undefined, { shallow: true });
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('newChatSession');
        sessionStorage.removeItem('fromOtherPage');
        sessionStorage.setItem('loadingHistory', 'true');
        // 设置选择的历史记录ID标记
        sessionStorage.setItem('selectedHistoryId', targetHistory.id);
      }
      pageStateManager.clearPageState('chat');
      // 恢复历史记录时，自动切换到对应特殊模式
      let restoredMode: ChatMode = 'default';
      if (targetHistory.model && [
        '帮我写作', '快速翻译', '旅游规划', '影视剧本'
      ].some(modeName => targetHistory.model.includes(modeName))) {
        if (targetHistory.model.includes('帮我写作')) restoredMode = 'write';
        else if (targetHistory.model.includes('快速翻译')) restoredMode = 'translate';
        else if (targetHistory.model.includes('旅游规划')) restoredMode = 'travel';
        else if (targetHistory.model.includes('影视剧本')) restoredMode = 'script';
      }
      setMessages(targetHistory.messages);
      setSelectedModel(targetHistory.model || 'DeepSeek-R1-0528');
      setChatMode(restoredMode as ChatMode);
      setIsLoading(false);
      setStreamingMessage('');
      setIsNewSession(false);
      setCurrentSessionId(targetHistory.id);
      currentSessionIdRef.current = targetHistory.id;
      isHistoryRestored.current = true;
      console.log('设置完成，当前会话ID:', targetHistory.id);
      console.log('当前消息数量:', targetHistory.messages.length);
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('loadingHistory');
        }
      }, 100);
      console.log('=== 历史记录加载完成 ===');
      
      // 清除URL参数，避免重复触发
      router.replace('/', undefined, { shallow: true });

      toast({
        title: t('history.restored'),
        description: `${t('history.restored')} ${t('history.chat')} - ${targetHistory.messages.length} ${t('history.records')}`,
        status: 'success',
        duration: 1500,
      });
    }
  }, [router.query.loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 页面加载状态恢复的useEffect
  useEffect(() => {
    console.log('=== 页面加载状态恢复 useEffect 开始 ===');
    console.log('用户状态:', user);
    console.log('查询参数:', router.query);

    // 如果有新建对话状态，不进行状态恢复
    if (typeof window !== 'undefined') {
      const newChatSessionFlag = sessionStorage.getItem('newChatSession');
      console.log('newChatSession标记:', newChatSessionFlag);

      if (newChatSessionFlag === 'true') {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('newChatSession');
        }
        console.log('检测到新建对话状态，已重置聊天界面');
        return;
      }
    }
    console.log('=== 页面加载状态恢复 useEffect 结束 ===');
  }, [user, router.query.loadHistory]);

  // 监听认证状态变化
  useEffect(() => {
    if (isHistoryRestored.current) return;
    const handleAuthStateChange = () => {
      if (!user) {
        setMessages([])
        setCurrentSessionId(null)
        currentSessionIdRef.current = null
        setIsLoading(false)
        setStreamingMessage('')
        setInputValue('')
        sessionStorage.removeItem('newChatSession');
      }
    }
    window.addEventListener('auth-state-changed', handleAuthStateChange)

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChange)
    }
  }, [user])

  // 监听历史记录更新事件
  useEffect(() => {

    if (isHistoryRestored.current) return;
    const handleHistoryUpdate = () => {

      if (currentSessionId) {
        const histories = getHistories();
        const currentHistory = histories.find(h => h.id === currentSessionId);
        if (!currentHistory) {
          setMessages([]);
          setCurrentSessionId('');
          currentSessionIdRef.current = '';
          setIsNewSession(true);
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleHistoryUpdate);
      const interval = setInterval(handleHistoryUpdate, 1000);

      return () => {
        window.removeEventListener('storage', handleHistoryUpdate);
        clearInterval(interval);
      };
    }
  }, [currentSessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // 检查用户是否已登录
    if (!user) {
      onLoginOpen();
      toast({
        title: '请先登录',
        description: '登录后即可使用AI聊天功能',
        status: 'warning',
        duration: 3000,
      });
      return;
    }


    // 新增：免费额度判断（基于数据库存储的免费额度）
    if (checkFreeQuotaExceeded('conversation')) {
      const remaining = getRemainingFreeQuota('conversation');
      toast({
        title: '已达免费对话上限',
        description: `您已用完 ${userStats.free_conversations_limit} 次免费对话，请开通会员享受更多权益`,

        status: 'warning',
        duration: 4000,
      });
      return;
    }

    const newMessage: Message = {
      content: inputValue,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    const currentMessages = [...messages, newMessage];
    setMessages(currentMessages);
    
    // 保存到搜索历史
    const updatedHistory = [inputValue, ...searchHistory.filter(item => item !== inputValue)].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('search_history', JSON.stringify(updatedHistory));
    
    setInputValue('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // 使用流式响应
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.content
          })),
          model: selectedModel,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let aiContent = '';

      // 添加一个占位的AI消息
      const aiMessage: Message = {
        content: '',
        isUser: false,
        timestamp: new Date().toISOString(),
        avatar: getModelAvatar(selectedModel),
        modelName: getModelDisplayName(selectedModel),
      };
      setMessages(prev => [...prev, aiMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

                        for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    // 完成后保存对话历史
                    const finalMessages = [...currentMessages, { ...aiMessage, content: aiContent }];
                    setMessages(finalMessages);
                    
                    // 添加对话活动记录
                    console.log('=== 准备添加对话活动记录 ===');
                    console.log('用户信息:', user);
                    console.log('当前统计数据:', userStats);
                    try {
                      await addActivity({
                        type: 'conversation',
                        title: 'AI对话',
                        description: newMessage.content.slice(0, 100) + (newMessage.content.length > 100 ? '...' : '')
                      });
                      console.log('✅ 对话活动记录添加成功');
                    } catch (error) {
                      console.error('❌ 对话活动记录添加失败:', error);
                    }

                    // 保存或更新历史记录
                    console.log('=== 准备保存历史记录 ===');
                    console.log('当前会话ID:', currentSessionIdRef.current);
                    console.log('消息数量:', finalMessages.length);
                    console.log('选择的模型:', selectedModel);
                    
                    try {
                      const sessionIdToUse = currentSessionIdRef.current;
                      if (sessionIdToUse) {
                        // 更新现有会话
                        console.log('更新现有会话');
                        updateSessionHistory(sessionIdToUse, finalMessages, selectedModel);
                      } else {
                        // 创建新会话
                        console.log('创建新会话');
                        const sessionId = saveSessionHistory(finalMessages, selectedModel, 'chat');
                        setCurrentSessionId(sessionId);
                        currentSessionIdRef.current = sessionId;
                        console.log('新会话ID:', sessionId);
                      }
                      
                      console.log('✅ 历史记录保存成功');
                    } catch (error) {
                      console.error('❌ 历史记录保存失败:', error);
                      // 显示错误提示
                      toast({
                        title: '保存失败',
                        description: '对话历史记录保存失败，但不影响继续对话',
                        status: 'warning',
                        duration: 3000,
                        isClosable: true,
                      });
                    }
                    
                    setIsLoading(false);
                    return;
                  }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  aiContent += parsed.content;
                  // 更新最后一条消息
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: aiContent
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      toast({
        title: '发送失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      
      // 移除最后添加的空AI消息
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // 新增：处理来自特殊模式的消息发送
  const handleSpecialModeSendMessage = async (userMessage: Message, aiResponse?: Message, aiPrompt?: string) => {
    console.log('=== 特殊模式发送消息开始 ===');
    console.log('当前currentSessionId:', currentSessionId);
    console.log('当前currentSessionIdRef.current:', currentSessionIdRef.current);
    console.log('是否有AI回复:', !!aiResponse);
    
    // 检查用户是否已登录
    if (!user) {
      onLoginOpen();
      toast({
        title: '请先登录',
        description: '登录后即可使用AI功能',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    // 如果提供了AI回复（如翻译功能），直接添加两条消息
    if (aiResponse) {
      const newMessages = [...messages, userMessage, aiResponse];
      setMessages(newMessages);
      
      // 添加对话活动记录，扣除免费额度
      try {
        await addActivity({
          type: 'conversation',
          title: '快速翻译',
          description: userMessage.content.slice(0, 100) + (userMessage.content.length > 100 ? '...' : '')
        });
      } catch (err) {
        console.error('添加快速翻译活动记录失败:', err);
      }

      // 保存或更新历史记录
      const sessionIdToUse = currentSessionIdRef.current;
      console.log('翻译功能 - sessionIdToUse:', sessionIdToUse);
      if (sessionIdToUse) {
        // 更新现有会话
        console.log('翻译功能 - 更新现有会话:', sessionIdToUse);
        updateSessionHistory(sessionIdToUse, newMessages, selectedModel);
      } else {
        // 创建新会话
        console.log('翻译功能 - 创建新会话');
        const sessionId = saveSessionHistory(newMessages, selectedModel, 'chat');
        setCurrentSessionId(sessionId);
        currentSessionIdRef.current = sessionId;
        console.log('翻译功能 - 新会话ID:', sessionId);
      }
      console.log('=== 特殊模式发送消息结束 ===');
      return;
    }

    // 否则像普通聊天一样处理（如写作、旅行规划）
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // 构建发送给AI的消息，如果有aiPrompt则使用它，否则使用用户消息内容
      const messagesForAI = [...messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      })), {
        role: 'user',
        content: aiPrompt || userMessage.content
      }];

      // 使用流式响应
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForAI,
          model: selectedModel,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let aiContent = '';

      // 添加一个占位的AI消息
      const aiMessage: Message = {
        content: '',
        isUser: false,
        timestamp: new Date().toISOString(),
        avatar: getModelAvatar(selectedModel),
        modelName: getModelDisplayName(selectedModel),
      };
      setMessages(prev => [...prev, aiMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // 完成后保存对话历史
                const finalMessages = [...currentMessages, { ...aiMessage, content: aiContent }];
                setMessages(finalMessages);
                
                // 添加对话活动记录
                console.log('=== 特殊模式准备添加对话活动记录 ===');
                try {
                  await addActivity({
                    type: 'conversation',
                    title: 'AI对话',
                    description: userMessage.content.slice(0, 100) + (userMessage.content.length > 100 ? '...' : '')
                  });
                  console.log('✅ 特殊模式对话活动记录添加成功');
                } catch (error) {
                  console.error('❌ 特殊模式对话活动记录添加失败:', error);
                }

                // 保存或更新历史记录
                console.log('=== 特殊模式准备保存历史记录 ===');
                console.log('当前会话ID:', currentSessionIdRef.current);
                console.log('消息数量:', finalMessages.length);
                console.log('选择的模型:', selectedModel);
                
                try {
                  const sessionIdToUse = currentSessionIdRef.current;
                  if (sessionIdToUse) {
                    // 更新现有会话
                    console.log('特殊模式更新现有会话');
                    updateSessionHistory(sessionIdToUse, finalMessages, selectedModel);
                  } else {
                    // 创建新会话
                    console.log('特殊模式创建新会话');
                    const sessionId = saveSessionHistory(finalMessages, selectedModel, 'chat');
                    setCurrentSessionId(sessionId);
                    currentSessionIdRef.current = sessionId;
                    console.log('特殊模式新会话ID:', sessionId);
                  }
                  
                  console.log('✅ 特殊模式历史记录保存成功');
                } catch (error) {
                  console.error('❌ 特殊模式历史记录保存失败:', error);
                  // 显示错误提示
                  toast({
                    title: '保存失败',
                    description: '对话历史记录保存失败，但不影响继续对话',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                  });
                }
                
                setIsLoading(false);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  aiContent += parsed.content;
                  // 更新最后一条消息
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: aiContent
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      toast({
        title: '发送失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      
      // 移除最后添加的空AI消息
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleModeChange = (mode: ChatMode) => {
    // 如果切换到特殊模式，清除所有标记
    if (mode !== 'default' && typeof window !== 'undefined') {
      sessionStorage.removeItem('newChatSession');
      sessionStorage.removeItem('specialModeClosed');
      console.log('切换到特殊模式，清除所有标记');
    }
    // 如果是切换到默认模式（即关闭特殊模式），记录这个状态并立即清除所有相关状态
    if (mode === 'default' && typeof window !== 'undefined') {
      console.log('用户主动关闭特殊模式');
      sessionStorage.setItem('specialModeClosed', 'true');
      // 清除所有相关状态
      pageStateManager.clearPageState('chat');
      // 重置所有状态
      setMessages([]);
      setInputValue('');
      setCurrentSessionId('');
      currentSessionIdRef.current = '';
      setIsNewSession(true);
      setChatMode('default'); // 确保立即设置为默认模式
    }
    setChatMode(mode);
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatMode('default');
    setInputValue('');
    setIsLoading(false);
    setStreamingMessage('');
    setCurrentSessionId('');
    currentSessionIdRef.current = '';
    setIsNewSession(true);
    
    // 设置新建对话标记，防止页面切换时恢复旧对话
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('newChatSession', 'true');
      // 清除特殊模式关闭标记
      sessionStorage.removeItem('specialModeClosed');
      // 清除历史记录选择标记
      sessionStorage.removeItem('selectedHistoryId');
      pageStateManager.clearPageState('chat');
    }
    
    toast({
      title: t('session.newChatStarted'),
      status: 'info',
      duration: 2000,
    });
  };

  const handleLoadChat = (history: ChatHistory) => {
    console.log('=== 直接加载历史记录开始 ===');
    console.log('历史记录ID:', history.id);
    console.log('历史记录消息数量:', history.messages.length);

    // 检查是否是相同的历史记录，避免重复加载
    if (currentSessionIdRef.current === history.id && messages.length === history.messages.length) {
      console.log('相同历史记录，跳过加载');
      return;
    }

    // 清除所有可能影响状态的标记
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('newChatSession');
      sessionStorage.removeItem('fromOtherPage');
      sessionStorage.removeItem('loadingHistory');
      sessionStorage.removeItem('selectedHistoryId'); // 清除选择标记，因为是直接加载
    }

    // 清除页面状态，避免冲突
    pageStateManager.clearPageState('chat');

    // 立即设置所有状态
    setMessages(history.messages || []);
    setSelectedModel(history.model || 'DeepSeek-R1-0528');
    setIsLoading(false);
    setStreamingMessage('');
    setChatMode('default');
    setIsNewSession(false);
    setCurrentSessionId(history.id);
    currentSessionIdRef.current = history.id;

    console.log('设置完成，当前会话ID:', history.id);
    console.log('当前消息数量:', history.messages?.length || 0);
    console.log('=== 直接加载历史记录结束 ===');

    toast({
      title: t('history.restored'),
      description: `${t('history.restored')} ${history.messages?.length || 0} ${t('history.records')}`,
      status: 'success',
      duration: 1500,
    });
  };

  const handleClearHistory = async () => {
    try {
      // 导入并调用清除历史记录函数
      const { clearHistories } = await import('../utils/storage');
      await clearHistories();
      
      // 清空当前界面
      setMessages([]);
      setIsLoading(false);
      setStreamingMessage('');
      setCurrentSessionId('');
      currentSessionIdRef.current = '';
      setIsNewSession(true);
      
      // 清除相关的sessionStorage标记
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('selectedHistoryId');
        sessionStorage.removeItem('pendingHistory');
        sessionStorage.removeItem('pendingHistoryLoad');
      }
      
      toast({
        title: '历史记录已清空',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('清除历史记录失败:', error);
      toast({
        title: '清除失败',
        description: '请稍后重试',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleUpdateHistory = (history: ChatHistory) => {
    // 更新历史记录的逻辑
  };

  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName);
  };

  // 处理消息编辑
  const handleEditMessage = (index: number, newContent: string) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], content: newContent };
    setMessages(updatedMessages);
    
    // 如果编辑的是用户消息，可以选择重新发送
    if (updatedMessages[index].isUser) {
      toast({
        title: '消息已编辑',
        description: '您可以重新发送以获得新的回复',
        status: 'info',
        duration: 3000,
      });
    }
  };

  // 处理重新生成
  const handleRegenerateMessage = async (index: number) => {
    if (index === 0) return; // 不能重新生成第一条消息
    
    // 找到对应的用户消息
    const userMessageIndex = index - 1;
    if (userMessageIndex < 0 || !messages[userMessageIndex].isUser) return;
    
    // 移除当前AI回复
    const messagesUpToUser = messages.slice(0, index);
    setMessages(messagesUpToUser);
    
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // 使用流式响应重新生成
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesUpToUser.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.content
          })),
          model: selectedModel,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let aiContent = '';

      // 添加一个占位的AI消息
      const aiMessage: Message = {
        content: '',
        isUser: false,
        timestamp: new Date().toISOString(),
        avatar: getModelAvatar(selectedModel),
        modelName: getModelDisplayName(selectedModel),
      };
      setMessages(prev => [...prev, aiMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // 完成后保存对话历史
                const finalMessages = [...messagesUpToUser, { ...aiMessage, content: aiContent }];
                setMessages(finalMessages);
                
                // 添加对话活动记录
                console.log('=== 重新生成准备添加对话活动记录 ===');
                try {
                  await addActivity({
                    type: 'conversation',
                    title: 'AI对话',
                    description: messagesUpToUser[messagesUpToUser.length - 1].content.slice(0, 100) + (messagesUpToUser[messagesUpToUser.length - 1].content.length > 100 ? '...' : '')
                  });
                  console.log('✅ 重新生成对话活动记录添加成功');
                } catch (error) {
                  console.error('❌ 重新生成对话活动记录添加失败:', error);
                }

                // 保存或更新历史记录
                console.log('=== 重新生成准备保存历史记录 ===');
                console.log('当前会话ID:', currentSessionIdRef.current);
                console.log('消息数量:', finalMessages.length);
                console.log('选择的模型:', selectedModel);
                
                try {
                  const sessionIdToUse = currentSessionIdRef.current;
                  if (sessionIdToUse) {
                    // 更新现有会话
                    console.log('重新生成更新现有会话');
                    updateSessionHistory(sessionIdToUse, finalMessages, selectedModel);
                  } else {
                    // 创建新会话
                    console.log('重新生成创建新会话');
                    const sessionId = saveSessionHistory(finalMessages, selectedModel, 'chat');
                    setCurrentSessionId(sessionId);
                    currentSessionIdRef.current = sessionId;
                    console.log('重新生成新会话ID:', sessionId);
                  }
                  
                  console.log('✅ 重新生成历史记录保存成功');
                } catch (error) {
                  console.error('❌ 重新生成历史记录保存失败:', error);
                  // 显示错误提示
                  toast({
                    title: '保存失败',
                    description: '对话历史记录保存失败，但不影响继续对话',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                  });
                }
                
                setIsLoading(false);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.content) {
                  aiContent += parsed.content;
                  // 更新最后一条消息
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: aiContent
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('重新生成失败:', error);
      toast({
        title: '重新生成失败',
        description: error instanceof Error ? error.message : '未知错误',
        status: 'error',
        duration: 3000,
      });
      
      // 恢复原来的消息
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理收藏消息 - 现在由ChatMessage组件内部处理
  const handleFavoriteMessage = (index: number) => {
    // 这个函数现在由ChatMessage组件内部处理，这里保留为空函数以保持兼容性
  };

  const suggestionButtons = [
    { text: t('chat.helpWrite'), icon: FiEdit, color: 'blue', mode: 'write' as ChatMode },
    { text: t('chat.quickTranslate'), icon: FiGlobe, color: 'green', mode: 'translate' as ChatMode },
    { text: t('chat.travelPlan'), icon: FiMapPin, color: 'orange', mode: 'travel' as ChatMode },
    { text: t('chat.scriptWrite'), icon: FiFilm, color: 'purple', mode: 'script' as ChatMode },
  ];

  // 统一保存聊天状态（包括未发送输入）
  const saveCurrentState = () => {
    if (user) {
      // 若是全新空会话（无消息、无输入、默认模式、isNewSession=true）则不保存，避免覆盖旧状态
      if (isNewSession && chatMode === 'default' && messages.length === 0 && inputValue.trim().length === 0) {
        console.log('空白新会话，不保存状态');
      } else if (chatMode !== 'default' || messages.length > 0 || inputValue.trim().length > 0) {
        console.log('保存聊天状态:', {
          messages,
          selectedModel,
          inputValue,
          currentSessionId,
          chatMode,
          isNewSession
        });
        pageStateManager.savePageState('chat', {
          messages,
          selectedModel,
          inputValue,
          currentSessionId,
          chatMode,
          isNewSession
        });
      }
    }
  };

  // 监听 chatMode 变化，仅当用户从特殊模式主动切回 default 时，设置 specialModeClosed
  const prevChatModeRef = useRef<ChatMode>('default');
  useEffect(() => {
    const prevMode = prevChatModeRef.current;
    if (prevMode !== 'default' && chatMode === 'default') {
      // 用户关闭了特殊模式
      sessionStorage.setItem('specialModeClosed', 'true');
      pageStateManager.clearPageState('chat');
    }

    if (chatMode !== 'default') {
      sessionStorage.removeItem('specialModeClosed');
    }

    prevChatModeRef.current = chatMode;
  }, [chatMode]);

  const restorePageState = () => {
    if (user) {
      console.log('=== restorePageState 开始 ===');
      
      // 检查是否有新建对话标记
      const isNewChatSession = sessionStorage.getItem('newChatSession') === 'true';
      const fromOtherPage = sessionStorage.getItem('fromOtherPage') === 'true';
      const fromBackgroundPage = sessionStorage.getItem('fromBackgroundPage') === 'true';
      const selectedHistoryId = sessionStorage.getItem('selectedHistoryId');
      const isLoadingHistory = sessionStorage.getItem('loadingHistory') === 'true';
      
      console.log('isNewChatSession:', isNewChatSession);
      console.log('fromOtherPage:', fromOtherPage);
      console.log('fromBackgroundPage:', fromBackgroundPage);
      console.log('selectedHistoryId:', selectedHistoryId);
      console.log('isLoadingHistory:', isLoadingHistory);
      
      // 如果正在加载历史记录，跳过状态恢复
      if (isLoadingHistory) {
        console.log('正在加载历史记录，跳过状态恢复');
        return;
      }
      
      if (isNewChatSession) {
        // 如果是新建对话，保持新对话状态
        console.log('保持新对话状态，不恢复历史记录');
        sessionStorage.removeItem('newChatSession');
        sessionStorage.removeItem('fromOtherPage');
        sessionStorage.removeItem('fromBackgroundPage');
        sessionStorage.removeItem('selectedHistoryId');
        return;
      }
      
      // 优先检查用户是否主动选择了历史记录
      if (selectedHistoryId) {
        console.log('检测到用户选择的历史记录ID:', selectedHistoryId);
        const allHistories = getHistories();
        const selectedHistory = allHistories.find(h => h.id === selectedHistoryId && h.type === 'chat');
        
        if (selectedHistory) {
          console.log('恢复用户选择的历史记录');
          // 检查是否已经是当前显示的历史记录，避免重复设置
          if (currentSessionIdRef.current !== selectedHistory.id || messages.length !== selectedHistory.messages.length) {
            setMessages(selectedHistory.messages || []);
            setSelectedModel(selectedHistory.model || 'DeepSeek-R1-0528');
            setCurrentSessionId(selectedHistory.id);
            currentSessionIdRef.current = selectedHistory.id;
            setChatMode('default');
            setIsNewSession(false);
            setIsLoading(false);
            setStreamingMessage('');
          }
          
          // 清除选择标记和其他标记
          sessionStorage.removeItem('selectedHistoryId');
          sessionStorage.removeItem('fromOtherPage');
          sessionStorage.removeItem('fromBackgroundPage');
          
          console.log('=== 用户选择的历史记录恢复完成 ===');
          return;
        } else {
          console.log('未找到用户选择的历史记录，清除标记');
          sessionStorage.removeItem('selectedHistoryId');
        }
      }
      
      // 尝试恢复页面状态（包括特殊模式）
      const savedState = pageStateManager.getPageState('chat');
      console.log('savedState:', savedState);
      
      // 总是优先检查是否有特殊模式状态需要恢复
      if (savedState.chatMode && savedState.chatMode !== 'default') {
        console.log('恢复特殊模式状态:', savedState.chatMode);
        // 检查是否需要更新状态，避免重复设置
        if (
          JSON.stringify(messages) !== JSON.stringify(savedState.messages || []) ||
          selectedModel !== savedState.selectedModel ||
          chatMode !== savedState.chatMode ||
          currentSessionIdRef.current !== savedState.currentSessionId
        ) {
          setMessages(savedState.messages || []);
          setSelectedModel(savedState.selectedModel || 'DeepSeek-R1-0528');
          setInputValue(savedState.inputValue || '');
          setCurrentSessionId(savedState.currentSessionId || '');
          currentSessionIdRef.current = savedState.currentSessionId || '';
          setIsNewSession(savedState.isNewSession ?? true);
          setChatMode(savedState.chatMode);
        }
        
        // 清除标记
        if (fromOtherPage) {
          sessionStorage.removeItem('fromOtherPage');
        }
        if (fromBackgroundPage) {
          sessionStorage.removeItem('fromBackgroundPage');
        }
        console.log('=== 特殊模式恢复完成 ===');
        return;
      }
      
      // 只有在没有特殊模式状态且没有用户选择历史记录时才考虑自动恢复
      if (!fromOtherPage) {
        // 如果有保存的聊天状态且有当前会话ID，优先恢复它
        if (savedState.messages && savedState.messages.length > 0 && savedState.currentSessionId) {
          console.log('恢复保存的聊天状态');
          // 检查是否需要更新状态，避免重复设置
          if (
            JSON.stringify(messages) !== JSON.stringify(savedState.messages) ||
            selectedModel !== savedState.selectedModel ||
            currentSessionIdRef.current !== savedState.currentSessionId
          ) {
            setMessages(savedState.messages || []);
            setSelectedModel(savedState.selectedModel || 'DeepSeek-R1-0528');
            setInputValue(savedState.inputValue || '');
            setCurrentSessionId(savedState.currentSessionId || '');
            currentSessionIdRef.current = savedState.currentSessionId || '';
            setIsNewSession(savedState.isNewSession ?? true);
            setChatMode(savedState.chatMode || 'default');
          }
          console.log('恢复聊天页面状态:', savedState);
        } else {
          // 最后才考虑恢复最新历史记录（只有在没有其他状态且消息为空时）
          if (messages.length === 0 && !currentSessionIdRef.current) {
            const allHistories = getHistories();
            const chatHistories = allHistories.filter(h => h.type === 'chat');
            
            if (chatHistories.length > 0) {
              console.log('恢复最新历史记录');
              const latestChat = chatHistories[0]; // 历史记录按时间倒序排列
              setMessages(latestChat.messages);
              setSelectedModel(latestChat.model);
              setCurrentSessionId(latestChat.id);
              currentSessionIdRef.current = latestChat.id;
              setChatMode('default'); // 历史记录默认为普通对话模式
              setIsNewSession(false);
              console.log('恢复最近的聊天历史记录:', latestChat.messages.length, '条消息');
            } else {
              console.log('没有可恢复的历史记录');
            }
          } else {
            console.log('已有消息或会话，跳过自动恢复历史记录');
          }
        }
      } else {
        // 从其他页面返回，如果有保存的聊天状态，恢复它
        if (savedState.messages && savedState.messages.length > 0) {
          console.log('从其他页面返回，恢复保存的聊天状态');
          // 检查是否需要更新状态，避免重复设置
          if (
            JSON.stringify(messages) !== JSON.stringify(savedState.messages) ||
            selectedModel !== savedState.selectedModel ||
            currentSessionIdRef.current !== savedState.currentSessionId
          ) {
            setMessages(savedState.messages || []);
            setSelectedModel(savedState.selectedModel || 'DeepSeek-R1-0528');
            setInputValue(savedState.inputValue || '');
            setCurrentSessionId(savedState.currentSessionId || '');
            currentSessionIdRef.current = savedState.currentSessionId || '';
            setIsNewSession(savedState.isNewSession ?? true);
            setChatMode(savedState.chatMode || 'default');
          }
          console.log('恢复聊天页面状态:', savedState);
        } else {
          console.log('从其他页面返回，没有可恢复的状态');
        }
      }
      
      // 清除标记
      if (fromOtherPage) {
        sessionStorage.removeItem('fromOtherPage');
      }
      if (fromBackgroundPage) {
        sessionStorage.removeItem('fromBackgroundPage');
      }
      
      console.log('=== restorePageState 结束 ===');
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setInputValue('');
    setCurrentSessionId('');
    currentSessionIdRef.current = '';
    setIsNewSession(true);
    setChatMode('default');
    setIsLoading(false);
    setStreamingMessage('');
    pageStateManager.clearPageState('chat');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('newChatSession', 'true');
      sessionStorage.removeItem('selectedHistoryId'); // 清除历史记录选择标记
    }
    toast({
      title: t('session.newChatStarted'),
      status: 'success',
      duration: 2000,
    });
  };

  const handleNewVideo = () => {
    // 设置新建视频会话标记
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('newVideoSession', 'true');
    }
    router.push('/video');
  };

  // 页面状态恢复的 useEffect - 优化触发时机
  useEffect(() => {
    // 清除之前的定时器
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
    }

    const now = Date.now();
    // 防抖机制：500ms内只执行一次状态恢复
    if (now - lastRestoreRef.current < 500) {
      restoreTimeoutRef.current = setTimeout(() => {
        lastRestoreRef.current = Date.now();
        restorePageState();
      }, 500);
      return;
    }

    lastRestoreRef.current = now;
    restorePageState();

    return () => {
      if (restoreTimeoutRef.current) {
        clearTimeout(restoreTimeoutRef.current);
      }
    };
  }, [user?.id]); // 只在用户ID变化时触发，避免频繁重新执行

  // 页面卸载时保存状态 - 简化版本
  useEffect(() => {
    if (isHistoryRestored.current) return;
    
    const handleBeforeUnload = () => {
      if (user) {
        saveCurrentState();
      }
    };
    
    // 简化的页面可见性变化处理
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时，保存当前状态
        console.log('页面隐藏，保存当前状态');
        if (user) {
          saveCurrentState();
        }
      }
      // 移除复杂的页面可见时状态恢复逻辑，让新的统一恢复机制处理
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (user) {
        saveCurrentState();
      }
    };
  }, [user]);

  return (
    <Box height="100vh" minH="100vh" display="flex" flexDirection="column">
      {/* 移动端导航 - 只在移动端显示 */}
      <MobileNav onClearHistory={handleClearHistory} onNewChat={handleNewChat} />
      
      {/* 桌面端侧边栏 - 只在桌面端显示 */}
      <Box display={{ base: 'none', md: 'block' }}>
        <Sidebar 
          onNewChat={handleNewChat} 
          onNewVideo={handleNewVideo}
          onLoadChat={handleLoadChat} 
          onClearHistory={handleClearHistory}
          onUpdateHistory={handleUpdateHistory}
        />
      </Box>
        <Header />
      
      {/* 模型选择区域 - 固定在顶部 */}
      <Box
        position="fixed"
        top="60px"
        left={{ base: '0', md: '250px' }}
        right="0"
        bg={useColorModeValue('white', 'gray.900')}
        zIndex={20}
        py={4}
      >
        <Box maxW="1200px" mx="auto" px={4}>
          <Box
            w="full"
            overflowX="auto"
            pb={2}
            sx={{
              '&::-webkit-scrollbar': {
                height: '4px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: useColorModeValue('gray.300', 'gray.600'),
                borderRadius: '24px',
              },
            }}
          >
            <Flex
              wrap="nowrap"
              justify={{ base: 'flex-start', md: 'center' }}
              gap={3}
              minW="max-content"
            >
              {models.map((model) => (
                <ModelDropdown
                  key={model.name}
                  model={model}
                  selectedModel={selectedModel}
                  onModelSelect={setSelectedModel}
                />
              ))}
              <Tag
                size={{ base: 'md', md: 'lg' }}
                variant="ghost"
                borderRadius="full" 
                p={2}
                px={4}
                onClick={onOpen}
                cursor="pointer"
                whiteSpace="nowrap"
                zIndex={20}
              >
                {t('model.more')}
              </Tag>
            </Flex>
          </Box>
        </Box>
      </Box>
      
      {/* 主要内容区域 */}
      <Box
        ml={{ base: '0', md: '250px' }}
        pt={{ base: "140px", md: "140px" }}
        transition="margin-left 0.2s"
        flex="1"
        minH={0}
        display="flex"
        flexDirection="column"
        height="100%"
      >
        <Box maxW="1200px" mx="auto" w="full" display="flex" flexDirection="column" flex="1" minH="0" style={{ minHeight: 0 }}>
          <Flex direction="column" flex="1" minH="0" p={{ base: 3, md: 8 }} gap={{ base: 4, md: 8 }}>
            {messages.length === 0 ? (
              <>
                <VStack spacing={{ base: 8, md: 12 }} px={{ base: 2, md: 0 }}>
                  <Heading
                    as="h1"
                    size={{ base: 'lg', md: '2xl' }}
                    fontWeight="bold"
                    textAlign="center"
                    px={2}
                    mb={{ base: 12, md: 16 }}
                    mt={{ base: 8, md: 12 }}
                  >
                    {t('chat.title')}
                  </Heading>
                </VStack>

                <Box maxW="800px" w="full" mx="auto" mt={{ base: 4, md: 8 }}>
                  {/* 功能按钮 */}
                  <SimpleGrid
                    columns={{ base: 2, md: 4 }}
                    spacing={{ base: 3, md: 4 }}
                    w="full"
                    maxW="600px"
                    mx="auto"
                    mb={6}
                  >
                    {suggestionButtons.map((btn) => (
                      <Button 
                        key={btn.text} 
                        leftIcon={<Icon as={btn.icon} />} 
                        variant="outline" 
                        borderColor="gray.200" 
                        _dark={{ borderColor: 'gray.700' }} 
                        colorScheme={btn.color} 
                        size="sm"
                        onClick={() => handleModeChange(btn.mode)}
                        px={2}
                      >
                        {btn.text}
                      </Button>
                    ))}
                  </SimpleGrid>

                  {/* 输入区域 */}
                  {chatMode === 'default' ? (
                    <>
                      <ChatInput
                        value={inputValue}
                        onChange={handleInputChange}
                        onSend={handleSendMessage}
                        isInitial={true}
                        height="140px"
                        borderRadius="2xl"
                        modelType={getModelType(selectedModel)}
                        placeholder={t('chat.placeholder', { model: getModelDisplayName(selectedModel) })}
                        isFreeUser={isFreeUser}
                        freeQuota={freeQuota}
                        freeUsed={freeUsed}
                        creditCost={creditCost}
                      />
                      {isLoading && (
                        <Flex justify="center" mt={4}>
                          <Flex align="center" gap={2}>
                            <Spinner size="sm" />
                            <Text fontSize="sm" color="gray.500">{t('chat.thinking')}</Text>
                          </Flex>
                        </Flex>
                      )}
                    </>
                  ) : (
                    <Box>
                      {chatMode === 'write' && <WriteView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}
                      {chatMode === 'translate' && <TranslateView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} selectedModel={models.find(m => m.name === selectedModel)} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}
                      {chatMode === 'travel' && <TravelView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}
                      {chatMode === 'script' && <ScriptView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}

                      {chatMode === 'video' && <VideoView onClose={() => setChatMode('default')} />}
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Box w="full" maxW="4xl" mx="auto" position="relative" display="flex" flexDirection="column" flex="1" minH="0">
                {/* 会话状态指示器和新建会话按钮 */}
                <HStack justify="space-between" mb={4} px={{ base: 2, md: 4 }}>
                  <HStack>
                    <Badge colorScheme="green" variant="subtle">
                      {t('chat.conversationInProgress')}
                    </Badge>
                    {pageStateManager.hasPageState('chat') && (
                      <Tooltip label="此对话已自动保存状态">
                        <Badge colorScheme="blue" variant="outline">
                          {t('chat.conversationSaved')}
                        </Badge>
                      </Tooltip>
                    )}
                  </HStack>
                  <Tooltip label="开始新的对话">
                    <Button
                      size="sm"
                      leftIcon={<Icon as={FiRefreshCw} />}
                      variant="outline"
                      colorScheme="purple"
                      onClick={startNewSession}
                    >
                      {t('chat.newConversation')}
                    </Button>
                  </Tooltip>
                </HStack>

                {/* 消息列表 */}
                <VStack
                  spacing={4}
                  align="stretch"
                  flex="1"
                  minH="0"
                  overflowY="auto"
                  mb={0}
                  px={{ base: 2, md: 4 }}
                  sx={{
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: useColorModeValue('gray.300', 'gray.600'),
                      borderRadius: '24px',
                    },
                  }}
                >
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      content={message.content}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                      avatar={message.avatar}
                      modelName={message.modelName}
                      messageId={`msg-${index}-${message.timestamp}`}
                      onEdit={(newContent) => handleEditMessage(index, newContent)}
                      onRegenerate={() => handleRegenerateMessage(index)}
                      onFavorite={() => handleFavoriteMessage(index)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
            </VStack>
            
                {/* 对话中的功能按钮和输入框 */}
                <Box
                  flexShrink={0}
                  p={0}
                  m={0}
                  borderRadius={0}
                  bg={useColorModeValue('white', 'gray.900')}
                  borderTop="1px"
                  borderColor={useColorModeValue('gray.200', 'gray.700')}
                  zIndex={10}
                  position="relative"
                >
                  {/* 搜索历史记录 */}
                  {inputValue && searchHistory.length > 0 && (
                    <Box
                      position="absolute"
                      bottom="100%"
                      left={4}
                      right={4}
                      bg={useColorModeValue('white', 'gray.800')}
                      borderRadius="md"
                      boxShadow="lg"
                      p={2}
                      maxH="200px"
                      overflowY="auto"
                      mb={2}
                      border="1px"
                      borderColor={useColorModeValue('gray.200', 'gray.600')}
                    >
                      {/* 标题栏和关闭按钮 */}
                      <Flex justify="space-between" align="center" mb={2} pb={2} borderBottom="1px" borderColor={useColorModeValue('gray.100', 'gray.700')}>
                        <Text fontSize="sm" fontWeight="medium" color={useColorModeValue('gray.600', 'gray.300')}>
                          历史输入记录
                        </Text>
                        <HStack spacing={1}>
                          <Tooltip label="清除所有历史记录">
                            <IconButton
                              icon={<FiTrash2 />}
                              aria-label="清除所有历史记录"
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => {
                                setSearchHistory([]);
                                localStorage.removeItem('search_history');
                                toast({
                                  title: '历史记录已清除',
                                  status: 'success',
                                  duration: 2000,
                                });
                              }}
                            />
                          </Tooltip>
                          <Tooltip label="关闭">
                            <IconButton
                              icon={<FaTimes />}
                              aria-label="关闭历史记录"
                              size="xs"
                              variant="ghost"
                              onClick={() => setInputValue('')}
                            />
                          </Tooltip>
                        </HStack>
                      </Flex>
                      <VStack align="stretch" spacing={1}>
                        {searchHistory.map((item, index) => (
                          <Flex key={index} align="center" justify="space-between">
                            <Button
                              variant="ghost"
                              justifyContent="flex-start"
                              size="sm"
                              flex={1}
                              onClick={() => setInputValue(item)}
                              textAlign="left"
                              whiteSpace="nowrap"
                              overflow="hidden"
                              textOverflow="ellipsis"
                            >
                              {item}
                            </Button>
                            <Tooltip label="删除此记录">
                              <IconButton
                                icon={<FaTimes />}
                                aria-label="删除此记录"
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedHistory = searchHistory.filter((_, i) => i !== index);
                                  setSearchHistory(updatedHistory);
                                  localStorage.setItem('search_history', JSON.stringify(updatedHistory));
                                }}
                              />
                            </Tooltip>
                          </Flex>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {/* 功能按钮 */}
                  <SimpleGrid
                    columns={{ base: 2, md: 4 }}
                    spacing={{ base: 3, md: 4 }}
                    w="full"
                    maxW="600px"
                    mx="auto"
                    mb={4}
                  >
                    {suggestionButtons.map((btn) => (
                      <Button 
                        key={btn.text} 
                        leftIcon={<Icon as={btn.icon} />} 
                        variant="outline" 
                        borderColor="gray.200" 
                        _dark={{ borderColor: 'gray.700' }} 
                        colorScheme={btn.color} 
                        size="sm"
                        onClick={() => handleModeChange(btn.mode)}
                        px={2}
                      >
                        {btn.text}
                      </Button>
                    ))}
                  </SimpleGrid>

                  {/* 输入框 */}
                  <Box maxW="800px" mx="auto">
                    {chatMode === 'default' ? (
                      <>
                        <ChatInput
                          value={inputValue}
                          onChange={handleInputChange}
                          onSend={handleSendMessage}
                          placeholder={t('chat.placeholderConversation', { model: getModelDisplayName(selectedModel) })}
                          isInitial={false}
                          height="60px"
                          modelType={getModelType(selectedModel)}
                          isFreeUser={isFreeUser}
                          freeQuota={freeQuota}
                          freeUsed={freeUsed}
                          creditCost={creditCost}
                        />
                        {isLoading && (
                          <Flex justify="center" mt={2}>
                            <Flex align="center" gap={2}>
                              <Spinner size="sm" />
                              <Text fontSize="sm" color="gray.500">AI正在思考中...</Text>
                            </Flex>
                          </Flex>
                        )}
                      </>
                    ) : (
                      <Box>
                        {chatMode === 'write' && <WriteView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}
                        {chatMode === 'translate' && <TranslateView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} selectedModel={models.find(m => m.name === selectedModel)} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}
                        {chatMode === 'travel' && <TravelView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}
                        {chatMode === 'script' && <ScriptView onClose={() => setChatMode('default')} onSendMessage={handleSpecialModeSendMessage} isFreeUser={isFreeUser} freeQuota={freeQuota} freeUsed={freeUsed} creditCost={5} />}

                        {chatMode === 'video' && <VideoView onClose={() => setChatMode('default')} />}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
    </Flex>
        </Box>
        <ModelModal isOpen={isOpen} onClose={onClose} onSelectModel={handleSelectModel} />
        <LoginModal isOpen={isLoginOpen} onClose={onLoginClose} />
      </Box>
    </Box>
  );
}