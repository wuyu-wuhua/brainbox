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
import { useAuth } from '../contexts/AuthContext';

const MembershipPage = () => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('annual'); // 'annual' 或 'monthly'
  const toast = useToast();
  const { t } = useLanguage();
  const { isOpen: isPaymentOpen, onOpen: onPaymentOpen, onClose: onPaymentClose } = useDisclosure();
  const { user } = useAuth();

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
      id: 'price_1RhOslP9YNEyAXtbrn85QLPV',
      name: t('membership.annualMember'),
      icon: FaCrown,
      color: 'yellow',
      price: t('membership.annualPrice'),
      originalPrice: t('membership.annualOrigin'),
      period: t('membership.period'),
      description: t('membership.annualDesc'),
      features: [
        t('membership.annualFeature1'),
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
      id: 'price_1RhOslP9YNEyAXtb3usYeftl',
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
    if (!user) {
      toast({
        title: '请先登录',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsLoading(true);
    try {
      // 这里假设 planId 就是 Stripe 价格ID（如 price_xxx），如需映射请自行调整
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: planId, userEmail: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: '发起支付失败',
          description: data.error || '',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (e) {
      toast({
        title: '发起支付异常',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
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
          {getVisiblePlans().map((plan) => {
            // 判断当前卡片类型
            const isAnnual = plan.id === 'price_1RhOslP9YNEyAXtbrn85QLPV'; // 替换为你的年付 Stripe 价格ID
            const isMonthly = plan.id === 'price_1RhOslP9YNEyAXtb3usYeftl'; // 替换为你的月付 Stripe 价格ID
            return (
              <Card
                key={plan.id}
                bg={cardBg}
                borderRadius="2xl"
                border={isAnnual ? '3px solid #FFD700' : isMonthly ? '3px solid #805AD5' : '2px solid #CBD5E1'}
                position="relative"
                overflow="hidden"
                transition="all 0.3s ease"
                boxShadow={isAnnual ? 'lg' : 'md'}
                _hover={{
                  transform: 'translateY(-8px)',
                  boxShadow: isAnnual ? '2xl' : 'xl',
                  borderColor: isAnnual ? '#FFC700' : isMonthly ? '#805AD5' : '#805AD5',
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
                    {t('membership.popular')}
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
                        <VStack spacing={0} align="flex-start">
                          <Text fontSize="sm" color="gray.500" textDecoration="line-through">
                            {t('membership.annualOrigin')}
                          </Text>
                          <Text fontSize="sm" color="green.500" fontWeight="medium">
                            {t('membership.annualSpecial')}
                          </Text>
                        </VStack>
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
                      colorScheme={isMonthly ? 'purple' : plan.isPopular ? 'yellow' : 'gray'}
                      size="lg"
                      w="full"
                      onClick={() => handleSelectPlan(plan.id)}
                      isLoading={isLoading && selectedPlan === plan.id}
                      disabled={plan.id === 'free'}
                    >
                      {plan.id === 'free' ? t('membership.currentPlan') : plan.buttonText}
                    </Button>
                  </VStack>
                </CardBody>
                {plan.id !== 'free' && (
                  <Text color="gray.400" fontSize="sm" mt={2} textAlign="center">
                    {t('membership.tips')}
                  </Text>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default MembershipPage;