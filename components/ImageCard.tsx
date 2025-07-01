import React, { useState } from 'react';
import {
  Box,
  Image,
  IconButton,
  useToast,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';

interface ImageCardProps {
  imageUrl: string;
  prompt: string;
  onFavorite?: (imageUrl: string, isFavorited: boolean) => void;
  isFavorited?: boolean;
}

const ImageCard: React.FC<ImageCardProps> = ({
  imageUrl,
  prompt,
  onFavorite,
  isFavorited: initialFavorited = false,
}) => {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleFavoriteClick = () => {
    const newFavoritedState = !isFavorited;
    setIsFavorited(newFavoritedState);
    onFavorite?.(imageUrl, newFavoritedState);

    toast({
      title: newFavoritedState ? '已添加到收藏' : '已取消收藏',
      status: newFavoritedState ? 'success' : 'info',
      duration: 2000,
      isClosable: true,
      position: 'top',
    });
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      borderColor={borderColor}
      position="relative"
      transition="transform 0.2s"
      _hover={{
        transform: 'scale(1.02)',
      }}
    >
      <Box position="relative">
        <Image
          src={imageUrl}
          alt={prompt}
          w="full"
          h="auto"
          objectFit="cover"
        />
        <IconButton
          aria-label="收藏图片"
          icon={isFavorited ? <FaHeart /> : <FaRegHeart />}
          position="absolute"
          top={2}
          right={2}
          colorScheme={isFavorited ? 'red' : 'gray'}
          size="sm"
          isRound
          onClick={handleFavoriteClick}
          opacity={0.8}
          _hover={{ opacity: 1 }}
        />
      </Box>
      <Box p={4}>
        <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} noOfLines={2}>
          {prompt}
        </Text>
      </Box>
    </Box>
  );
};

export default ImageCard; 