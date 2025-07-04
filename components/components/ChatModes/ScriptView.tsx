import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  IconButton,
  Textarea,
  Icon,
  useToast,
  Spinner,
  Select,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { FiFilm } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Message } from '../../types/chat';

interface ScriptViewProps {
  onClose: () => void;
  onSendMessage: (message: Message, aiResponse?: Message, aiPrompt?: string) => void;
  isFreeUser?: boolean;
  freeQuota?: number;
  freeUsed?: number;
  creditCost?: number;
}

const ScriptView: React.FC<ScriptViewProps> = ({ 
  onClose, 
  onSendMessage,
  isFreeUser = false,
  freeQuota = 0,
  freeUsed = 0,
  creditCost = 5,
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();
  
  const [idea, setIdea] = useState('');
  const [scriptType, setScriptType] = useState('movie');
  const [genre, setGenre] = useState('drama');
  const [isLoading, setIsLoading] = useState(false);

  const scriptTypes = [
    { value: 'movie', label: t('script.movie') },
    { value: 'tv', label: t('script.tvSeries') },
    { value: 'short', label: t('script.shortFilm') },
    { value: 'stage', label: t('script.webSeries') },
  ];

  const genres = [
    { value: 'drama', label: t('script.drama') },
    { value: 'comedy', label: t('script.comedy') },
    { value: 'action', label: t('script.action') },
    { value: 'romance', label: t('script.romance') },
    { value: 'thriller', label: t('script.thriller') },
    { value: 'horror', label: t('script.horror') },
    { value: 'scifi', label: t('script.scifi') },
    { value: 'fantasy', label: t('script.fantasy') },
  ];

  const handleCreateScript = async () => {
    // 检查用户是否已登录
    if (!user) {
      toast({
        title: '请先登录',
        description: '登录后即可使用AI剧本创作功能',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!idea.trim()) {
      toast({
        title: t('script.pleaseInputIdea'),
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const scriptTypeLabel = scriptTypes.find(type => type.value === scriptType)?.label || t('script.movie');
      const genreLabel = genres.find(g => g.value === genre)?.label || t('script.drama');
      
      // 构建影视剧本创作提示
      const prompt = `请帮我创作一个${scriptTypeLabel}，要求如下：

创意概述：${idea}

剧本类型：${scriptTypeLabel}
题材类型：${genreLabel}

请提供：
1. 故事大纲（包含开头、发展、高潮、结局）
2. 主要角色设定（至少3个主要角色，包含性格特点、背景）
3. 核心冲突和主题
4. 关键场景描述（3-5个重要场景）
5. 对话示例（展示角色个性的经典对话）

请确保剧本结构完整，人物形象鲜明，情节引人入胜。`;

      // 构建用户消息
      const userMessage: Message = {
        content: `${t('script.creating')}${scriptTypeLabel} - ${genreLabel}${t('script.genre')}\n\n${t('script.creative')}：${idea}`,
        isUser: true,
        timestamp: new Date().toISOString(),
      };

      // 发送用户消息，AI回复将通过流式响应处理
      onSendMessage(userMessage, undefined, prompt);
      
      // 清空输入并关闭
      setIdea('');
      onClose();
      
    } catch (error) {
      console.error('剧本创作请求错误:', error);
      toast({
        title: t('script.requestFailed'),
        description: t('script.pleaseTryAgain'),
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateScript();
    }
  };

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
          <Icon as={FiFilm} />
          <Text fontWeight="bold">{t('script.title')}</Text>
        </HStack>
        <IconButton
          icon={<FaTimes />}
          aria-label="关闭"
          variant="ghost"
          size="sm"
          onClick={onClose}
        />
      </HStack>
      
      {/* 剧本类型和题材选择 */}
      <HStack spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">{t('script.scriptType')}</FormLabel>
          <Select 
            value={scriptType} 
            onChange={(e) => setScriptType(e.target.value)}
            size="sm"
          >
            {scriptTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </FormControl>
        
        <FormControl>
          <FormLabel fontSize="sm">{t('script.genreType')}</FormLabel>
          <Select 
            value={genre} 
            onChange={(e) => setGenre(e.target.value)}
            size="sm"
          >
            {genres.map(g => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>
      
      {/* 创意输入 */}
      <FormControl>
        <FormLabel fontSize="sm">{t('script.creative')}</FormLabel>
        <Textarea 
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('script.creativePlaceholder')}
          rows={3}
          resize="none"
          isDisabled={isLoading}
        />
      </FormControl>
      
      {/* Footer */}
      <HStack justify="flex-end" w="full" mt={2}>
        <HStack spacing={2}>
          <IconButton 
            aria-label="发送" 
            icon={isLoading ? <Spinner size="sm" /> : <FaPaperPlane />} 
            colorScheme="purple" 
            isRound 
            size="md" 
            onClick={handleCreateScript}
            isDisabled={!idea.trim() || isLoading}
            isLoading={isLoading}
          />
          {idea.trim() && (
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

export default ScriptView; 