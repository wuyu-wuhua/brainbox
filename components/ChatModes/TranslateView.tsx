import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Textarea,
  Button,
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  useToast,
  Spinner,
  useDisclosure,
} from '@chakra-ui/react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { FiGlobe } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Message } from '../../types/chat';

interface TranslateViewProps {
  onClose: () => void;
  onSendMessage: (message: Message, aiResponse: Message) => void;
  selectedModel?: {
    name: string;
    displayName: string;
    logo: string;
  };
  isFreeUser?: boolean;
  freeQuota?: number;
  freeUsed?: number;
  creditCost?: number;
}

const TranslateView: React.FC<TranslateViewProps> = ({ 
  onClose, 
  onSendMessage,
  selectedModel,
  isFreeUser = false,
  freeQuota = 0,
  freeUsed = 0,
  creditCost = 5,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();
  
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('zhCN');
  const [selectedTone, setSelectedTone] = useState('spoken');
  const [isLoading, setIsLoading] = useState(false);

  const languageOptions = [
    { key: 'zhCN', label: t('write.languages.zhCN'), code: 'zh' },
    { key: 'en', label: t('write.languages.en'), code: 'en' },
  ];

  const toneOptions = [
    { key: 'spoken', label: t('quickTranslate.tones.spoken') },
    { key: 'written', label: t('quickTranslate.tones.written') },
    { key: 'formal', label: t('quickTranslate.tones.formal') },
    { key: 'business', label: t('quickTranslate.tones.business') },
  ];

  const langDisclosure = useDisclosure();
  const toneDisclosure = useDisclosure();

  const handleTranslate = async () => {
    // 检查用户是否已登录
    if (!user) {
      toast({
        title: '请先登录',
        description: '登录后即可使用AI翻译功能',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!inputText.trim()) {
      toast({
        title: '请输入要翻译的文本',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const selectedLangOption = languageOptions.find(lang => lang.key === selectedLanguage);
      const targetLangCode = selectedLangOption?.code || 'zh';
      const selectedToneLabel = toneOptions.find(tone => tone.key === selectedTone)?.label || toneOptions[0].label;
      
      // 构建用户消息 - 简洁版本，但包含选择的标签信息
      const userMessage: Message = {
        content: `${inputText}

翻译到：${selectedLangOption?.label} | 语气：${selectedToneLabel}`,
        isUser: true,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          from: 'auto',
          to: targetLangCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 构建AI回复消息 - 详细版本
        const aiMessage: Message = {
          content: `我来帮您翻译这段文本。

**翻译设置：**
- 目标语言：${selectedLangOption?.label}
- 语气风格：${selectedToneLabel}

**翻译结果：**
${data.translatedText}

**原文：** ${inputText}
**检测到的源语言：** ${data.detectedLanguage === 'zh' ? '中文' : data.detectedLanguage === 'en' ? '英文' : data.detectedLanguage}`,
          isUser: false,
          timestamp: new Date().toISOString(),
          avatar: selectedModel?.logo || '/images/ai-avatar.png',
          modelName: selectedModel?.displayName || '百度翻译',
        };

        // 发送消息到主聊天界面
        onSendMessage(userMessage, aiMessage);
        
        // 清空输入并关闭
        setInputText('');
        onClose();
        
        toast({
          title: '翻译成功',
          status: 'success',
          duration: 2000,
        });
      } else {
        toast({
          title: '翻译失败',
          description: data.details || data.error,
          status: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('翻译请求错误:', error);
      toast({
        title: '网络错误',
        description: '请检查网络连接后重试',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSelect = (langKey: string) => {
    setSelectedLanguage(langKey);
    langDisclosure.onClose();
  };

  const handleToneSelect = (toneKey: string) => {
    setSelectedTone(toneKey);
    toneDisclosure.onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const selectedLangLabel = languageOptions.find(lang => lang.key === selectedLanguage)?.label || languageOptions[0].label;
  const selectedToneLabel = toneOptions.find(tone => tone.key === selectedTone)?.label || toneOptions[0].label;

  return (
    <VStack 
      w="full" 
      p={4} 
      bg="white" 
      borderRadius="xl" 
      border="1px solid" 
      borderColor="gray.200"
      _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
      spacing={4}
      align="stretch"
    >
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Icon as={FiGlobe} />
          <Text fontWeight="bold">{t('quickTranslate.title')}</Text>
        </HStack>
        <IconButton
          icon={<FaTimes />}
          aria-label="关闭"
          variant="ghost"
          size="sm"
          onClick={onClose}
        />
      </HStack>

      {/* 输入框 */}
      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('quickTranslate.placeholder')}
        rows={3}
        resize="none"
        isDisabled={isLoading}
      />

      {/* 语气、语言 下拉选择器 + 发送按钮 水平对齐 */}
      <HStack spacing={3} mt={2} w="full" justify="space-between">
        <HStack spacing={3}>
          {/* 目标语言 */}
          <Popover isOpen={langDisclosure.isOpen} onClose={langDisclosure.onClose}>
            <PopoverTrigger>
              <Button size="sm" variant="outline" onClick={langDisclosure.onOpen}>
                                    {t('quickTranslate.translateTo')}：{selectedLangLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent w="120px">
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <VStack align="stretch" spacing={1}>
                  {languageOptions.map(option => (
                    <Button
                      key={option.key}
                      size="sm"
                      variant={selectedLanguage === option.key ? "solid" : "ghost"}
                      colorScheme="blue"
                      onClick={() => handleLanguageSelect(option.key)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          {/* 语气 */}
          <Popover isOpen={toneDisclosure.isOpen} onClose={toneDisclosure.onClose}>
            <PopoverTrigger>
              <Button size="sm" variant="outline" onClick={toneDisclosure.onOpen}>
                                    {t('quickTranslate.tone')}：{selectedToneLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent w="120px">
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <VStack align="stretch" spacing={1}>
                  {toneOptions.map(option => (
                    <Button
                      key={option.key}
                      size="sm"
                      variant={selectedTone === option.key ? "solid" : "ghost"}
                      colorScheme="green"
                      onClick={() => handleToneSelect(option.key)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </HStack>
        <HStack spacing={2}>
          <IconButton 
            aria-label="发送" 
            icon={isLoading ? <Spinner size="sm" /> : <FaPaperPlane />} 
            colorScheme="purple" 
            isRound 
            size="md" 
            onClick={handleTranslate}
            isDisabled={!inputText.trim() || isLoading}
            isLoading={isLoading}
          />
          {inputText.trim() && (
            isFreeUser ? (
              <HStack 
                spacing={1} 
                bg="purple.50" 
                _dark={{ bg: 'purple.900', borderColor: 'purple.700' }}
                px={2} 
                py={1} 
                borderRadius="md"
                border="1px solid"
                borderColor="purple.200"
              >
                <Text fontSize="xs" color="purple.600" _dark={{ color: 'purple.300' }} fontWeight="medium">
                  {t('credits.remainingFreeChats')}：
                </Text>
                <Text fontSize="xs" color="purple.700" _dark={{ color: 'purple.200' }} fontWeight="bold">
                  {freeQuota - freeUsed}/{freeQuota}
                </Text>
              </HStack>
            ) : (
              <HStack 
                spacing={1} 
                bg="purple.50" 
                _dark={{ bg: 'purple.900', borderColor: 'purple.700' }}
                px={2} 
                py={1} 
                borderRadius="md"
                border="1px solid"
                borderColor="purple.200"
              >
                <Text fontSize="xs" color="purple.600" _dark={{ color: 'purple.300' }} fontWeight="medium">
                  消耗
                </Text>
                <Text fontSize="xs" color="purple.700" _dark={{ color: 'purple.200' }} fontWeight="bold">
                  {creditCost}积分
                </Text>
              </HStack>
            )
          )}
        </HStack>
      </HStack>
    </VStack>
  );
};

export default TranslateView; 