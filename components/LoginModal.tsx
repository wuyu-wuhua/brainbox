import React, { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Button,
  Text,
  Divider,
  HStack,
  Icon,
  useColorModeValue,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react'
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, loading, isConfigured } = useAuth()
  const { t } = useLanguage()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formErrors, setFormErrors] = useState({ email: '', password: '', confirmPassword: '' })

  const handleGoogleLogin = async () => {
    await signInWithGoogle()
    if (isConfigured) {
      onClose()
    }
  }

  const validateForm = () => {
    const errors = { email: '', password: '', confirmPassword: '' }
    
    if (!email) {
      errors.email = '请输入邮箱地址'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = '请输入有效的邮箱地址'
    }
    
    if (!password) {
      errors.password = '请输入密码'
    } else if (password.length < 6) {
      errors.password = '密码至少需要6位'
    }
    
    if (isRegisterMode && !confirmPassword) {
      errors.confirmPassword = '请确认密码'
    } else if (isRegisterMode && password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }
    
    setFormErrors(errors)
    return !errors.email && !errors.password && !errors.confirmPassword
  }

  const handleEmailAuth = async () => {
    if (!validateForm()) return
    
    // TODO: 这里添加邮箱密码登录/注册的逻辑
    console.log(isRegisterMode ? '注册' : '登录', { email, password })
    
    // 模拟成功后关闭弹窗
      onClose()
    }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFormErrors({ email: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const switchMode = () => {
    setIsRegisterMode(!isRegisterMode)
    resetForm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg={bgColor} mx={4}>
        <ModalHeader textAlign="center" pb={2}>
          {isRegisterMode ? '注册到 BrainBox' : t('auth.loginTitle')}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            {!isConfigured ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>登录功能未配置</AlertTitle>
                  <AlertDescription fontSize="sm" mt={1}>
                    请配置Supabase环境变量以启用登录功能。
                    <br />
                    创建 <Code>.env.local</Code> 文件并添加：
                    <Code display="block" mt={2} p={2} fontSize="xs">
                      NEXT_PUBLIC_SUPABASE_URL=your_url
                      <br />
                      NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
                    </Code>
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Text 
                fontSize="sm" 
                color="gray.600" 
                _dark={{ color: 'gray.400' }}
                textAlign="center"
                mb={2}
              >
                {isRegisterMode ? '创建您的账户' : t('auth.loginDescription')}
              </Text>
            )}

            <VStack spacing={3} width="100%">
              {/* 邮箱密码登录表单 */}
              <FormControl isInvalid={!!formErrors.email}>
                <FormLabel fontSize="sm">邮箱地址</FormLabel>
                <Input
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg={useColorModeValue('white', 'gray.700')}
                  borderColor={useColorModeValue('gray.200', 'gray.500')}
                />
                <FormErrorMessage fontSize="xs">{formErrors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!formErrors.password}>
                <FormLabel fontSize="sm">密码</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderColor={useColorModeValue('gray.200', 'gray.500')}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      icon={<Icon as={showPassword ? FaEyeSlash : FaEye} />}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage fontSize="xs">{formErrors.password}</FormErrorMessage>
              </FormControl>

              {isRegisterMode && (
                <FormControl isInvalid={!!formErrors.confirmPassword}>
                  <FormLabel fontSize="sm">确认密码</FormLabel>
                  <InputGroup>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      bg={useColorModeValue('white', 'gray.700')}
                      borderColor={useColorModeValue('gray.200', 'gray.500')}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                        icon={<Icon as={showConfirmPassword ? FaEyeSlash : FaEye} />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage fontSize="xs">{formErrors.confirmPassword}</FormErrorMessage>
                </FormControl>
              )}

              <Button
                onClick={handleEmailAuth}
                isLoading={loading}
                loadingText={isRegisterMode ? '注册中...' : '登录中...'}
                width="100%"
                size="lg"
                colorScheme="purple"
                isDisabled={!isConfigured}
              >
                {isRegisterMode ? '立即注册' : '立即登录'}
              </Button>

              <HStack width="100%" my={2}>
                <Divider />
                <Text fontSize="sm" color="gray.500" px={3}>
                  {t('auth.or')}
                </Text>
                <Divider />
              </HStack>

              <Button
                leftIcon={<Icon as={FaGoogle} />}
                onClick={handleGoogleLogin}
                isLoading={loading}
                loadingText={t('common.loading')}
                width="100%"
                size="lg"
                colorScheme="red"
                variant="outline"
                borderColor={borderColor}
                isDisabled={!isConfigured}
                _hover={{
                  bg: isConfigured ? 'red.50' : 'gray.100',
                  _dark: { bg: isConfigured ? 'red.900' : 'gray.700' }
                }}
              >
                {isRegisterMode ? '使用 Google 注册' : t('auth.loginWithGoogle')}
              </Button>

              <Button
                onClick={onClose}
                width="100%"
                variant="ghost"
                size="lg"
              >
                {t('auth.continueAsGuest')}
              </Button>
            </VStack>

            {/* 注册/登录切换链接 */}
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} textAlign="center">
              {isRegisterMode ? '已有账户？' : '还没有账户？'}
            <Button
                variant="link"
                size="sm"
                colorScheme="purple"
                onClick={switchMode}
                ml={1}
            >
                {isRegisterMode ? '立即登录' : '立即注册'}
            </Button>
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 