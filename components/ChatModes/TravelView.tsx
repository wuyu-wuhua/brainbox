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
  Input,
  Flex,
  Tag,
  useToast,
  Spinner,
  useDisclosure,
} from '@chakra-ui/react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import { FiMap } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';
import { Message } from '../../types/chat';

interface TravelViewProps {
  onClose: () => void;
  onSendMessage: (message: Message, aiResponse?: Message) => void;
}

const TravelView: React.FC<TravelViewProps> = ({ onClose, onSendMessage }) => {
  const { t } = useLanguage();
  const toast = useToast();
  
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('');
  const [details, setDetails] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('comfort');
  const [selectedPace, setSelectedPace] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);

  const interestTags = [
    { key: 'food', label: t('travel.interests.food') },
    { key: 'shopping', label: t('travel.interests.shopping') },
    { key: 'history', label: t('travel.interests.history') },
    { key: 'nature', label: t('travel.interests.nature') },
    { key: 'hiking', label: t('travel.interests.hiking') },
    { key: 'museum', label: t('travel.interests.museum') },
  ];

  const budgetOptions = [
    { key: 'economy', label: t('travel.budgets.economy') },
    { key: 'comfort', label: t('travel.budgets.comfort') },
    { key: 'luxury', label: t('travel.budgets.luxury') },
  ];

  const paceOptions = [
    { key: 'relaxed', label: t('travel.paces.relaxed') },
    { key: 'normal', label: t('travel.paces.normal') },
    { key: 'intensive', label: t('travel.paces.intensive') },
  ];

  const budgetDisclosure = useDisclosure();
  const paceDisclosure = useDisclosure();

  const handlePlan = async () => {
    if (!destination.trim()) {
      toast({
        title: '请输入目的地',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!days.trim()) {
      toast({
        title: '请输入出行天数',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const selectedBudgetLabel = budgetOptions.find(budget => budget.key === selectedBudget)?.label || budgetOptions[1].label;
      const selectedPaceLabel = paceOptions.find(pace => pace.key === selectedPace)?.label || paceOptions[1].label;
      const selectedInterestLabels = selectedInterests.map(interest => 
        interestTags.find(tag => tag.key === interest)?.label
      ).filter(Boolean).join('、');
      
      // 构建详细的旅行规划提示
      const prompt = `请帮我制定一个详细的旅行规划：

目的地：${destination}
出行天数：${days}天
预算类型：${selectedBudgetLabel}
旅行节奏：${selectedPaceLabel}
${selectedInterestLabels ? `兴趣偏好：${selectedInterestLabels}` : ''}
${details.trim() ? `其他要求：${details}` : ''}

请为我制定一个详细的旅行计划，包括：
1. 每日行程安排
2. 推荐景点和活动
3. 住宿建议
4. 交通方式
5. 预算估算
6. 注意事项和小贴士

请确保计划符合我的预算类型和旅行节奏偏好。`;

      // 构建用户消息
      const userMessage: Message = {
        content: prompt,
        isUser: true,
        timestamp: new Date().toISOString(),
      };

      // 发送用户消息，AI回复将通过流式响应处理
      onSendMessage(userMessage);
      
      // 清空输入并关闭
      setDestination('');
      setDays('');
      setDetails('');
      setSelectedInterests([]);
      onClose();
      
    } catch (error) {
      console.error('旅行规划请求错误:', error);
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

  const handleInterestToggle = (interestKey: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestKey) 
        ? prev.filter(key => key !== interestKey)
        : [...prev, interestKey]
    );
  };

  const handleBudgetSelect = (budgetKey: string) => {
    setSelectedBudget(budgetKey);
    budgetDisclosure.onClose();
  };

  const handlePaceSelect = (paceKey: string) => {
    setSelectedPace(paceKey);
    paceDisclosure.onClose();
  };

  const selectedBudgetLabel = budgetOptions.find(budget => budget.key === selectedBudget)?.label || budgetOptions[1].label;
  const selectedPaceLabel = paceOptions.find(pace => pace.key === selectedPace)?.label || paceOptions[1].label;

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
          <Icon as={FiMap} />
          <Text fontWeight="bold">{t('travel.title')}</Text>
        </HStack>
        <Text fontSize="sm" color="purple.400" fontWeight="bold">消耗20积分</Text>
        <IconButton 
          aria-label={t('common.close')} 
          icon={<FaTimes />} 
          size="sm" 
          variant="ghost" 
          onClick={onClose} 
        />
      </HStack>
      
      {/* Inputs */}
      <HStack>
        <Input 
          placeholder={t('travel.destination')} 
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          isDisabled={isLoading}
        />
        <Input 
          placeholder={t('travel.days')} 
          value={days}
          onChange={(e) => setDays(e.target.value)}
          isDisabled={isLoading}
        />
      </HStack>

      {/* Interests */}
      <Flex wrap="wrap" gap={2}>
        <Text fontSize="sm" w="full" mb={1} color="gray.500">{t('travel.interests')}:</Text>
        {interestTags.map(tag => (
          <Tag 
            key={tag.key} 
            variant={selectedInterests.includes(tag.key) ? 'solid' : 'outline'} 
            colorScheme={selectedInterests.includes(tag.key) ? 'blue' : 'gray'}
            cursor="pointer"
            onClick={() => handleInterestToggle(tag.key)}
            _hover={{ opacity: 0.8 }}
          >
            {tag.label}
          </Tag>
        ))}
      </Flex>
      
      {/* Details Textarea */}
      <Textarea 
        placeholder={t('travel.details')} 
        minH="80px" 
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        isDisabled={isLoading}
      />
      
      {/* Footer */}
      <HStack justify="flex-end" w="full" mt={2}>
        <IconButton 
          aria-label="发送" 
          icon={isLoading ? <Spinner size="sm" /> : <FaPaperPlane />} 
          colorScheme="pink" 
          isRound 
          size="md" 
          onClick={handlePlan}
          isDisabled={!destination.trim() || !days.trim() || isLoading}
          isLoading={isLoading}
        />
        {(destination.trim() || days.trim()) && (
          <Text fontSize="sm" color="purple.500" fontWeight="bold" ml={2} minW="80px">
            消耗20积分
          </Text>
        )}
      </HStack>
    </VStack>
  );
};

export default TravelView; 