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
import { Message } from '../../types/chat';

interface ScriptViewProps {
  onClose: () => void;
  onSendMessage: (message: Message, aiResponse?: Message, aiPrompt?: string) => void;
}

const ScriptView: React.FC<ScriptViewProps> = ({ onClose, onSendMessage }) => {
  const { t } = useLanguage();
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
          <Icon as={FiFilm} color="purple.500" />
          <Text fontWeight="bold">{t('script.title')}</Text>
        </HStack>
        <Text fontSize="sm" color="purple.400" fontWeight="bold">消耗30积分</Text>
        <IconButton 
          aria-label="关闭" 
          icon={<FaTimes />} 
          size="sm" 
          variant="ghost" 
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
          placeholder={t('script.creativePlaceholder')}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          isDisabled={isLoading}
          rows={4}
          resize="vertical"
        />
      </FormControl>
      
      {/* Footer */}
      <HStack justify="flex-end" w="full" mt={2}>
        <IconButton 
          aria-label="创作剧本" 
          icon={isLoading ? <Spinner size="sm" /> : <FaPaperPlane />} 
          colorScheme="purple" 
          isRound 
          size="md" 
          onClick={handleCreateScript}
          isDisabled={!idea.trim() || isLoading}
          isLoading={isLoading}
        />
        {idea.trim() && (
          <Text fontSize="sm" color="purple.500" fontWeight="bold" ml={2} minW="80px">
            消耗30积分
          </Text>
        )}
      </HStack>
    </VStack>
  );
};

export default ScriptView; 