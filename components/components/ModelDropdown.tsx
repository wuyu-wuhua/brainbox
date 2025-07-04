import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Tag,
  Avatar,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Portal,
  useColorModeValue,
} from '@chakra-ui/react';
import { useLanguage } from '../contexts/LanguageContext';

interface Model {
  name: string;
  displayName: string;
  logo: string;
  description?: string;
  badge?: string;
  isAdvanced?: boolean;
}

interface ModelDropdownProps {
  model: {
    name: string;
    displayName: string;
    logo: string;
  };
  selectedModel: string;
  onModelSelect: (modelName: string) => void;
}

const ModelDropdown: React.FC<ModelDropdownProps> = ({ model, selectedModel, onModelSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.900', 'white');
  const descColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // 根据当前模型获取同类型的模型
  const getRelatedModels = (currentModelName: string): Model[] => {
    const modelGroups = {
      'GPT': [
        // 常规模型
        { 
          name: 'GPT-3.5-Turbo', 
          displayName: 'GPT-3.5 Turbo', 
          logo: '/images/Chat.jpg',
          description: t('model.gpt35turbo.desc'),
          badge: t('model.badges.fast')
        },
        { 
          name: 'GPT-4', 
          displayName: 'GPT-4', 
          logo: '/images/Chat.jpg',
          description: t('model.gpt4.desc'),
          badge: t('model.badges.general')
        },
        { 
          name: 'GPT-4-Turbo', 
          displayName: 'GPT-4 Turbo', 
          logo: '/images/Chat.jpg',
          description: t('model.gpt4turbo.desc'),
          badge: t('model.badges.latest')
        },
        { 
          name: 'GPT-4o', 
          displayName: 'GPT-4o', 
          logo: '/images/Chat.jpg',
          description: t('model.gpt4o.desc'),
          badge: t('model.badges.optimized')
        },
        // 高级模型
        { 
          name: 'GPT-4.5-Turbo', 
          displayName: 'GPT-4.5 Turbo', 
          logo: '/images/Chat.jpg',
          description: t('model.gpt45turbo.desc'),
          badge: t('model.badges.latest'),
          isAdvanced: true
        }
      ],
      'Claude': [
        // 常规模型
        { 
          name: 'Claude-3-Opus', 
          displayName: 'Claude 3 Opus', 
          logo: '/images/claude.png',
          description: t('model.claude3opus.desc'),
          badge: t('model.badges.powerful')
        },
        { 
          name: 'Claude-3-Sonnet', 
          displayName: 'Claude 3 Sonnet', 
          logo: '/images/claude.png',
          description: t('model.claude3sonnet.desc'),
          badge: t('model.badges.balanced')
        },
        { 
          name: 'Claude-3-Haiku', 
          displayName: 'Claude 3 Haiku', 
          logo: '/images/claude.png',
          description: t('model.claude3haiku.desc'),
          badge: t('model.badges.fast')
        },
        { 
          name: 'Claude-3.5-Sonnet', 
          displayName: 'Claude 3.5 Sonnet', 
          logo: '/images/claude.png',
          description: t('model.claude35sonnet.desc'),
          badge: t('model.badges.newVersion')
        },
        { 
          name: 'Claude-3.5-Opus', 
          displayName: 'Claude 3.5 Opus', 
          logo: '/images/claude.png',
          description: t('model.claude35opus.desc'),
          badge: t('model.badges.recommended')
        },
        // 高级模型
        { 
          name: 'Claude-3.7-Sonnet', 
          displayName: 'Claude 3.7 Sonnet', 
          logo: '/images/claude.png',
          description: t('model.claude37sonnet.desc'),
          badge: t('model.badges.latest'),
          isAdvanced: true
        },
        { 
          name: 'Claude-3.7-Opus', 
          displayName: 'Claude 3.7 Opus', 
          logo: '/images/claude.png',
          description: t('model.claude37opus.desc'),
          badge: t('model.badges.powerful'),
          isAdvanced: true
        },
        { 
          name: 'Claude-4', 
          displayName: 'Claude 4', 
          logo: '/images/claude.png',
          description: t('model.claude4.desc'),
          badge: t('model.badges.latest'),
          isAdvanced: true
        }
      ],
      'Gemini': [
        // 常规模型
        { 
          name: 'Gemini-1.5-Pro', 
          displayName: 'Gemini 1.5 Pro', 
          logo: '/images/gemini.png',
          description: t('model.gemini15pro.desc'),
          badge: t('model.badges.newVersion')
        },
        { 
          name: 'Gemini-1.5-Flash', 
          displayName: 'Gemini 1.5 Flash', 
          logo: '/images/gemini.png',
          description: t('model.gemini15flash.desc'),
          badge: t('model.badges.fast')
        },
        { 
          name: 'Gemini-1.0-Ultra', 
          displayName: 'Gemini 1.0 Ultra', 
          logo: '/images/gemini.png',
          description: t('model.gemini10ultra.desc'),
          badge: t('model.badges.powerful')
        },
        // 高级模型
        { 
          name: 'Gemini-2.5-Flash', 
          displayName: 'Gemini 2.5 Flash', 
          logo: '/images/gemini.png',
          description: t('model.gemini25flash.desc'),
          badge: t('model.badges.latest'),
          isAdvanced: true
        },
        { 
          name: 'Gemini-2.5-Pro', 
          displayName: 'Gemini 2.5 Pro', 
          logo: '/images/gemini.png',
          description: t('model.gemini25pro.desc'),
          badge: t('model.badges.powerful'),
          isAdvanced: true
        }
      ],
      'DeepSeek': [
        // 常规模型
        { 
          name: 'DeepSeek-R1-0528', 
          displayName: 'DeepSeek R1 0528', 
          logo: '/images/deepseek.png',
          description: t('model.deepseekr10528.desc'),
          badge: t('model.badges.general')
        },
        { 
          name: 'DeepSeek-R1-Lite', 
          displayName: 'DeepSeek R1 Lite', 
          logo: '/images/deepseek.png',
          description: t('model.deepseekr1lite.desc'),
          badge: t('model.badges.fast')
        },
        // 高级模型
        { 
          name: 'DeepSeek-V3', 
          displayName: 'DeepSeek V3', 
          logo: '/images/deepseek.png',
          description: t('model.deepseekv3.desc'),
          badge: t('model.badges.latest'),
          isAdvanced: true
        }
      ],
      'Llama': [
        // 常规模型
        { 
          name: 'Llama-3.1-70B', 
          displayName: 'Llama 3.1 70B', 
          logo: '/images/llama.png',
          description: t('model.llama3170b.desc'),
          badge: t('model.badges.powerful')
        },
        { 
          name: 'Llama-3.1-8B', 
          displayName: 'Llama 3.1 8B', 
          logo: '/images/llama.png',
          description: t('model.llama318b.desc'),
          badge: t('model.badges.fast')
        },
        { 
          name: 'Llama-3-70B-Instruct', 
          displayName: 'Llama 3 70B Instruct', 
          logo: '/images/llama.png',
          description: t('model.llama370binstruct.desc'),
          badge: t('model.badges.general')
        },
        { 
          name: 'Code-Llama-70B', 
          displayName: 'Code Llama 70B', 
          logo: '/images/llama.png',
          description: t('model.codellama70b.desc'),
          badge: t('model.badges.programming')
        },
        // 高级模型
        { 
          name: 'Llama-3.1-405B', 
          displayName: 'Llama 3.1 405B', 
          logo: '/images/llama.png',
          description: t('model.llama31405b.desc'),
          badge: t('model.badges.ultra'),
          isAdvanced: true
        }
      ],
      'Grok': [
        // 常规模型
        { 
          name: 'Grok-1.5', 
          displayName: 'Grok 1.5', 
          logo: '/images/grok.png',
          description: t('model.grok15.desc'),
          badge: t('model.badges.fast')
        },
        { 
          name: 'Grok-2', 
          displayName: 'Grok 2', 
          logo: '/images/grok.png',
          description: t('model.grok2.desc'),
          badge: t('model.badges.latest')
        },
        // 高级模型
        { 
          name: 'Grok-Beta', 
          displayName: 'Grok Beta', 
          logo: '/images/grok.png',
          description: t('model.grokbeta.desc'),
          badge: t('model.badges.latest'),
          isAdvanced: true
        }
      ],
      'Qwen': [
        // 常规模型
        { 
          name: 'Qwen-Turbo', 
          displayName: 'Qwen Turbo', 
          logo: '/images/qwen.png',
          description: t('model.qwenturbo.desc'),
          badge: t('model.badges.fast')
        },
        { 
          name: 'Qwen-Max', 
          displayName: 'Qwen Max', 
          logo: '/images/qwen.png',
          description: t('model.qwenmax.desc'),
          badge: t('model.badges.powerful')
        },
        // 高级模型
        { 
          name: 'Qwen-Plus', 
          displayName: 'Qwen Plus', 
          logo: '/images/qwen.png',
          description: t('model.qwenplus.desc'),
          badge: t('model.badges.recommended'),
          isAdvanced: true
        }
      ]
    };

    // 根据当前模型名称确定所属组
    let groupKey = '';
    if (currentModelName.includes('GPT')) groupKey = 'GPT';
    else if (currentModelName.includes('Claude')) groupKey = 'Claude';
    else if (currentModelName.includes('Gemini')) groupKey = 'Gemini';
    else if (currentModelName.includes('DeepSeek')) groupKey = 'DeepSeek';
    else if (currentModelName.includes('Llama')) groupKey = 'Llama';
    else if (currentModelName.includes('Grok')) groupKey = 'Grok';
    else if (currentModelName.includes('Qwen')) groupKey = 'Qwen';

    return modelGroups[groupKey] || [];
  };

  const relatedModels = getRelatedModels(model.name);
  const regularModels = relatedModels.filter(m => !m.isAdvanced);
  const advancedModels = relatedModels.filter(m => m.isAdvanced);

  const handleToggleDropdown = () => {
    if (relatedModels.length > 1) {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsOpen(false);
    }, 800); // 增加延迟时间，方便点击
    setHoverTimeout(timeout);
  };

  const handleModelClick = (modelName: string) => {
    onModelSelect(modelName);
    // 延迟关闭，避免立即消失
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // 处理下拉菜单内的鼠标事件
  const handleDropdownMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const handleDropdownMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsOpen(false);
    }, 300);
    setHoverTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const getBadgeColor = (badge?: string) => {
    // 通过翻译key映射颜色
    const colorMap = {
      [t('model.badges.recommended')]: 'green',
      [t('model.badges.latest')]: 'green',
      [t('model.badges.reasoning')]: 'blue',
      [t('model.badges.newVersion')]: 'blue',
      [t('model.badges.programming')]: 'blue',
      [t('model.badges.math')]: 'blue',
      [t('model.badges.general')]: 'gray',
      [t('model.badges.safe')]: 'gray',
      [t('model.badges.balanced')]: 'gray',
      [t('model.badges.multimodal')]: 'purple',
      [t('model.badges.powerful')]: 'purple',
      [t('model.badges.ultra')]: 'purple',
      [t('model.badges.opensource')]: 'orange',
      [t('model.badges.fast')]: 'cyan',
      [t('model.badges.lightning')]: 'cyan',
      [t('model.badges.lightweight')]: 'cyan',
      [t('model.badges.optimized')]: 'teal',
    };
    
    return colorMap[badge || ''] || 'gray';
  };

  // 检查当前选中的模型是否属于这个组
  const isGroupSelected = () => {
    const relatedModelNames = relatedModels.map(m => m.name);
    return relatedModelNames.includes(selectedModel);
  };

  // 检查当前模型组是否应该高亮（当前选中的模型属于这个组）
  const shouldHighlight = () => {
    return selectedModel === model.name || isGroupSelected();
  };

  return (
    <Box position="relative" ref={dropdownRef}>
      <Tag 
        size={{ base: 'md', md: 'lg' }}
        variant={shouldHighlight() ? "solid" : "ghost"}
        colorScheme={shouldHighlight() ? "purple" : "gray"}
        borderRadius="full" 
        p={2}
        px={4}
        cursor="pointer"
        onClick={handleToggleDropdown}
        onMouseLeave={handleMouseLeave}
        whiteSpace="nowrap"
      >
        <Avatar size="xs" name={model.displayName} src={model.logo} mr={2} />
        {isGroupSelected() && selectedModel !== model.name ? 
          (relatedModels.find(m => m.name === selectedModel)?.displayName || model.displayName) :
          model.displayName
        }
      </Tag>

      {isOpen && relatedModels.length > 1 && (
        <Portal>
          <Box
            position="fixed"
            bg={bgColor}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            boxShadow="xl"
            zIndex={9999}
            minW="300px"
            maxH="450px"
            overflowY="auto"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
            style={{
              top: dropdownRef.current ? 
                dropdownRef.current.getBoundingClientRect().bottom + 8 : 'auto',
              left: dropdownRef.current ? 
                dropdownRef.current.getBoundingClientRect().left + 
                (dropdownRef.current.getBoundingClientRect().width / 2) - 150 : 'auto',
            }}
          >
            <VStack spacing={0} align="stretch" p={3}>
              {/* 常规模型 */}
              {regularModels.length > 0 && (
                <>
                  <Box px={2} py={2}>
                    <Text fontSize="xs" fontWeight="bold" color={descColor} textTransform="uppercase">
                      {t('model.regular')}
                    </Text>
                  </Box>
                  
                  {regularModels.map((relatedModel) => (
                    <Button
                      key={relatedModel.name}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModelClick(relatedModel.name);
                      }}
                      _hover={{ bg: hoverBg }}
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      px={3}
                      borderRadius="md"
                      bg={selectedModel === relatedModel.name ? hoverBg : 'transparent'}
                    >
                      <HStack spacing={3} w="full" align="center">
                        <Avatar size="sm" src={relatedModel.logo} />
                        <VStack align="start" spacing={1} flex={1} minW={0}>
                          <HStack spacing={2} w="full">
                            <Text fontSize="sm" fontWeight="medium" color={textColor} isTruncated>
                              {relatedModel.displayName}
                            </Text>
                            {relatedModel.badge && (
                              <Badge size="sm" colorScheme={getBadgeColor(relatedModel.badge)} flexShrink={0}>
                                {relatedModel.badge}
                              </Badge>
                            )}
                          </HStack>
                          {relatedModel.description && (
                            <Text fontSize="xs" color={descColor} noOfLines={2} w="full">
                              {relatedModel.description}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                    </Button>
                  ))}
                </>
              )}

              {/* 高级模型 */}
              {advancedModels.length > 0 && (
                <>
                  {regularModels.length > 0 && <Divider my={2} />}
                  <Box px={2} py={2}>
                    <Text fontSize="xs" fontWeight="bold" color={descColor} textTransform="uppercase">
                      {t('model.advanced')}
                    </Text>
                  </Box>
                  
                  {advancedModels.map((relatedModel) => (
                    <Button
                      key={relatedModel.name}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModelClick(relatedModel.name);
                      }}
                      _hover={{ bg: hoverBg }}
                      justifyContent="flex-start"
                      h="auto"
                      py={3}
                      px={3}
                      borderRadius="md"
                      bg={selectedModel === relatedModel.name ? hoverBg : 'transparent'}
                    >
                      <HStack spacing={3} w="full" align="center">
                        <Avatar size="sm" src={relatedModel.logo} />
                        <VStack align="start" spacing={1} flex={1} minW={0}>
                          <HStack spacing={2} w="full">
                            <Text fontSize="sm" fontWeight="medium" color={textColor} isTruncated>
                              {relatedModel.displayName}
                            </Text>
                            {relatedModel.badge && (
                              <Badge size="sm" colorScheme={getBadgeColor(relatedModel.badge)} flexShrink={0}>
                                {relatedModel.badge}
                              </Badge>
                            )}
                          </HStack>
                          {relatedModel.description && (
                            <Text fontSize="xs" color={descColor} noOfLines={2} w="full">
                              {relatedModel.description}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                    </Button>
                  ))}
                </>
              )}
            </VStack>
          </Box>
        </Portal>
      )}
    </Box>
  );
};

export default ModelDropdown;