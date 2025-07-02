import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  useColorModeValue,
  SimpleGrid,
  Icon,
  useToast,
  Flex,
  Container,
  HStack,
  IconButton,
  Textarea,
  Badge,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  CardHeader,
  Tooltip,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import { FiUpload, FiLink, FiCopy, FiX, FiFile, FiSend, FiMessageSquare, FiBookmark } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileNav from '../components/MobileNav';
import { LoginModal } from '../components/LoginModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { saveSessionHistory, updateSessionHistory, getHistories } from '../utils/storage';
import { Message } from '../types/chat';
import { useRouter } from 'next/router';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DocumentData {
  id: string;
  title: string;
  content: string;
  uploadTime: Date;
  wordCount: number;
  type: 'file' | 'url' | 'text';
}

export default function Read() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentContent, setDocumentContent] = useState(''); // 文档的完整内容
  const [previewText, setPreviewText] = useState(''); // 预览显示的文本
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null);
  const [activeInputType, setActiveInputType] = useState<'file' | 'url' | 'text'>('file');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<string>('');
  const toast = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addActivity, addFavorite, updateStats, userStats, getUserQuota, checkFreeQuotaExceeded, getRemainingFreeQuota } = useUserActivity();
  const router = useRouter();
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();

  // 判断是否免费用户
  const isFreeUser = getUserQuota('document') !== Infinity;
  const freeQuota = getUserQuota('document');
  const freeUsed = userStats.documents;
  const creditCost = 20;

  // 滚动到聊天底部
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAnalyzing]);

  // 从历史记录加载会话
  useEffect(() => {
    const { loadHistory } = router.query;
    if (loadHistory && typeof loadHistory === 'string') {
              const histories = getHistories();
      const targetHistory = histories.find(h => h.id === loadHistory && h.type === 'read');
      if (targetHistory) {
        // 转换Message格式到ChatMessage格式
        const convertedMessages = targetHistory.messages.map((msg, index) => ({
          id: (Date.now() + index).toString(),
          role: msg.isUser ? 'user' as const : 'assistant' as const,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }));
        
        setChatMessages(convertedMessages);
        setCurrentSessionId(targetHistory.id);
        currentSessionIdRef.current = targetHistory.id;
        setAnalysisStarted(true);
        
        // 尝试从第一条AI消息中提取文档信息
        const firstAIMessage = convertedMessages.find(msg => msg.role === 'assistant');
        if (firstAIMessage && firstAIMessage.content.includes('个字符')) {
          const match = firstAIMessage.content.match(/共 (\d+) 个字符/);
          if (match) {
            const charCount = parseInt(match[1]);
            // 创建一个虚拟文档对象用于显示
            const virtualDoc: DocumentData = {
              id: targetHistory.id,
              title: targetHistory.title.replace('...', ''),
              content: `[从历史记录加载的文档内容，共 ${charCount} 个字符]`,
              uploadTime: new Date(targetHistory.timestamp),
              wordCount: charCount,
              type: 'file'
            };
            setCurrentDocument(virtualDoc);
            setDocumentContent(`[从历史记录加载的文档内容，共 ${charCount} 个字符]`);
            setPreviewText(`[从历史记录加载的文档内容，共 ${charCount} 个字符]`);
          }
        }
        
        toast({
          title: '已加载历史记录',
          description: `已恢复 ${convertedMessages.length} 条对话记录`,
          status: 'success',
          duration: 3000,
        });
        
        // 清除URL参数，避免重复加载
        router.replace('/read', undefined, { shallow: true });
      }
    }
  }, [router.query, toast]);

  // 转换ChatMessage到Message格式
  const convertToMessage = (chatMessage: ChatMessage): Message => {
    return {
      content: chatMessage.content,
      isUser: chatMessage.role === 'user',
      timestamp: chatMessage.timestamp.toISOString(),
      avatar: chatMessage.role === 'assistant' ? '/ai-avatar.png' : undefined,
      modelName: chatMessage.role === 'assistant' ? 'AI文档分析助手' : undefined,
    };
  };

  // 保存或更新会话历史记录
  const saveOrUpdateHistory = useCallback((messages: ChatMessage[]) => {
    if (messages.length === 0) return;

    const convertedMessages = messages.map(convertToMessage);
    const sessionIdToUse = currentSessionIdRef.current;

    if (sessionIdToUse) {
      // 更新现有会话
      updateSessionHistory(sessionIdToUse, convertedMessages, 'AI文档分析');
    } else {
      // 创建新会话
      const sessionId = saveSessionHistory(convertedMessages, 'AI文档分析', 'read');
      setCurrentSessionId(sessionId);
      currentSessionIdRef.current = sessionId;
    }
  }, []);

  // 使用后端API解析文档内容
  const extractTextFromFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '文件上传失败');
      }

      if (!data.success || !data.text) {
        throw new Error('文件解析失败，未能提取到文本内容');
      }

      return data.text;
    } catch (error) {
      console.error('文件解析错误:', error);
      throw new Error(error instanceof Error ? error.message : '文件解析失败');
    }
  }, []);

  // 保存文档数据到本地存储和历史记录
  const saveDocumentData = useCallback((documentData: DocumentData) => {
    try {
      // 保存到阅读文档列表
      const existingDocs = JSON.parse(localStorage.getItem('readingDocuments') || '[]');
      const updatedDocs = [documentData, ...existingDocs];
      localStorage.setItem('readingDocuments', JSON.stringify(updatedDocs));
      
      // 保存到历史记录
      const existingHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]');
      const historyItem = {
        id: documentData.id,
        title: documentData.title,
        content: documentData.content.substring(0, 500) + (documentData.content.length > 500 ? '...' : ''),
        fullContent: documentData.content,
        timestamp: documentData.uploadTime,
        wordCount: documentData.wordCount,
        type: documentData.type
      };
      const updatedHistory = [historyItem, ...existingHistory];
      localStorage.setItem('readingHistory', JSON.stringify(updatedHistory));
      
      // 更新阅读统计
      const currentStats = JSON.parse(localStorage.getItem('readingStats') || '{"totalDocuments": 0, "totalWords": 0}');
      currentStats.totalDocuments += 1;
      currentStats.totalWords += documentData.wordCount;
      localStorage.setItem('readingStats', JSON.stringify(currentStats));
      
    } catch (error) {
      console.error('保存文档数据失败:', error);
    }
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      const isAllowedType = allowedTypes.some(type => file.type === type) || 
                           file.name.endsWith('.txt') || 
                           file.name.endsWith('.pdf') || 
                           file.name.endsWith('.doc') || 
                           file.name.endsWith('.docx');
      
      if (isAllowedType) {
        setIsFileProcessing(true);
        setSelectedFile(file);
        
        try {
          // 使用后端API提取文档文本内容
          const extractedText = await extractTextFromFile(file);
          const cleanContent = extractedText.trim();
          
          // 检查文档长度（假设平均每页2000字符）
          const estimatedPages = Math.ceil(cleanContent.length / 2000);
          if (estimatedPages > 10) {
            toast({
              title: t('read.onlySupport10Pages'),
              status: 'warning',
              duration: 3000,
            });
            // 清理状态
            setSelectedFile(null);
            setDocumentContent('');
            setPreviewText('');
            setCurrentDocument(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setIsFileProcessing(false);
            return;
          }
          
          // 重置会话状态，创建新的历史记录
          setChatMessages([]);
          setAnalysisStarted(false);
          setCurrentSessionId('');
          currentSessionIdRef.current = '';
          
          // 设置文档内容和预览
          setDocumentContent(cleanContent);
          setPreviewText(cleanContent); // 在预览区显示完整内容
          
          // 创建文档数据
          const documentData: DocumentData = {
            id: Date.now().toString(),
            title: file.name,
            content: cleanContent,
            uploadTime: new Date(),
            wordCount: cleanContent.length,
            type: 'file'
          };
          
          setCurrentDocument(documentData);
          
          toast({
            title: '文档解析成功',
            description: `已成功提取文档内容，共 ${cleanContent.length} 个字符`,
            status: 'success',
            duration: 3000,
          });
        } catch (error) {
          toast({
            title: '文档处理失败',
            description: error instanceof Error ? error.message : '未知错误',
            status: 'error',
            duration: 5000,
          });
          
          // 清理状态
          setSelectedFile(null);
          setDocumentContent('');
          setPreviewText('');
          setCurrentDocument(null);
        } finally {
          setIsFileProcessing(false);
        }
      } else {
        toast({
          title: t('read.unsupportedFileType'),
          description: t('read.unsupportedFileTypeDesc'),
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  const handleUploadClick = () => {
    if (!checkLoginStatus()) return;
    setActiveInputType('file');
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setDocumentContent('');
    setPreviewText('');
    setChatMessages([]);
    setAnalysisStarted(false);
    setCurrentDocument(null);
    setActiveInputType('file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 网页链接提取功能
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    if (!checkLoginStatus()) return;
    
    setIsFileProcessing(true);
    
    try {
      const response = await fetch('/api/extract-web', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '网页内容提取失败');
      }

      if (!data.success || !data.text) {
        throw new Error('无法提取网页内容');
      }

      const cleanContent = data.text.trim();
      
      // 检查文档长度（假设平均每页2000字符）
      const estimatedPages = Math.ceil(cleanContent.length / 2000);
      if (estimatedPages > 10) {
        toast({
          title: t('read.onlySupport10Pages'),
          status: 'warning',
          duration: 3000,
        });
        setUrlInput('');
        return;
      }

      // 重置会话状态，创建新的历史记录
      setChatMessages([]);
      setAnalysisStarted(false);
      setCurrentSessionId('');
      currentSessionIdRef.current = '';

      setDocumentContent(cleanContent);
      setPreviewText(cleanContent);
      
      const documentData: DocumentData = {
        id: Date.now().toString(),
        title: data.title || `网页内容 - ${new URL(urlInput).hostname}`,
        content: cleanContent,
        uploadTime: new Date(),
        wordCount: cleanContent.length,
        type: 'url'
      };
      
      setCurrentDocument(documentData);
      setUrlInput('');
      setActiveInputType('file');
      
      toast({
        title: '网页内容获取成功',
        description: `已成功提取网页内容，共 ${cleanContent.length} 个字符`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: '网页内容获取失败',
        description: error instanceof Error ? error.message : '获取网页内容时出错',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsFileProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    if (!checkLoginStatus()) return;
    
    setIsFileProcessing(true);
    setActiveInputType('text');
    
    try {
      const cleanContent = textInput.trim();
      
      // 检查文档长度（假设平均每页2000字符）
      const estimatedPages = Math.ceil(cleanContent.length / 2000);
      if (estimatedPages > 10) {
        toast({
          title: t('read.onlySupport10Pages'),
          status: 'warning',
          duration: 3000,
        });
        setTextInput('');
        return;
      }
      
      // 重置会话状态，创建新的历史记录
      setChatMessages([]);
      setAnalysisStarted(false);
      setCurrentSessionId('');
      currentSessionIdRef.current = '';
      
      setDocumentContent(cleanContent);
      setPreviewText(cleanContent);
      
      // 创建文档数据
      const documentData: DocumentData = {
        id: Date.now().toString(),
        title: `粘贴文本 - ${new Date().toLocaleString()}`,
        content: cleanContent,
        uploadTime: new Date(),
        wordCount: cleanContent.length,
        type: 'text'
      };
      
      setCurrentDocument(documentData);
      setTextInput('');
      setActiveInputType('file');
      
      toast({
        title: '文本处理成功',
        description: `已成功添加文本内容，共 ${cleanContent.length} 个字符`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: '文本处理失败',
        description: error instanceof Error ? error.message : '处理文本时出错',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsFileProcessing(false);
    }
  };

  const handleStartAnalysis = () => {
    if (!checkLoginStatus()) return;
    
    // 检查免费额度
    if (checkFreeQuotaExceeded('document')) {
      toast({
        title: '已达免费文档分析上限',
        description: `您已用完 ${userStats.free_documents_limit} 次免费文档分析，请开通会员享受更多权益`,
        status: 'warning',
        duration: 4000,
      });
      return;
    }
    
    if (!documentContent || !documentContent.trim()) {
      toast({
        title: '请先上传文件或添加内容',
        description: '需要先选择要分析的内容',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // 再次检查文档长度（假设平均每页2000字符）
    const estimatedPages = Math.ceil(documentContent.trim().length / 2000);
    if (estimatedPages > 10) {
      toast({
        title: t('read.onlySupport10Pages'),
        status: 'warning',
        duration: 3000,
      });
      // 清理状态
      setSelectedFile(null);
      setDocumentContent('');
      setPreviewText('');
      setCurrentDocument(null);
      setChatMessages([]);
      setAnalysisStarted(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // 保存文档数据到本地存储和历史记录
    if (currentDocument) {
      saveDocumentData(currentDocument);
      
      // 添加到用户活动记录
      if (user) {
        addActivity({
          type: 'document',
          title: `分析文档: ${currentDocument.title}`,
          description: `分析了 ${currentDocument.wordCount} 字符的文档内容`
        });
        
        // 更新文档阅读统计
        updateStats('documents');
      }
    }
    
    setAnalysisStarted(true);
    
    // 添加欢迎消息，使用文档标题
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `文件上传：${currentDocument?.title || '未知文档'}（共 ${documentContent.length} 个字符）。

文档内容已经完全加载，我可以基于这些内容为您提供以下服务：

• **内容总结** - 提取文档的核心要点
• **关键信息提取** - 找出重要的数据和观点  
• **主题分析** - 分析文档的主要议题
• **问题解答** - 回答您关于文档的具体问题
• **深度解读** - 提供详细的内容分析

请在下方输入您的具体需求，我会基于文档内容为您提供精准的分析！`,
      timestamp: new Date(),
    };
    
    const initialMessages = [welcomeMessage];
    setChatMessages(initialMessages);
    
    // 保存初始消息到历史记录
    saveOrUpdateHistory(initialMessages);
  };

  const handleSendMessage = async () => {
    if (!checkLoginStatus()) return;
    if (!currentMessage.trim() || !documentContent) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };
    
    const currentMessages = [...chatMessages, userMessage];
    setChatMessages(currentMessages);
    setCurrentMessage('');
    setIsAnalyzing(true);
    
    try {
      // 调用AI API进行分析，使用文档内容
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `你是一个专业的文档分析助手。用户上传了以下文档内容，请基于这个文档内容回答用户的问题：

===== 文档内容开始 =====
${documentContent}
===== 文档内容结束 =====

请仔细分析上述文档内容，并根据用户的具体需求提供准确、有用的信息。要求：
1. 回答必须基于文档内容，不要添加文档中没有的信息
2. 如果用户的问题超出了文档内容的范围，请明确说明
3. 回答要详细、有条理，并尽可能提供具体的信息和见解
4. 可以引用文档中的具体内容来支持你的回答
5. 用中文回答，语言要专业且易懂`
            },
            {
              role: 'user',
              content: currentMessage
            }
          ],
          model: 'gpt-3.5-turbo',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || '抱歉，我无法处理您的请求。请稍后重试。',
        timestamp: new Date(),
      };
      
      const finalMessages = [...currentMessages, assistantMessage];
      setChatMessages(finalMessages);
      
      // 保存到历史记录
      saveOrUpdateHistory(finalMessages);
      
      // 添加活动记录
      if (user) {
        addActivity({
          type: 'document',
          title: `文档分析对话`,
          description: `与AI讨论文档: ${currentDocument?.title || '未知文档'}`
        });
      }
      
    } catch (error) {
      console.error('AI分析错误:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，分析过程中出现了错误。请检查网络连接后重试。如果问题持续存在，请稍后再试。',
        timestamp: new Date(),
      };
      
      const finalMessages = [...currentMessages, errorMessage];
      setChatMessages(finalMessages);
      
      // 即使出错也保存历史记录
      saveOrUpdateHistory(finalMessages);
      
      toast({
        title: '分析失败',
        description: '请检查网络连接后重试',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 复制消息内容
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: '复制成功',
        description: '内容已复制到剪贴板',
        status: 'success',
        duration: 2000,
      });
    }).catch(() => {
      toast({
        title: '复制失败',
        description: '请手动复制内容',
        status: 'error',
        duration: 2000,
      });
    });
  };

  // 收藏消息 - 增加字数显示
  const handleBookmarkMessage = async (message: ChatMessage) => {
    try {
      const existingBookmarks = JSON.parse(localStorage.getItem('bookmarkedMessages') || '[]');
      const bookmarkData = {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
        documentTitle: currentDocument?.title || '未知文档',
        type: 'reading'
      };
      
      const updatedBookmarks = [bookmarkData, ...existingBookmarks];
      localStorage.setItem('bookmarkedMessages', JSON.stringify(updatedBookmarks));
      
      if (user && addFavorite) {
        // 增加收藏内容的字数显示，从200字符增加到800字符
        const description = message.content.length > 3000 ? 
          message.content.substring(0, 3000) + '...' : 
          message.content;
        
        await addFavorite({
          type: 'document',
          title: `文档分析结果 - ${currentDocument?.title || '未知文档'}`,
          description: description
        });
      }
      
      toast({
        title: '收藏成功',
        description: '内容已添加到收藏夹',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: '收藏失败',
        description: '请稍后重试',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf') || file.name.endsWith('.pdf')) return '📄';
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return '📝';
    if (file.type.includes('text') || file.name.endsWith('.txt')) return '📃';
    return '📄';
  };

  const handleNewRead = () => {
    setSelectedFile(null);
    setDocumentContent('');
    setPreviewText('');
    setUrlInput('');
    setTextInput('');
    setChatMessages([]);
    setAnalysisStarted(false);
    setCurrentDocument(null);
    setActiveInputType('file');
    
    // 重置会话ID
    setCurrentSessionId('');
    currentSessionIdRef.current = '';
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast({
      title: t('read.newSession'),
      description: t('read.newSessionDesc'),
      status: 'info',
      duration: 2000,
    });
  };

  const handleClearHistory = () => {
    setChatMessages([]);
    setAnalysisStarted(false);
    // 重置会话ID
    setCurrentSessionId('');
    currentSessionIdRef.current = '';
  };

  // 检查登录状态的函数
  const checkLoginStatus = () => {
    if (!user) {
      onLoginOpen();
      toast({
        title: '请先登录',
        description: '登录后即可使用AI阅读功能',
        status: 'warning',
        duration: 3000,
      });
      return false;
    }
    return true;
  };

  // 页面状态管理
  const saveCurrentState = () => {
    if (user && (documentContent || chatMessages.length > 0)) {
      const state = {
        documentContent,
        previewText,
        chatMessages,
        analysisStarted,
        currentDocument,
        currentSessionId,
        timestamp: Date.now()
      };
      // 这里可以保存到localStorage或其他存储
      localStorage.setItem('read_page_state', JSON.stringify(state));
    }
  };

  const restorePageState = () => {
    if (user) {
      try {
        const savedState = localStorage.getItem('read_page_state');
        if (savedState) {
          const state = JSON.parse(savedState);
          // 检查状态是否有效（不超过1小时）
          const isStateValid = state.timestamp && 
            (Date.now() - state.timestamp) < 3600000; // 1小时
          
          if (isStateValid && (state.documentContent || state.chatMessages?.length > 0)) {
            setDocumentContent(state.documentContent || '');
            setPreviewText(state.previewText || '');
            setChatMessages(state.chatMessages || []);
            setAnalysisStarted(state.analysisStarted || false);
            setCurrentDocument(state.currentDocument || null);
            setCurrentSessionId(state.currentSessionId || '');
            currentSessionIdRef.current = state.currentSessionId || '';
            console.log('恢复阅读页面状态:', state);
          } else {
            // 状态过期或无效，清除状态
            localStorage.removeItem('read_page_state');
          }
        }
      } catch (error) {
        console.error('恢复页面状态失败:', error);
        localStorage.removeItem('read_page_state');
      }
    }
  };

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
  }, [user, documentContent, previewText, analysisStarted, router.events]);

  return (
    <Box minH="100vh" bg="white" _dark={{ bg: 'gray.900' }}>
      <MobileNav onClearHistory={handleClearHistory} onNewRead={handleNewRead} />
      <Box display={{ base: 'none', md: 'block' }}>
        <Sidebar onNewRead={handleNewRead} onClearHistory={handleClearHistory} />
      </Box>
        <Header />
      <Box
        ml={{ base: '0', md: '250px' }}
        pt={{ base: "60px", md: "60px" }}
        transition="margin-left 0.2s"
        minH="calc(100vh - 60px)"
      >
        <Container maxW="1400px" py={8}>
          {!analysisStarted ? (
            // 文件上传和预览界面
            <VStack spacing={8} align="stretch">
              <VStack spacing={4} textAlign="center">
                <Heading 
                  size="xl" 
                  bgGradient="linear(135deg, blue.500, purple.500, pink.500)"
                  bgClip="text"
                  fontWeight="bold"
                >
                  {t('read.title')}
                </Heading>
                <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }}>
                  {t('read.desc')}
                </Text>
              </VStack>
              
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} w="full">
                {/* 左侧输入区域 */}
                <VStack spacing={6} align="stretch">
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">{t('read.selectSource')}</Heading>
                    <Input
                      type="file"
                      accept=".txt,.pdf,.docx"
                      ref={fileInputRef}
                      display="none"
                      onChange={handleFileSelect}
                    />
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Button
                        variant={activeInputType === 'file' ? 'solid' : 'outline'}
                        colorScheme={activeInputType === 'file' ? 'blue' : 'gray'}
                        bg={activeInputType === 'file' ? undefined : useColorModeValue('white', 'gray.700')}
                        borderColor={activeInputType === 'file' ? undefined : useColorModeValue('blue.200', 'blue.600')}
                        borderWidth="2px"
                        _hover={{
                          bg: activeInputType === 'file' ? undefined : useColorModeValue('blue.50', 'blue.900'),
                          borderColor: activeInputType === 'file' ? undefined : useColorModeValue('blue.300', 'blue.500'),
                          transform: 'translateY(-2px)',
                          shadow: 'lg'
                        }}
                        h="120px"
                        flexDir="column"
                        gap={2}
                        onClick={handleUploadClick}
                        isLoading={isFileProcessing && activeInputType === 'file'}
                        loadingText="解析中..."
                        borderRadius="xl"
                        transition="all 0.2s"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Icon as={FiUpload} boxSize={6} />
                        <Text fontWeight="medium" textAlign="center">{t('read.uploadFile')}</Text>
                        <Text 
                          fontSize="xs" 
                          color={activeInputType === 'file' ? 'white' : 'gray.500'} 
                          textAlign="center"
                        >
                        {t('read.supportedFormats')}
                        </Text>
                      </Button>
                      <Button
                        variant={activeInputType === 'url' ? 'solid' : 'outline'}
                        colorScheme={activeInputType === 'url' ? 'blue' : 'gray'}
                        bg={activeInputType === 'url' ? undefined : useColorModeValue('white', 'gray.700')}
                        borderColor={activeInputType === 'url' ? undefined : useColorModeValue('purple.200', 'purple.600')}
                        borderWidth="2px"
                        _hover={{
                          bg: activeInputType === 'url' ? undefined : useColorModeValue('purple.50', 'purple.900'),
                          borderColor: activeInputType === 'url' ? undefined : useColorModeValue('purple.300', 'purple.500'),
                          transform: 'translateY(-2px)',
                          shadow: 'lg'
                        }}
                        h="120px"
                        flexDir="column"
                        gap={2}
                        onClick={() => setActiveInputType('url')}
                        borderRadius="xl"
                        transition="all 0.2s"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Icon as={FiLink} boxSize={6} />
                        <Text fontWeight="medium" textAlign="center">{t('read.webLink')}</Text>
                        <Text 
                          fontSize="xs" 
                          color={activeInputType === 'url' ? 'white' : 'gray.500'} 
                          textAlign="center"
                        >
                          {t('read.webDesc')}
                        </Text>
                      </Button>
                      <Button
                        variant={activeInputType === 'text' ? 'solid' : 'outline'}
                        colorScheme={activeInputType === 'text' ? 'blue' : 'gray'}
                        bg={activeInputType === 'text' ? undefined : useColorModeValue('white', 'gray.700')}
                        borderColor={activeInputType === 'text' ? undefined : useColorModeValue('green.200', 'green.600')}
                        borderWidth="2px"
                        _hover={{
                          bg: activeInputType === 'text' ? undefined : useColorModeValue('green.50', 'green.900'),
                          borderColor: activeInputType === 'text' ? undefined : useColorModeValue('green.300', 'green.500'),
                          transform: 'translateY(-2px)',
                          shadow: 'lg'
                        }}
                        h="120px"
                        flexDir="column"
                        gap={2}
                        onClick={() => setActiveInputType('text')}
                        borderRadius="xl"
                        transition="all 0.2s"
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Icon as={FiCopy} boxSize={6} />
                        <Text fontWeight="medium" textAlign="center">{t('read.pasteText')}</Text>
                        <Text 
                          fontSize="xs" 
                          color={activeInputType === 'text' ? 'white' : 'gray.500'} 
                          textAlign="center"
                        >
                          {t('read.pasteDesc')}
                        </Text>
                      </Button>
                    </SimpleGrid>
                    
                    {/* 网页链接输入区域 */}
                    <Collapse in={activeInputType === 'url'} animateOpacity>
                      <VStack spacing={4} p={4} borderWidth="1px" borderRadius="md" bg={useColorModeValue('blue.50', 'gray.700')} borderColor={useColorModeValue('blue.200', 'gray.600')}>
                        <Input
                          placeholder="https://example.com"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          bg={useColorModeValue('white', 'gray.600')}
                          borderColor={useColorModeValue('gray.200', 'gray.500')}
                          _hover={{
                            borderColor: useColorModeValue('gray.300', 'gray.400'),
                          }}
                          _focus={{
                            borderColor: 'blue.500',
                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                          }}
                        />
                        <HStack w="full" justify="flex-end" spacing={3}>
                          <Button variant="outline" onClick={() => setActiveInputType('file')}>
                          {t('read.cancel')}
                          </Button>
                          <Button
                            colorScheme="blue"
                            onClick={handleUrlSubmit}
                            isDisabled={!urlInput.trim()}
                            isLoading={isFileProcessing && activeInputType === 'url'}
                            loadingText="获取中"
                          >
                          {t('read.getContent')}
                          </Button>
                        </HStack>
                      </VStack>
                    </Collapse>

                    {/* 粘贴文本输入区域 */}
                    <Collapse in={activeInputType === 'text'} animateOpacity>
                      <VStack spacing={4} p={4} borderWidth="1px" borderRadius="md" bg={useColorModeValue('green.50', 'gray.700')} borderColor={useColorModeValue('green.200', 'gray.600')}>
                        <Textarea
                          placeholder={t('read.pasteTextPlaceholder')}
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          rows={8}
                          resize="vertical"
                          bg={useColorModeValue('white', 'gray.600')}
                          borderColor={useColorModeValue('gray.200', 'gray.500')}
                          _hover={{
                            borderColor: useColorModeValue('gray.300', 'gray.400'),
                          }}
                          _focus={{
                            borderColor: 'green.500',
                            boxShadow: '0 0 0 1px var(--chakra-colors-green-500)',
                          }}
                        />
                        <HStack w="full" justify="flex-end" spacing={3}>
                          <Button variant="outline" onClick={() => setActiveInputType('file')}>
                          {t('read.cancel')}
                          </Button>
                          <Button
                            colorScheme="blue"
                            onClick={handleTextSubmit}
                            isDisabled={!textInput.trim()}
                            isLoading={isFileProcessing && activeInputType === 'text'}
                            loadingText="处理中"
                          >
                          {t('read.confirmAdd')}
                          </Button>
                        </HStack>
                      </VStack>
                    </Collapse>
                    
                    {/* 已上传文件显示 */}
                    {selectedFile && (
                      <Box
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        bg={useColorModeValue('blue.50', 'gray.700')}
                        borderColor={useColorModeValue('blue.200', 'gray.600')}
                      >
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Text fontSize="lg">{getFileIcon(selectedFile)}</Text>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                {selectedFile.name}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                              </Text>
                            </VStack>
                          </HStack>
                          <IconButton
                            aria-label="删除文件"
                            icon={<FiX />}
                            size="sm"
                            variant="ghost"
                            onClick={handleRemoveFile}
                          />
                        </HStack>
                      </Box>
                    )}

                    {/* 在上传区块下方增加提示 */}
                    <Box textAlign="center" color="gray.400" fontSize="sm" mt={2}>{t('read.onlySupport10Page')}</Box>

                    {/* 开始智能分析按钮 - 移到上传选项下方 */}
                    <Button
                      colorScheme="purple"
                      size="lg"
                      leftIcon={<Icon as={FiMessageSquare} />}
                      isDisabled={!documentContent || isFileProcessing}
                      onClick={handleStartAnalysis}
                      w="full"
                    >
                      {t('read.startAnalysis')}
                      {isFreeUser ? (
                        <Text fontSize="xs" ml={2} color="gray.300">
                          ({t('credits.remainingFreeDocs')}：{freeQuota - freeUsed}/{freeQuota})
                        </Text>
                      ) : (
                        <Text fontSize="xs" ml={2} color="gray.300">
                          ({creditCost}积分)
                        </Text>
                      )}
                    </Button>
                    
                    {documentContent && (
                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <Text fontSize="sm">
                          {t('read.analysisDesc', { count: documentContent.length.toString() })}
            </Text>
                      </Alert>
                    )}
                  </VStack>
                </VStack>

                {/* 右侧预览区域 */}
                <VStack spacing={4} align="stretch" h="full">
                  <HStack justify="space-between" align="center">
                    <Heading size="md">{t('read.preview')}</Heading>
                    {documentContent && (
                      <Badge colorScheme="green" px={2} py={1}>
                        {documentContent.length} {t('read.characters')}
                      </Badge>
                    )}
                  </HStack>
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={4}
                    minH="400px"
                    maxH="600px"
                    bg={useColorModeValue('gray.50', 'gray.700')}
                    overflowY="auto"
                    flex="1"
                  >
                    {isFileProcessing ? (
                      <Flex justify="center" align="center" h="200px">
              <VStack spacing={4}>
                          <Spinner size="lg" color="purple.500" />
                          <Text>{t('read.processingDocument')}</Text>
                        </VStack>
                      </Flex>
                    ) : previewText ? (
                      <Text 
                        whiteSpace="pre-wrap" 
                        fontSize="sm" 
                        lineHeight="1.6"
                      >
                        {previewText}
                      </Text>
                    ) : (
                      <Flex justify="center" align="center" h="200px">
                        <VStack spacing={2} textAlign="center">
                          <Icon as={FiFile} boxSize={12} color="gray.400" />
                          <Text color="gray.500">
                            {t('read.uploadPlaceholder')}
                          </Text>
                          <Text fontSize="sm" color="gray.400">
                            {t('read.supportedFormats')}
                          </Text>
                          <Text fontSize="sm" color="red.400" fontWeight="bold">
                            {t('read.onlySupport10Pages')}
                          </Text>
                        </VStack>
                      </Flex>
                    )}
                  </Box>
                </VStack>
              </SimpleGrid>
            </VStack>
          ) : (
            // 对话分析界面
            <VStack spacing={6} align="stretch" h="calc(100vh - 140px)">
              {/* 新增：来源标识区 */}
              {currentDocument && (
                <HStack spacing={3} align="center" mb={-2}>
                  {currentDocument.type === 'file' && (
                    <>
                      <Icon as={FiUpload} color="blue.400" />
                      <Text fontWeight="bold" color="blue.600" fontSize="sm">
                        文件上传：{currentDocument.title}
                      </Text>
                    </>
                  )}
                  {currentDocument.type === 'url' && (
                    <>
                      <Icon as={FiLink} color="purple.400" />
                      <Text fontWeight="bold" color="purple.600" fontSize="sm" maxW="320px" isTruncated>
                        网页链接：{(() => {
                          // 省略协议，过长省略中间
                          try {
                            const url = new URL(currentDocument.title.startsWith('http') ? currentDocument.title : 'https://' + currentDocument.title);
                            let display = url.hostname + url.pathname;
                            if (display.length > 28) display = display.slice(0, 14) + '...' + display.slice(-10);
                            return display;
                          } catch {
                            return currentDocument.title;
                          }
                        })()}
                      </Text>
                    </>
                  )}
                  {currentDocument.type === 'text' && (
                    <>
                      <Icon as={FiCopy} color="green.400" />
                      <Text fontWeight="bold" color="green.600" fontSize="sm">
                        粘贴内容：{currentDocument.content.slice(0, 30)}{currentDocument.content.length > 30 ? '...' : ''}
                      </Text>
                    </>
                  )}
                </HStack>
              )}
              {/* 原有顶部区块 */}
              <HStack justify="space-between" align="center">
                <VStack align="start" spacing={1}>
                  <Heading size="lg">{t('read.intelligentAnalysis')}</Heading>
                  <Text color="gray.500" fontSize="sm">
                    {t('read.documentAnalysisDesc', { count: documentContent.length.toString() })}
                  </Text>
                  <Text fontSize="sm" color="red.400" fontWeight="bold">
                    单次文档分析最多支持50轮对话，达到上限后请重新上传文档
                  </Text>
                </VStack>
                <Button
                  variant="outline"
                  leftIcon={<Icon as={FiX} />}
                  onClick={() => setAnalysisStarted(false)}
                >
                  {t('read.backToUpload')}
                </Button>
              </HStack>
              
              <Divider />
              
              {/* 对话区域 */}
              <Box flex="1" overflowY="auto" p={4} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="md">
                <VStack spacing={4} align="stretch">
                  {chatMessages.map((message) => (
                    <Card
                      key={message.id}
                      bg={message.role === 'user' 
                        ? useColorModeValue('blue.50', 'blue.900')
                        : useColorModeValue('white', 'gray.700')
                      }
                      borderLeft={message.role === 'assistant' ? '4px solid' : 'none'}
                      borderLeftColor="purple.400"
                    >
                      <CardHeader pb={2}>
                        <HStack justify="space-between">
                          <Badge colorScheme={message.role === 'user' ? 'blue' : 'purple'}>
                            {message.role === 'user' ? t('read.you') : t('read.aiAssistant')}
                          </Badge>
                          <HStack spacing={2}>
                            <Text fontSize="xs" color="gray.500">
                              {message.timestamp.toLocaleTimeString()}
                            </Text>
                            {message.role === 'assistant' && (
                              <HStack spacing={1}>
                                <Tooltip label={t('read.copyContent')}>
                                  <IconButton
                                    aria-label={t('read.copyContent')}
                                    icon={<FiCopy />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => handleCopyMessage(message.content)}
                                  />
                                </Tooltip>
                                <Tooltip label={t('read.bookmark')}>
                                  <IconButton
                                    aria-label={t('read.bookmark')}
                                    icon={<FiBookmark />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => handleBookmarkMessage(message)}
                                  />
                                </Tooltip>
                              </HStack>
                            )}
                          </HStack>
                        </HStack>
                      </CardHeader>
                      <CardBody pt={0}>
                        <Text whiteSpace="pre-wrap" lineHeight="1.6">{message.content}</Text>
                      </CardBody>
                    </Card>
                  ))}
                  
                  {isAnalyzing && (
                    <Card bg={useColorModeValue('white', 'gray.700')} borderLeft="4px solid" borderLeftColor="purple.400">
                      <CardBody>
                        <HStack spacing={3}>
                          <Spinner size="sm" color="purple.500" />
                          <Text color="gray.500">{t('read.aiAnalyzing')}</Text>
                        </HStack>
                      </CardBody>
                    </Card>
                  )}
                  
                  <div ref={chatEndRef} />
              </VStack>
            </Box>
              
              {/* 输入区域 */}
              <HStack spacing={3}>
                <Textarea
                  placeholder={t('read.inputPlaceholder')}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  resize="none"
                  rows={2}
                  flex="1"
                />
                {isFreeUser ? (
                  <Text fontSize="md" color="white" fontWeight="bold" px={3} py={1} borderRadius="md" bg="purple.500" boxShadow="sm">
                    {t('credits.remainingFreePDF')}：{freeQuota - freeUsed}/{freeQuota}
                  </Text>
                ) : (
                  <Text fontSize="xs" color="gray.300" fontWeight="bold" px={3} py={1} borderRadius="md" bg="purple.500" boxShadow="sm">
                    {t('credits.consume')}{creditCost}{t('credits.credits')}
                  </Text>
                )}
                <Button
                  colorScheme="purple"
                  leftIcon={<Icon as={FiSend} />}
                  onClick={handleSendMessage}
                  isDisabled={!currentMessage.trim() || isAnalyzing}
                  isLoading={isAnalyzing}
                  loadingText={t('read.analyzing')}
                  size="lg"
                  h="auto"
                  py={4}
                >
                  {t('read.send')}
                </Button>
              </HStack>
          </VStack>
          )}
        </Container>
      </Box>
      
      <LoginModal isOpen={isLoginOpen} onClose={onLoginClose} />
    </Box>
  );
} 