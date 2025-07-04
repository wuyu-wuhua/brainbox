import React from 'react';
import {
  Box,
  Tag,
  Avatar,
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
  Flex,
  Image,
  Text,
  HStack,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';

interface Model {
  name: string;
  logo: string;
}

const models: Model[] = [
  { name: 'GPT-3.5', logo: '/models/gpt3.5.png' },
  { name: 'GPT-4', logo: '/models/gpt4.png' },
  { name: 'Claude-2', logo: '/models/claude2.png' },
  { name: 'DeepSeek-R1-0528', logo: '/models/deepseek.png' },
  { name: 'Gemini Pro', logo: '/models/gemini.png' },
];

const advancedModels: Model[] = [
  { name: 'GPT-4 Turbo', logo: '/models/gpt4.png' },
  { name: 'Claude-3', logo: '/models/claude3.png' },
  { name: 'Gemini Ultra', logo: '/models/gemini.png' },
  { name: 'DeepSeek-V4', logo: '/models/deepseek.png' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  isOpen,
  onOpen,
  onClose,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue(
    selectedModel ? 'purple.500' : 'gray.200',
    selectedModel ? 'purple.400' : 'gray.600'
  );
  const hoverBorderColor = useColorModeValue('purple.400', 'purple.300');

  // 根据模型名称确定积分消耗
  const getCreditCost = (modelName: string) => {
    // 高级模型列表
    const advancedModelNames = [
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
    
    return advancedModelNames.includes(modelName) ? 20 : 5;
  };

  return (
    <>
      <Box p={4} borderBottom="1px" borderColor="gray.200">
        <Flex wrap="wrap" gap={2}>
          {models.slice(0, 5).map((model) => (
            <Tooltip key={model.name} label={`每次对话消耗${getCreditCost(model.name)}积分`}>
              <Tag
                size="lg"
                variant={selectedModel === model.name ? "solid" : "ghost"}
                colorScheme={selectedModel === model.name ? "purple" : "gray"}
                borderRadius="full"
                p={2}
                px={4}
                cursor="pointer"
                onClick={() => onModelSelect(model.name)}
              >
                <Avatar size="xs" name={model.name} src={model.logo} mr={2} />
                {model.name}
              </Tag>
            </Tooltip>
          ))}
          <Tag
            size="lg"
            variant="ghost"
            borderRadius="full"
            p={2}
            px={4}
            onClick={onOpen}
            cursor="pointer"
          >
            更多
          </Tag>
        </Flex>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>所有模型</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>常规模型</Tab>
                <Tab>高级模型</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <SimpleGrid columns={2} spacing={4}>
                    {models.map(model => (
                      <Tooltip key={model.name} label={`每次对话消耗${getCreditCost(model.name)}积分`}>
                        <Button
                          justifyContent="flex-start"
                          onClick={() => {
                            onModelSelect(model.name);
                            onClose();
                          }}
                        >
                          <Avatar size="xs" src={model.logo} mr={2}/> {model.name}
                        </Button>
                      </Tooltip>
                    ))}
                  </SimpleGrid>
                </TabPanel>
                <TabPanel>
                  <SimpleGrid columns={2} spacing={4}>
                    {advancedModels.map(model => (
                      <Tooltip key={model.name} label={`每次对话消耗${getCreditCost(model.name)}积分`}>
                        <Button
                          justifyContent="flex-start"
                          onClick={() => {
                            onModelSelect(model.name);
                            onClose();
                          }}
                        >
                          <Avatar size="xs" src={model.logo} mr={2}/> {model.name}
                        </Button>
                      </Tooltip>
                    ))}
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ModelSelector; 