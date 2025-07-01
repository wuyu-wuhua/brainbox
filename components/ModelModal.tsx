import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  SimpleGrid,
  Button,
  Avatar,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { useLanguage } from '../contexts/LanguageContext';

const models = [
  // DeepSeek系列
  { name: 'DeepSeek-R1-0528', logo: '/images/deepseek.png' },
  { name: 'DeepSeek-Coder', logo: '/images/deepseek.png' },
  { name: 'DeepSeek-Math', logo: '/images/deepseek.png' },
  
  // GPT系列
  { name: 'GPT-4', logo: '/images/Chat.jpg' },
  { name: 'GPT-3.5-Turbo', logo: '/images/Chat.jpg' },
  { name: 'GPT-4o-mini', logo: '/images/Chat.jpg' },
  
  // Claude系列
  { name: 'Claude-3.5', logo: '/images/claude.png' },
  { name: 'Claude-3-Sonnet', logo: '/images/claude.png' },
  { name: 'Claude-3-Haiku', logo: '/images/claude.png' },
  
  // Gemini系列
  { name: 'Gemini-Pro', logo: '/images/gemini.png' },
  { name: 'Gemini-Flash', logo: '/images/gemini.png' },
  { name: 'Gemini-2.0-Flash', logo: '/images/gemini.png' },
  
  // Llama系列
  { name: 'Llama-3.1', logo: '/images/llama.png' },
  { name: 'Code-Llama', logo: '/images/llama.png' },
  { name: 'Llama-3.3', logo: '/images/llama.png' },
  
  // Grok系列
  { name: 'Grok-2', logo: '/images/grok.png' },
  { name: 'Grok-1.5', logo: '/images/grok.png' },
  
  // Qwen系列
  { name: 'Qwen-Max', logo: '/images/qwen.png' },
  { name: 'Qwen-Turbo', logo: '/images/qwen.png' },
];

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel?: (modelName: string) => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ isOpen, onClose, onSelectModel }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { t } = useLanguage();

  const advancedModels = [
    // DeepSeek高级系列
    { 
      name: 'DeepSeek-V3', 
      logo: '/images/deepseek.png', 
      description: 'DeepSeek最新一代模型',
      badge: '最新'
    },
    
    // GPT高级系列
    { 
      name: 'GPT-4.5-Turbo', 
      logo: '/images/Chat.jpg', 
      description: 'GPT-4.5最新版本',
      badge: '最新'
    },
    
    // Claude高级系列
    { 
      name: 'Claude-3.7-Sonnet', 
      logo: '/images/claude.png', 
      description: 'Claude 3.7 Sonnet版本',
      badge: '最新'
    },
    { 
      name: 'Claude-3.7-Opus', 
      logo: '/images/claude.png', 
      description: 'Claude 3.7 Opus版本',
      badge: '超强'
    },
    { 
      name: 'Claude-4', 
      logo: '/images/claude.png', 
      description: 'Claude最新一代模型',
      badge: '最新'
    },
    
    // Gemini高级系列
    { 
      name: 'Gemini-2.5-Flash', 
      logo: '/images/gemini.png', 
      description: 'Google 2.5快速版本',
      badge: '最新'
    },
    { 
      name: 'Gemini-2.5-Pro', 
      logo: '/images/gemini.png', 
      description: 'Google 2.5专业版本',
      badge: '超强'
    },
    
    // Llama高级系列
    { 
      name: 'Llama-3.1-405B', 
      logo: '/images/llama.png', 
      description: 'Meta超大参数模型',
      badge: '超大'
    },
    
    // Grok高级系列
    { 
      name: 'Grok-Beta', 
      logo: '/images/grok.png', 
      description: 'xAI最新测试版本，具有前沿AI能力',
      badge: '测试版'
    },
    { 
      name: 'Grok-2-Pro', 
      logo: '/images/grok.png', 
      description: 'Grok 2专业版本，强化推理能力',
      badge: '专业版'
    },
    
    // Qwen高级系列
    { 
      name: 'Qwen-Plus', 
      logo: '/images/qwen.png', 
      description: 'Qwen增强版本，在各项任务中表现出色',
      badge: '增强版'
    },
    { 
      name: 'Qwen-Max-Pro', 
      logo: '/images/qwen.png', 
      description: '阿里云最强大的AI模型专业版',
      badge: '专业版'
    },
  ];

  const handleModelSelect = (modelName: string) => {
    if (onSelectModel) {
      onSelectModel(modelName);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", md: "2xl" }}
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent 
        margin={{ base: 0, md: 'auto' }} 
        bg={bgColor}
        maxH={{ base: "100vh", md: "80vh" }}
        overflowY="auto"
      >
        <ModalHeader>{t('model.allModels')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs isFitted variant="enclosed">
            <TabList mb="1em">
              <Tab>{t('model.regular')}</Tab>
              <Tab>{t('model.advanced')}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {models.map(model => (
                    <Button
                      key={model.name}
                      justifyContent="flex-start"
                      onClick={() => handleModelSelect(model.name)}
                      size={{ base: 'lg', md: 'md' }}
                      h={{ base: '50px', md: '40px' }}
                      variant="outline"
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                    >
                      <Avatar size="xs" src={model.logo} mr={2}/> 
                      <Text isTruncated>{model.name}</Text>
                    </Button>
                  ))}
                </SimpleGrid>
              </TabPanel>
              <TabPanel>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {advancedModels.map((model) => (
                    <Button
                      key={model.name}
                      justifyContent="flex-start"
                      onClick={() => handleModelSelect(model.name)}
                      size={{ base: 'lg', md: 'md' }}
                      h={{ base: '80px', md: '70px' }}
                      flexDirection="column"
                      alignItems="flex-start"
                      p={4}
                      variant="outline"
                      _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                      whiteSpace="normal"
                    >
                      <HStack w="full" justify="space-between" mb={2}>
                        <HStack spacing={2} flex={1} minW={0}>
                          <Avatar size="xs" src={model.logo} />
                          <Text fontSize="sm" fontWeight="medium" isTruncated>
                            {model.name}
                          </Text>
                        </HStack>
                        <Badge colorScheme="purple" size="sm" flexShrink={0}>
                          {model.badge}
                        </Badge>
                      </HStack>
                      <Text 
                        fontSize="xs" 
                        color="gray.500" 
                        textAlign="left"
                        lineHeight="1.3"
                        w="full"
                        display="block"
                      >
                        {model.description}
                      </Text>
                    </Button>
                  ))}
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ModelModal; 