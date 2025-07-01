import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Avatar,
  Flex,
  useColorModeValue,
  IconButton,
  HStack,
  useToast,
  useClipboard,
} from '@chakra-ui/react';
import { FiCopy, FiRefreshCw, FiHeart } from 'react-icons/fi';
import { formatMessageTime } from '../utils/dateUtils';
import { useUserActivity } from '../contexts/UserActivityContext';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
  avatar?: string;
  modelName?: string;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  onFavorite?: () => void;
  messageId?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  isUser,
  timestamp,
  avatar,
  modelName,
  onEdit,
  onRegenerate,
  onFavorite,
  messageId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  
  const toast = useToast();
  const { onCopy } = useClipboard(content);
  const { favorites, addFavorite, removeFavorite } = useUserActivity();
  
  const bgColor = useColorModeValue(
    isUser ? 'purple.500' : 'gray.100',
    isUser ? 'purple.500' : 'gray.700'
  );
  const textColor = useColorModeValue(
    isUser ? 'white' : 'gray.800',
    isUser ? 'white' : 'gray.100'
  );
  const timeColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    if (messageId) {
      const isAlreadyFavorited = favorites.some(fav => 
        fav.type === 'conversation' && fav.description.includes(content.slice(0, 50))
      );
      setIsFavorited(isAlreadyFavorited);
    }
  }, [favorites, content, messageId]);

  const handleCopy = () => {
    onCopy();
    toast({
      title: '已复制到剪贴板',
      status: 'success',
      duration: 2000,
    });
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  const handleFavorite = async () => {
    try {
      if (isFavorited) {
        const favoriteToRemove = favorites.find(fav => 
          fav.type === 'conversation' && fav.description.includes(content.slice(0, 50))
        );
        if (favoriteToRemove) {
          await removeFavorite(favoriteToRemove.id);
          setIsFavorited(false);
          toast({
            title: '已取消收藏',
            status: 'info',
            duration: 2000,
          });
        }
      } else {
        await addFavorite({
          type: 'conversation',
          title: `AI对话 - ${content.slice(0, 20)}...`,
          description: content.slice(0, 3000) + (content.length > 3000 ? '...' : '')
        });
        setIsFavorited(true);
        toast({
          title: '已收藏',
          status: 'success',
          duration: 2000,
        });
      }
      
      if (onFavorite) {
        onFavorite();
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      toast({
        title: '操作失败',
        description: '收藏操作失败，请重试',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Flex
        direction={isUser ? 'row-reverse' : 'row'}
        align="flex-start"
        gap={2}
      >
        <Box>
          <Avatar
            size="sm"
            src={avatar || (isUser ? '/images/user-avatar.png' : '/images/ai-avatar.png')}
          />
          {!isUser && modelName && (
            <Text 
              fontSize="xs" 
              color={useColorModeValue('gray.600', 'gray.400')} 
              textAlign="center" 
              mt={1}
              fontWeight="medium"
            >
              {modelName}
            </Text>
          )}
        </Box>
        <Box position="relative" minW="0" flex="1">
          <Box
            bg={bgColor}
            px={4}
            py={3}
            borderRadius="2xl"
            borderTopLeftRadius={!isUser ? 0 : undefined}
            borderTopRightRadius={isUser ? 0 : undefined}
            position="relative"
            wordBreak="break-word"
            overflowWrap="break-word"
            maxW={isUser ? "85%" : "90%"}
            ml={isUser ? "auto" : "0"}
            w="fit-content"
          >
            <Text 
              color={textColor} 
              whiteSpace="pre-wrap"
              wordBreak="break-word"
              overflowWrap="break-word"
              lineHeight="1.6"
            >
              {content}
            </Text>
          </Box>
          
          {/* 时间和按钮区域 */}
          <Flex
            justify={isUser ? 'flex-end' : 'flex-start'}
            mt={1}
            align="center"
            gap={2}
          >
            {/* 用户消息：按钮在左侧，时间在右侧 */}
            {isUser ? (
              <>
                <IconButton
                  aria-label="复制"
                  icon={<FiCopy />}
                  size="xs"
                  variant="ghost"
                  onClick={handleCopy}
                  fontSize="xs"
                  minW="auto"
                  h="auto"
                  p={1}
                />
                <Text fontSize="xs" color={timeColor}>
                  {formatMessageTime(timestamp)}
                </Text>
              </>
            ) : (
              /* AI消息：时间在左侧，按钮在右侧 */
              <>
                <Text fontSize="xs" color={timeColor}>
                  {formatMessageTime(timestamp)}
                </Text>
                <HStack spacing={1}>
                  <IconButton
                    aria-label="复制"
                    icon={<FiCopy />}
                    size="xs"
                    variant="ghost"
                    onClick={handleCopy}
                  />
                  <IconButton
                    aria-label="重新生成"
                    icon={<FiRefreshCw />}
                    size="xs"
                    variant="ghost"
                    onClick={handleRegenerate}
                  />
                  <IconButton
                    aria-label="收藏"
                    icon={<FiHeart />}
                    size="xs"
                    variant="ghost"
                    color={isFavorited ? 'red.500' : 'gray.500'}
                    onClick={handleFavorite}
                  />
                </HStack>
              </>
            )}
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default ChatMessage; 