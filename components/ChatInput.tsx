import React, { ChangeEvent, useRef } from 'react';
import {
  Box,
  Textarea,
  IconButton,
  useColorModeValue,
  Input,
  Flex,
  Tooltip,
  Text,
  HStack,
} from '@chakra-ui/react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onFileUpload?: (file: File) => void;
  placeholder?: string;
  isInitial?: boolean;
  height?: string;
  borderRadius?: string;
  modelType?: 'basic' | 'advanced';
  isFreeUser?: boolean;
  freeQuota?: number;
  freeUsed?: number;
  creditCost?: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onFileUpload,
  placeholder = '请输入消息...',
  isInitial = false,
  height = '100px',
  borderRadius = 'lg',
  modelType = 'basic',
  isFreeUser = false,
  freeQuota = 0,
  freeUsed = 0,
  creditCost = 5,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  return (
    <Box
      position="relative"
      bg={bgColor}
      borderRadius={borderRadius}
      border="1px"
      borderColor={borderColor}
      boxShadow={isInitial ? 'lg' : 'none'}
      maxW={isInitial ? '800px' : 'none'}
      mx="auto"
      _focusWithin={{
        borderColor: 'purple.500',
        boxShadow: '0 0 0 1px var(--chakra-colors-purple-500)',
      }}
    >
      <Textarea
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        border="none"
        _focus={{ border: 'none', boxShadow: 'none' }}
        height={height}
        resize="none"
        pr="80px"
        pb="8"
        bg="transparent"
      />
      <Input
        type="file"
        ref={fileInputRef}
        display="none"
        onChange={handleFileChange}
      />
      <Flex
        position="absolute"
        bottom="2"
        right="2"
        gap={2}
        alignItems="center"
      >
        <IconButton
          icon={<FiPaperclip />}
          aria-label="上传文件"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        />
        
        {/* 动态提示 */}
        {value.trim() && (
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
        
        <Tooltip 
          label="发送消息"
          placement="top"
        >
          <IconButton
            icon={<FiSend />}
            aria-label="发送消息"
            colorScheme="purple"
            size="sm"
            isDisabled={!value.trim()}
            onClick={onSend}
            opacity={value.trim() ? 1 : 0.5}
            transition="opacity 0.2s"
          />
        </Tooltip>
      </Flex>
    </Box>
  );
};

export default ChatInput; 