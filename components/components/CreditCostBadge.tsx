import React from 'react';
import { Text, Badge, HStack, Tooltip } from '@chakra-ui/react';

interface CreditCostBadgeProps {
  type: 'chat' | 'draw' | 'video';
  modelType?: 'basic' | 'advanced';
  videoType?: 'normal' | 'gen3';
}

const CreditCostBadge: React.FC<CreditCostBadgeProps> = ({ type, modelType = 'basic', videoType = 'normal' }) => {
  const getCreditCost = () => {
    switch (type) {
      case 'chat':
        return modelType === 'advanced' ? 20 : 5;
      case 'draw':
        return 100;
      case 'video':
        return videoType === 'gen3' ? 1250 : 500;
      default:
        return 0;
    }
  };

  const getTooltipText = () => {
    switch (type) {
      case 'chat':
        return `每次对话消耗${getCreditCost()}积分`;
      case 'draw':
        return '生成一张图片消耗100积分';
      case 'video':
        return `生成一条${videoType === 'gen3' ? 'Gen3' : '常规'}视频消耗${getCreditCost()}积分`;
      default:
        return '';
    }
  };

  return (
    <Tooltip label={getTooltipText()}>
      <HStack spacing={1} display="inline-flex" alignItems="center">
        <Badge colorScheme="purple" variant="subtle" fontSize="xs">
          {getCreditCost()}积分
        </Badge>
      </HStack>
    </Tooltip>
  );
};

export default CreditCostBadge; 