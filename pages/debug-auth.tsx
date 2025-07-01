import React, { useEffect, useState } from 'react'
import {
  Container,
  VStack,
  Heading,
  Text,
  Card,
  CardBody,
  Badge,
  Code,
  Button,
  HStack,
  Avatar,
  Alert,
  AlertIcon,
  Box,
  Divider,
} from '@chakra-ui/react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const DebugAuth: React.FC = () => {
  const { user, session, loading, isConfigured } = useAuth()
  const [rawSession, setRawSession] = useState<any>(null)
  const [authEvents, setAuthEvents] = useState<string[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        setRawSession(data)
        addEvent(`初始检查: ${data.session ? '有会话' : '无会话'}`)
      } catch (err) {
        addEvent(`检查失败: ${err}`)
      }
    }

    checkAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addEvent(`状态变化: ${event} - ${session ? '有会话' : '无会话'}`)
      setRawSession({ session, event })
    })

    return () => subscription.unsubscribe()
  }, [])

  const addEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setAuthEvents(prev => [`[${timestamp}] ${event}`, ...prev.slice(0, 9)])
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleTestLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) {
        addEvent(`登录错误: ${error.message}`)
      }
    } catch (err) {
      addEvent(`登录异常: ${err}`)
    }
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>🔍 认证状态调试</Heading>
          <Text color="gray.600">实时监控认证状态变化</Text>
        </Box>

        {/* 当前状态 */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>当前状态</Heading>
            <VStack align="start" spacing={3}>
              <HStack>
                <Text fontWeight="bold">配置状态:</Text>
                <Badge colorScheme={isConfigured ? 'green' : 'red'}>
                  {isConfigured ? '已配置' : '未配置'}
                </Badge>
              </HStack>
              
              <HStack>
                <Text fontWeight="bold">加载状态:</Text>
                <Badge colorScheme={loading ? 'yellow' : 'green'}>
                  {loading ? '加载中' : '已完成'}
                </Badge>
              </HStack>
              
              <HStack>
                <Text fontWeight="bold">用户状态:</Text>
                <Badge colorScheme={user ? 'green' : 'gray'}>
                  {user ? '已登录' : '未登录'}
                </Badge>
              </HStack>
              
              <HStack>
                <Text fontWeight="bold">会话状态:</Text>
                <Badge colorScheme={session ? 'green' : 'gray'}>
                  {session ? '有效' : '无效'}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* 用户信息 */}
        {user && (
          <Card>
            <CardBody>
              <Heading size="md" mb={4}>用户信息</Heading>
              <HStack spacing={4} mb={4}>
                <Avatar 
                  size="md" 
                  src={user.user_metadata?.avatar_url}
                  name={user.user_metadata?.full_name || user.email}
                />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">
                    {user.user_metadata?.full_name || '未设置姓名'}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {user.email}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    ID: {user.id}
                  </Text>
                </VStack>
              </HStack>
              
              <Divider my={4} />
              
              <Box>
                <Text fontWeight="bold" mb={2}>用户元数据:</Text>
                <Code p={3} borderRadius="md" fontSize="sm" display="block" whiteSpace="pre-wrap">
                  {JSON.stringify(user.user_metadata, null, 2)}
                </Code>
              </Box>
            </CardBody>
          </Card>
        )}

        {/* 事件日志 */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>事件日志</Heading>
            <VStack align="stretch" spacing={2}>
              {authEvents.length > 0 ? (
                authEvents.map((event, index) => (
                  <Text 
                    key={index} 
                    fontSize="sm" 
                    fontFamily="mono"
                    p={2}
                    bg="gray.50"
                    _dark={{ bg: 'gray.700' }}
                    borderRadius="md"
                  >
                    {event}
                  </Text>
                ))
              ) : (
                <Text color="gray.500" textAlign="center">暂无事件</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* 原始数据 */}
        {rawSession && (
          <Card>
            <CardBody>
              <Heading size="md" mb={4}>原始会话数据</Heading>
              <Code 
                p={3} 
                borderRadius="md" 
                fontSize="xs" 
                display="block" 
                whiteSpace="pre-wrap" 
                maxH="300px" 
                overflowY="auto"
              >
                {JSON.stringify(rawSession, null, 2)}
              </Code>
            </CardBody>
          </Card>
        )}

        {/* 操作按钮 */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>操作</Heading>
            <HStack spacing={4} wrap="wrap">
              <Button onClick={handleRefresh} colorScheme="blue">
                刷新页面
              </Button>
              
              {!user && (
                <Button onClick={handleTestLogin} colorScheme="green">
                  测试登录
                </Button>
              )}
              
              {user && (
                <Button onClick={handleSignOut} colorScheme="red" variant="outline">
                  退出登录
                </Button>
              )}
            </HStack>
          </CardBody>
        </Card>

        {/* 说明 */}
        <Alert status="info">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">调试说明</Text>
            <Text fontSize="sm" mt={1}>
              这个页面会实时显示认证状态变化。如果登录后Header仍显示登录按钮，
              请检查事件日志中是否有SIGNED_IN事件，以及用户信息是否正确获取。
            </Text>
          </Box>
        </Alert>
      </VStack>
    </Container>
  )
}

export default DebugAuth 