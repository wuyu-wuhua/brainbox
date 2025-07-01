import React, { useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
  Tag,
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
import { FiEdit } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';
import { Message } from '../../types/chat';

interface WriteViewProps {
  onClose: () => void;
  onSendMessage: (message: Message, aiResponse?: Message, aiPrompt?: string) => void;
  isFreeUser?: boolean;
  freeQuota?: number;
  freeUsed?: number;
  creditCost?: number;
}

const WriteView: React.FC<WriteViewProps> = ({ 
  onClose, 
  onSendMessage,
  isFreeUser = false,
  freeQuota = 0,
  freeUsed = 0,
  creditCost = 5,
}) => {
  const { t } = useLanguage();
  const toast = useToast();
  
  const [inputText, setInputText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('xiaohongshu');
  const [selectedTone, setSelectedTone] = useState('formal');
  const [selectedLength, setSelectedLength] = useState('medium');
  const [selectedLanguage, setSelectedLanguage] = useState('zhCN');
  const [isLoading, setIsLoading] = useState(false);

  // 用useDisclosure控制每个Popover
  const toneDisclosure = useDisclosure();
  const lengthDisclosure = useDisclosure();
  const languageDisclosure = useDisclosure();

  const topicTags = [
    { key: 'xiaohongshu', label: t('write.topics.xiaohongshu') },
    { key: 'douyin', label: t('write.topics.douyin') },
    { key: 'moments', label: t('write.topics.moments') },
    { key: 'weibo', label: t('write.topics.weibo') },
    { key: 'marketing', label: t('write.topics.marketing') },
    { key: 'brainstorm', label: t('write.topics.brainstorm') },
    { key: 'outline', label: t('write.topics.outline') },
    { key: 'monthlyReport', label: t('write.topics.monthlyReport') },
    { key: 'weeklyReport', label: t('write.topics.weeklyReport') },
  ];

  const toneOptions = [
    { key: 'formal', label: t('write.tones.formal') },
    { key: 'casual', label: t('write.tones.casual') },
    { key: 'friendly', label: t('write.tones.friendly') },
    { key: 'professional', label: t('write.tones.professional') },
  ];

  const lengthOptions = [
    { key: 'short', label: t('write.lengths.short') },
    { key: 'medium', label: t('write.lengths.medium') },
    { key: 'long', label: t('write.lengths.long') },
  ];

  const languageOptions = [
    { key: 'zhCN', label: t('write.languages.zhCN') },
    { key: 'en', label: t('write.languages.en') },
  ];

  const handleWrite = async () => {
    if (!inputText.trim()) {
      toast({
        title: '请输入写作主题',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const selectedTopicLabel = topicTags.find(topic => topic.key === selectedTopic)?.label || topicTags[0].label;
      const selectedToneLabel = toneOptions.find(tone => tone.key === selectedTone)?.label || toneOptions[0].label;
      const selectedLengthLabel = lengthOptions.find(length => length.key === selectedLength)?.label || lengthOptions[0].label;
      const selectedLanguageLabel = languageOptions.find(lang => lang.key === selectedLanguage)?.label || languageOptions[0].label;
      
      // 构建详细的写作提示
      const prompt = `请帮我写一篇关于"${inputText}"的${selectedTopicLabel}内容。

要求：
- 语气：${selectedToneLabel}
- 长度：${selectedLengthLabel}
- 语言：${selectedLanguageLabel}
- 内容类型：${selectedTopicLabel}

请根据以上要求，创作一篇高质量的内容。`;

      // 构建用户消息 - 显示主题和选择的标签
      const userMessage: Message = {
        content: `${inputText}

类型：${selectedTopicLabel} | 语气：${selectedToneLabel} | 长度：${selectedLengthLabel} | 语言：${selectedLanguageLabel}`,
        isUser: true,
        timestamp: new Date().toISOString(),
      };

      // 发送用户消息，AI回复将通过流式响应处理
      onSendMessage(userMessage, undefined, prompt);
      
      // 清空输入并关闭
      setInputText('');
      onClose();
      
    } catch (error) {
      console.error('写作请求错误:', error);
      toast({
        title: '请求失败',
        description: '请稍后重试',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicSelect = (topicKey: string) => {
    setSelectedTopic(topicKey);
  };

  const handleToneSelect = (toneKey: string) => {
    setSelectedTone(toneKey);
    toneDisclosure.onClose();
  };

  const handleLengthSelect = (lengthKey: string) => {
    setSelectedLength(lengthKey);
    lengthDisclosure.onClose();
  };

  const handleLanguageSelect = (langKey: string) => {
    setSelectedLanguage(langKey);
    languageDisclosure.onClose();
  };

  const selectedToneLabel = toneOptions.find(tone => tone.key === selectedTone)?.label || toneOptions[0].label;
  const selectedLengthLabel = lengthOptions.find(length => length.key === selectedLength)?.label || lengthOptions[0].label;
  const selectedLanguageLabel = languageOptions.find(lang => lang.key === selectedLanguage)?.label || languageOptions[0].label;

  return (
    <VStack 
      w="full" 
      p={4} 
      bg="white" 
      _dark={{ bg: 'gray.700', borderColor: 'gray.600' }} 
      borderRadius="xl" 
      border="1px solid" 
      borderColor="gray.200"
      spacing={4}
      align="stretch"
    >
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Icon as={FiEdit} />
          <Text fontWeight="bold">{t('write.title')}</Text>
        </HStack>
        <IconButton 
          aria-label={t('common.close')} 
          icon={<FaTimes />} 
          size="sm" 
          variant="ghost" 
          onClick={onClose} 
        />
      </HStack>
      
      {/* Topic Tags */}
      <Flex wrap="wrap" gap={2}>
        {topicTags.map((tag) => (
          <Tag 
            key={tag.key} 
            variant={selectedTopic === tag.key ? 'solid' : 'subtle'} 
            colorScheme={selectedTopic === tag.key ? 'red' : 'gray'} 
            cursor="pointer"
            onClick={() => handleTopicSelect(tag.key)}
            _hover={{ opacity: 0.8 }}
          >
            {tag.label}
          </Tag>
        ))}
      </Flex>
      
      {/* Textarea */}
      <Textarea 
        placeholder={t('write.placeholder')} 
        minH="120px" 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        isDisabled={isLoading}
      />
      {/* 语气、长度、语言 下拉选择器 + 发送按钮 水平对齐 */}
      <HStack spacing={3} mt={2} w="full" justify="space-between">
        <HStack spacing={3}>
          {/* 语气 */}
          <Popover isOpen={toneDisclosure.isOpen} onClose={toneDisclosure.onClose}>
            <PopoverTrigger>
              <Button size="sm" variant="outline" onClick={toneDisclosure.onOpen}>
                                    {t('write.tone')}：{selectedToneLabel}
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
                      colorScheme="blue"
                      onClick={() => handleToneSelect(option.key)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          {/* 长度 */}
          <Popover isOpen={lengthDisclosure.isOpen} onClose={lengthDisclosure.onClose}>
            <PopoverTrigger>
              <Button size="sm" variant="outline" onClick={lengthDisclosure.onOpen}>
                                    {t('write.length')}：{selectedLengthLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent w="120px">
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <VStack align="stretch" spacing={1}>
                  {lengthOptions.map(option => (
                    <Button
                      key={option.key}
                      size="sm"
                      variant={selectedLength === option.key ? "solid" : "ghost"}
                      colorScheme="green"
                      onClick={() => handleLengthSelect(option.key)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          {/* 语言 */}
          <Popover isOpen={languageDisclosure.isOpen} onClose={languageDisclosure.onClose}>
            <PopoverTrigger>
              <Button size="sm" variant="outline" onClick={languageDisclosure.onOpen}>
                {t('write.language')}：{selectedLanguageLabel}
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
                      colorScheme="purple"
                      onClick={() => handleLanguageSelect(option.key)}
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
            onClick={handleWrite}
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
                  {t('credits.consume')}
                </Text>
                <Text fontSize="xs" color="purple.700" _dark={{ color: 'purple.200' }} fontWeight="bold">
                  {creditCost}{t('credits.credits')}
                </Text>
              </HStack>
            )
          )}
        </HStack>
      </HStack>
    </VStack>
  );
};

export default WriteView; 