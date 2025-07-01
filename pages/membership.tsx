import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  Badge,
  Icon,
  useColorModeValue,
  SimpleGrid,
  List,
  ListItem,
  ListIcon,
  Divider,
  useToast,
  ButtonGroup,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Image,
  Flex,
  InputGroup,
  InputLeftElement,
  Select,
} from '@chakra-ui/react';
import { FaCrown, FaStar, FaCheck, FaArrowLeft, FaGem, FaCreditCard, FaLock, FaCalendarAlt, FaUser } from 'react-icons/fa';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';

const MembershipPage = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('annual'); // 'annual' 或 'monthly'
  const toast = useToast();
  const { t } = useLanguage();
  const { isOpen: isPaymentOpen, onOpen: onPaymentOpen, onClose: onPaymentClose } = useDisclosure();

  // 支付表单状态
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
  });
  const [paymentErrors, setPaymentErrors] = useState<{[key: string]: string}>({});
  const [selectedPlanData, setSelectedPlanData] = useState(null);

  const bgGradient = useColorModeValue(
    'linear(to-br, yellow.50, orange.50, yellow.100)',
    'linear(to-br, yellow.900, orange.900, yellow.800)'
  );

  const cardBg = useColorModeValue('white', 'gray.800');
  const goldColor = useColorModeValue('yellow.500', 'yellow.300');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  const allPlans = {
    free: {
      id: 'free',
      name: t('membership.free'),
      icon: FaStar,
      color: 'gray',
      price: t('membership.freePrice'),
      originalPrice: null,
      period: '',
      description: t('membership.freeDesc'),
      features: [
        t('membership.freeFeature1'),
        t('membership.freeFeature2'),
        t('membership.freeFeature3'),
        t('membership.freeFeature4'),
      ],
      buttonText: t('membership.subscribe'),
      isPopular: false
    },
    annual: {
      id: 'pro-annual',
      name: t('membership.annualMember'),
      icon: FaCrown,
      color: 'yellow',
      price: t('membership.annualPrice'),
      originalPrice: t('membership.annualOrigin'),
      period: t('membership.period'),
      description: t('membership.annualDesc'),
      features: [
        t('membership.annualFeature1'),
        t('membership.annualFeature2'),
        t('membership.annualFeature3'),
        t('membership.annualFeature4'),
        t('membership.annualFeature5'),
        t('membership.annualFeature6'),
        t('membership.annualFeature7'),
      ],
      buttonText: t('membership.subscribe'),
      isPopular: true
    },
    monthly: {
      id: 'pro-monthly',
      name: t('membership.monthlyMember'),
      icon: FaGem,
      color: 'purple',
      price: t('membership.monthlyPrice'),
      originalPrice: null,
      period: t('membership.period'),
      description: t('membership.monthlyDesc'),
      features: [
        t('membership.monthlyFeature1'),
        t('membership.monthlyFeature2'),
        t('membership.monthlyFeature3'),
        t('membership.monthlyFeature4'),
        t('membership.monthlyFeature5'),
        t('membership.monthlyFeature6'),
      ],
      buttonText: t('membership.subscribe'),
      isPopular: false
    }
  };

  // 根据当前选择的付费模式显示对应的计划
  const getVisiblePlans = () => {
    if (paymentMode === 'annual') {
      return [allPlans.free, allPlans.annual];
    } else {
      return [allPlans.free, allPlans.monthly];
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSelectPlan = async (planId) => {
    if (planId === 'free') {
      // 免费计划直接使用
      toast({
        title: t('membership.switchSuccess'),
        description: t('membership.switchDesc'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // 付费计划打开支付模态框
    const allPlansArray = Object.values(allPlans);
    const planData = allPlansArray.find(p => p.id === planId);
    setSelectedPlanData(planData);
    setSelectedPlan(planId);
    onPaymentOpen();
  };

  // 处理支付提交
  const handlePaymentSubmit = async () => {
    if (!validatePaymentForm()) return;
    
    setIsLoading(true);
    
    try {
      // 模拟支付处理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: '支付成功',
        description: `您已成功订阅${selectedPlanData?.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onPaymentClose();
      // 重置表单
      setPaymentData({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        email: '',
      });
      setPaymentErrors({});
      
    } catch (error) {
      toast({
        title: '支付失败',
        description: '请检查支付信息或稍后重试',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 验证支付表单
  const validatePaymentForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 16) {
      errors.cardNumber = '请输入有效的银行卡号';
    }
    
    if (!paymentData.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentData.expiryDate)) {
      errors.expiryDate = '请输入有效的到期日期 (MM/YY)';
    }
    
    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      errors.cvv = '请输入有效的CVV';
    }
    
    if (!paymentData.cardholderName.trim()) {
      errors.cardholderName = '请输入持卡人姓名';
    }
    
    if (!paymentData.email || !/\S+@\S+\.\S+/.test(paymentData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 格式化银行卡号
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // 格式化到期日期
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Box minH="100vh" bg={bgGradient}>
      <Header />
      
      <Container maxW="1200px" pt="80px" pb="40px">
        <Button
          leftIcon={<FaArrowLeft />}
          variant="ghost"
          onClick={handleBack}
          mb={6}
          color={textColor}
        >
          {t('membership.back')}
        </Button>

        <VStack spacing={6} mb={10} textAlign="center">
          <HStack spacing={4} justify="center" flexWrap="wrap">
            <Badge colorScheme="blue" px={3} py={1} borderRadius="full">{t('membership.supportMultiModel')}</Badge>
            <Badge colorScheme="green" px={3} py={1} borderRadius="full">GPT-4</Badge>
            <Badge colorScheme="orange" px={3} py={1} borderRadius="full">Claude-3.5</Badge>
                            <Badge colorScheme="gray" px={3} py={1} borderRadius="full">DeepSeek-R1-0528</Badge>
          </HStack>
          
          <Heading 
            size="2xl" 
            bgGradient="linear(to-r, yellow.400, orange.400, yellow.500)"
            bgClip="text"
            fontWeight="bold"
          >
            {t('membership.slogan')}
          </Heading>
          
          <Text color={textColor} fontSize="lg">
            {t('membership.subtitle')}
          </Text>
        </VStack>

        {/* 付费模式切换按钮 */}
        <VStack spacing={6} mb={8}>
          <ButtonGroup
            size="lg"
            isAttached
            variant="outline"
            bg={cardBg}
            borderRadius="xl"
            p={1}
          >
            <Button
              colorScheme={paymentMode === 'annual' ? 'yellow' : 'gray'}
              variant={paymentMode === 'annual' ? 'solid' : 'ghost'}
              onClick={() => setPaymentMode('annual')}
              borderRadius="lg"
              px={8}
              py={6}
              fontSize="md"
              fontWeight="bold"
            >
              {t('membership.annual')} 💰
            </Button>
            <Button
              colorScheme={paymentMode === 'monthly' ? 'purple' : 'gray'}
              variant={paymentMode === 'monthly' ? 'solid' : 'ghost'}
              onClick={() => setPaymentMode('monthly')}
              borderRadius="lg"
              px={8}
              py={6}
              fontSize="md"
              fontWeight="bold"
            >
              {t('membership.monthly')} 📅
            </Button>
          </ButtonGroup>
          
          <Text fontSize="sm" color="gray.500" textAlign="center">
            {paymentMode === 'annual' ? t('membership.annualTip') : t('membership.monthlyTip')}
          </Text>
        </VStack>

        {/* 价格卡片 */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} maxW="800px" mx="auto">
          {getVisiblePlans().map((plan) => (
            <Card
              key={plan.id}
              bg={cardBg}
              borderRadius="2xl"
              border={plan.id === 'pro-annual' ? '3px solid #FFD700' : '2px solid #CBD5E1'}
              position="relative"
              overflow="hidden"
              transition="all 0.3s ease"
              boxShadow={plan.id === 'pro-annual' ? 'lg' : 'md'}
              _hover={{
                transform: 'translateY(-8px)',
                boxShadow: plan.id === 'pro-annual' ? '2xl' : 'xl',
                borderColor: plan.id === 'pro-annual' ? '#FFC700' : '#805AD5',
              }}
            >
              {plan.isPopular && (
                <Badge
                  colorScheme="yellow"
                  position="absolute"
                  top={4}
                  right={4}
                  borderRadius="full"
                  px={3}
                  fontWeight="bold"
                >
                  最受欢迎
                </Badge>
              )}
              
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <HStack>
                    <Icon as={plan.icon} w={6} h={6} color={`${plan.color}.400`} />
                    <Heading size="md">{plan.name}</Heading>
                  </HStack>
                  
                  <Box>
                    <HStack alignItems="flex-start" spacing={1}>
                      <Text fontSize="3xl" fontWeight="bold">
                        {plan.price}
                      </Text>
                      <Text fontSize="sm" color="gray.500" pt={2}>
                        {plan.period}
                      </Text>
                    </HStack>
                    {plan.originalPrice && (
                      <Text fontSize="sm" color="gray.500" textDecoration="line-through">
                        {t('membership.annualOrigin')}
                      </Text>
                    )}
                  </Box>
                  
                  <Text color="gray.500">
                    {plan.description}
                  </Text>
                  
                  <Divider />
                  
                  <List spacing={3}>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListIcon as={FaCheck} color="green.500" />
                        {feature}
                      </ListItem>
                    ))}
                  </List>
                  
                  <Button
                    colorScheme={plan.isPopular ? 'yellow' : 'gray'}
                    size="lg"
                    w="full"
                    onClick={() => handleSelectPlan(plan.id)}
                    isLoading={isLoading && selectedPlan === plan.id}
                  >
                    {plan.buttonText}
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* 支付模态框 */}
      <Modal isOpen={isPaymentOpen} onClose={onPaymentClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg={cardBg} mx={4}>
          <ModalHeader textAlign="center" pb={2}>
            <VStack spacing={2}>
              <Heading size="md">完成支付</Heading>
              {selectedPlanData && (
                <Text fontSize="sm" color="gray.500">
                  {selectedPlanData.name} - {selectedPlanData.price}{selectedPlanData.period}
                </Text>
              )}
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              {/* 银行卡图片展示 */}
              <Box 
                position="relative" 
                w="320px" 
                h="200px" 
                mx="auto"
                borderRadius="xl"
                bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
                p={6}
                color="white"
                boxShadow="xl"
              >
                <Flex justify="space-between" align="flex-start" h="full">
                  <VStack align="flex-start" spacing={4} flex={1}>
                    <Icon as={FaCreditCard} w={8} h={8} />
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" letterSpacing="wider">
                        {paymentData.cardNumber || '•••• •••• •••• ••••'}
                      </Text>
                    </Box>
                    <HStack justify="space-between" w="full">
                      <VStack align="flex-start" spacing={0}>
                        <Text fontSize="xs" opacity={0.8}>持卡人</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {paymentData.cardholderName || 'YOUR NAME'}
                        </Text>
                      </VStack>
                      <VStack align="flex-end" spacing={0}>
                        <Text fontSize="xs" opacity={0.8}>有效期</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {paymentData.expiryDate || 'MM/YY'}
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </Flex>
              </Box>

              {/* 支付表单 */}
              <VStack spacing={4} w="full">
                <FormControl isInvalid={!!paymentErrors.cardNumber}>
                  <FormLabel fontSize="sm">银行卡号</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <Icon as={FaCreditCard} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={paymentData.cardNumber}
                      onChange={(e) => {
                        const formatted = formatCardNumber(e.target.value);
                        setPaymentData({...paymentData, cardNumber: formatted});
                      }}
                      maxLength={19}
                      bg={useColorModeValue('white', 'gray.700')}
                    />
                  </InputGroup>
                  <FormErrorMessage fontSize="xs">{paymentErrors.cardNumber}</FormErrorMessage>
                </FormControl>

                <HStack spacing={4} w="full">
                  <FormControl isInvalid={!!paymentErrors.expiryDate}>
                    <FormLabel fontSize="sm">有效期</FormLabel>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={FaCalendarAlt} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="MM/YY"
                        value={paymentData.expiryDate}
                        onChange={(e) => {
                          const formatted = formatExpiryDate(e.target.value);
                          setPaymentData({...paymentData, expiryDate: formatted});
                        }}
                        maxLength={5}
                        bg={useColorModeValue('white', 'gray.700')}
                      />
                    </InputGroup>
                    <FormErrorMessage fontSize="xs">{paymentErrors.expiryDate}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!paymentErrors.cvv}>
                    <FormLabel fontSize="sm">CVV</FormLabel>
                    <InputGroup>
                      <InputLeftElement>
                        <Icon as={FaLock} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setPaymentData({...paymentData, cvv: value});
                        }}
                        maxLength={4}
                        type="password"
                        bg={useColorModeValue('white', 'gray.700')}
                      />
                    </InputGroup>
                    <FormErrorMessage fontSize="xs">{paymentErrors.cvv}</FormErrorMessage>
                  </FormControl>
                </HStack>

                <FormControl isInvalid={!!paymentErrors.cardholderName}>
                  <FormLabel fontSize="sm">持卡人姓名</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <Icon as={FaUser} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="请输入持卡人姓名"
                      value={paymentData.cardholderName}
                      onChange={(e) => setPaymentData({...paymentData, cardholderName: e.target.value.toUpperCase()})}
                      bg={useColorModeValue('white', 'gray.700')}
                    />
                  </InputGroup>
                  <FormErrorMessage fontSize="xs">{paymentErrors.cardholderName}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!paymentErrors.email}>
                  <FormLabel fontSize="sm">邮箱地址</FormLabel>
                  <Input
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={paymentData.email}
                    onChange={(e) => setPaymentData({...paymentData, email: e.target.value})}
                    bg={useColorModeValue('white', 'gray.700')}
                  />
                  <FormErrorMessage fontSize="xs">{paymentErrors.email}</FormErrorMessage>
                </FormControl>

                {/* 安全提示 */}
                <Box 
                  bg={useColorModeValue('green.50', 'green.900')} 
                  p={3} 
                  borderRadius="md" 
                  borderLeft="4px solid"
                  borderColor="green.500"
                  w="full"
                >
                  <HStack spacing={2}>
                    <Icon as={FaLock} color="green.500" />
                    <Text fontSize="sm" color={useColorModeValue('green.700', 'green.200')}>
                      您的支付信息采用SSL加密传输，安全可靠
                    </Text>
                  </HStack>
                </Box>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPaymentClose}>
              取消
            </Button>
            <Button 
              colorScheme="purple" 
              onClick={handlePaymentSubmit}
              isLoading={isLoading}
              loadingText="处理中..."
              leftIcon={<Icon as={FaCreditCard} />}
            >
              立即支付 {selectedPlanData?.price}{selectedPlanData?.period}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MembershipPage;