import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Box, Spinner, Text, VStack } from '@chakra-ui/react'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // 处理认证回调逻辑
    const handleAuthCallback = async () => {
      try {
        // 这里可以添加实际的认证处理逻辑
        // 例如处理OAuth回调、验证token等
        
        // 暂时重定向到首页
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } catch (error) {
        console.error('认证回调处理失败:', error)
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={4}>
        <Spinner size="xl" color="blue.500" />
        <Text>正在处理认证信息...</Text>
      </VStack>
    </Box>
  )
} 