import React from 'react';
import { Text, Box, HStack } from '@chakra-ui/react';

interface CreditDisplayProps {
  credits: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({ 
  credits, 
  size = 'md',
  showLabel = true 
}) => {
  const fontSize = {
    sm: 'xs',
    md: 'sm',
    lg: 'md'
  }[size];

  return (
    <HStack spacing={1}>
      {showLabel && (
        <Text fontSize={fontSize} color="gray.600" _dark={{ color: 'gray.400' }}>
          消耗
        </Text>
      )}
      <Text fontSize={fontSize} fontWeight="bold" color="purple.500">
        {credits}积分
      </Text>
    </HStack>
  );
};

export default CreditDisplay; 