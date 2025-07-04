import React from 'react';
import { Text, TextProps } from '@chakra-ui/react';

interface CreditCostProps extends TextProps {
  cost: number;
}

const CreditCost: React.FC<CreditCostProps> = ({ cost, ...props }) => {
  return (
    <Text 
      fontSize="xs" 
      color="gray.500" 
      ml={2}
      {...props}
    >
      ({cost}积分)
    </Text>
  );
};

export default CreditCost; 