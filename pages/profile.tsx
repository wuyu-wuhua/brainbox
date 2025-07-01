import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Avatar,
  Button,
  Grid,
  GridItem,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Icon,
  useColorModeValue,
  IconButton,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Image,
} from '@chakra-ui/react'
import {
  FaComments,
  FaImage,
  FaFileAlt,
  FaStar,
  FaClock,
  FaTrash,
  FaCrown,
} from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import { useUserActivity } from '../contexts/UserActivityContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useRouter } from 'next/router'

const Profile: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { userStats, recentActivities, favorites, removeFavorite } = useUserActivity()
  const { t } = useLanguage()
  const router = useRouter()
  const toast = useToast()
  const [isClient, setIsClient] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedFavorite, setSelectedFavorite] = useState(null)

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const cardBg = useColorModeValue('gray.50', 'gray.700')

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleDeleteFavorite = (id: string) => {
    removeFavorite(id)
    toast({
      title: '已取消收藏',
      status: 'info',
      duration: 2000,
    })
  }

  const handleViewFavorite = (favorite) => {
    setSelectedFavorite(favorite)
    onOpen()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation': return FaComments
      case 'image': return FaImage
      case 'document': return FaFileAlt
      default: return FaClock
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'conversation': return 'blue'
      case 'image': return 'purple'
      case 'document': return 'green'
      default: return 'gray'
    }
  }

  // 加载状态
  if (!isClient || authLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" />
            <Text>加载中...</Text>
          </VStack>
        </Center>
      </Container>
    )
  }

  // 未登录状态
  if (!user) {
    return (
      <Container maxW="6xl" py={8}>
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>需要登录</AlertTitle>
            <AlertDescription>
              请先登录以查看个人空间。
              <Button ml={4} size="sm" onClick={() => router.push('/')}>
                返回首页
              </Button>
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* 用户信息区域 */}
        <Box>
          <HStack spacing={6} align="start">
            <Avatar
              size="2xl"
              src={user.user_metadata?.avatar_url}
              name={user.user_metadata?.full_name || user.email}
              bg="purple.500"
            />
            <VStack align="start" flex={1} spacing={2}>
              <Heading size="lg" color="gray.800" _dark={{ color: 'white' }}>
                {user.user_metadata?.full_name || user.email?.split('@')[0] || '用户名'}
              </Heading>
              <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                {user.email}
              </Text>
            </VStack>
            {/* 右侧积分信息区域 */}
            <VStack align="end" spacing={4} minW="200px">
              <Box textAlign="right">
                <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={1}>
                  {t('credits.remainingCredits')}
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {userStats?.credits || 0}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {t('credits.credits')}
                </Text>
              </Box>
                <Button
                  colorScheme="purple"
                  variant="solid"
                size="md"
                  onClick={() => router.push('/membership')}
                leftIcon={<Icon as={FaCrown} />}
                bg="linear-gradient(45deg, #8B5CF6, #A855F7)"
                _hover={{
                  bg: "linear-gradient(45deg, #7C3AED, #9333EA)",
                  transform: "translateY(-2px)",
                  boxShadow: "lg"
                }}
                transition="all 0.2s"
              >
                {t('credits.recharge')}
                </Button>
            </VStack>
          </HStack>
        </Box>

        {/* 统计数据区域 */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={8}>
          <GridItem>
            <VStack spacing={2}>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                对话次数
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="gray.800" _dark={{ color: 'white' }}>
                {userStats.conversations}
              </Text>
            </VStack>
          </GridItem>
          
          <GridItem>
            <VStack spacing={2}>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                生成图片
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="gray.800" _dark={{ color: 'white' }}>
                {userStats.images}
              </Text>
            </VStack>
          </GridItem>
          
          <GridItem>
            <VStack spacing={2}>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                阅读文档
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="gray.800" _dark={{ color: 'white' }}>
                {userStats.documents}
              </Text>
            </VStack>
          </GridItem>
          
          <GridItem>
            <VStack spacing={2}>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                收藏数量
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="gray.800" _dark={{ color: 'white' }}>
                {favorites.length}
              </Text>
            </VStack>
          </GridItem>
        </Grid>

        <Divider />

        {/* 最近活动区域 */}
        <Box>
          <Heading size="md" mb={6} color="gray.800" _dark={{ color: 'white' }}>
            最近活动
          </Heading>
          
          {recentActivities.length > 0 ? (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              {recentActivities.slice(0, 3).map((activity, index) => (
                <Card key={index} variant="outline" bg={cardBg}>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack>
                        <Icon 
                          as={getActivityIcon(activity.type)} 
                          color={`${getActivityColor(activity.type)}.500`}
                          boxSize={5}
                        />
                        <Text fontWeight="medium" fontSize="lg">
                          {activity.type === 'conversation' ? 'AI 对话' : 
                           activity.type === 'image' ? '图片生成' : '文档阅读'}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                        {activity.description || activity.title}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {activity.timestamp}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          ) : (
            <Text color="gray.500" textAlign="center" py={8}>
              暂无最近活动
            </Text>
          )}
        </Box>

        <Divider />

        {/* 我的收藏区域 */}
        <Box>
          <Heading size="md" mb={6} color="gray.800" _dark={{ color: 'white' }}>
            我的收藏
          </Heading>
          
          {favorites.length > 0 ? (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              {favorites.map((favorite) => (
                <Card 
                  key={favorite.id} 
                  variant="outline" 
                  bg={cardBg}
                  cursor="pointer"
                  _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                  transition="all 0.2s"
                  onClick={() => handleViewFavorite(favorite)}
                >
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <HStack justify="space-between" w="full">
                        <HStack>
                          <Icon 
                            as={FaStar} 
                            color="orange.500"
                            boxSize={5}
                          />
                          <Text fontWeight="medium">
                            {favorite.type === 'conversation' ? '收藏的对话' : 
                             favorite.type === 'image' ? '收藏的图片' : '收藏的文档'}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label="删除收藏"
                          icon={<FaTrash />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFavorite(favorite.id)
                          }}
                        />
                      </HStack>
                      
                      {/* 如果是图片类型，显示图片预览 */}
                      {favorite.type === 'image' && (() => {
                        const imageUrlMatch = favorite.description.match(/图片链接:\s*([^\n]+)/);
                        const imageUrl = imageUrlMatch ? imageUrlMatch[1].trim() : null;
                        return imageUrl ? (
                          <Box mb={3} w="full">
                            <Image
                              src={imageUrl}
                              alt="收藏的图片"
                              borderRadius="md"
                              maxH="150px"
                              w="full"
                              objectFit="cover"
                              fallback={
                                <Box
                                  h="150px"
                                  bg="gray.100"
                                  borderRadius="md"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Text color="gray.500" fontSize="sm">图片链接已过期</Text>
                                </Box>
                              }
                            />
                          </Box>
                        ) : null;
                      })()}
                      
                      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} noOfLines={favorite.type === 'image' ? 2 : 5}>
                        {favorite.type === 'image' 
                          ? favorite.description.split('\n')[0] // 只显示提示词部分
                          : favorite.description
                        }
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {favorite.timestamp}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          ) : (
            <Text color="gray.500" textAlign="center" py={8}>
              暂无收藏内容
            </Text>
          )}
        </Box>
      </VStack>

      {/* 收藏详情模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={FaStar} color="orange.500" />
              <Text>{selectedFavorite?.title}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  类型: {selectedFavorite?.type === 'conversation' ? 'AI对话' : 
                        selectedFavorite?.type === 'image' ? '图片生成' : '文档阅读'}
                </Text>
                <Text fontSize="sm" color="gray.500" mb={4}>
                  收藏时间: {selectedFavorite?.timestamp}
                </Text>
              </Box>
              
              {/* 如果是图片类型，在模态框中显示图片 */}
              {selectedFavorite?.type === 'image' && (() => {
                const imageUrlMatch = selectedFavorite.description.match(/图片链接:\s*([^\n]+)/);
                const imageUrl = imageUrlMatch ? imageUrlMatch[1].trim() : null;
                return imageUrl ? (
                  <Box mb={4}>
                                          <Text fontSize="md" fontWeight="bold" mb={2}>{t('space.generatedImage')}</Text>
                    <Image
                      src={imageUrl}
                      alt="收藏的图片"
                      borderRadius="md"
                      maxH="400px"
                      w="full"
                      objectFit="contain"
                      fallback={
                        <Box
                          h="300px"
                          bg="gray.100"
                          borderRadius="md"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text color="gray.500">{t('space.imageLoadFailed')}</Text>
                        </Box>
                      }
                    />
                  </Box>
                ) : null;
              })()}
              
              <Box>
                <Text fontSize="md" fontWeight="bold" mb={2}>详细信息:</Text>
                <Box
                  p={4}
                  bg={useColorModeValue('gray.50', 'gray.700')}
                  borderRadius="md"
                  maxH="300px"
                  overflowY="auto"
                >
                  <Text whiteSpace="pre-wrap">
                    {selectedFavorite?.type === 'image' 
                      ? selectedFavorite.description.replace(/图片链接:\s*[^\n]+\n?/, '').trim() // 移除图片链接部分
                      : selectedFavorite?.description
                    }
                  </Text>
                </Box>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              关闭
            </Button>
            <Button 
              variant="outline" 
              colorScheme="red"
              onClick={() => {
                if (selectedFavorite) {
                  handleDeleteFavorite(selectedFavorite.id)
                  onClose()
                }
              }}
            >
              删除收藏
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  )
}

export default Profile 