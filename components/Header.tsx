import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  IconButton,
  useColorMode,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  HStack,
  Avatar,
  Text,
  useDisclosure,
  MenuDivider,
  Icon,
} from '@chakra-ui/react';
import { FaSun, FaMoon, FaGlobe, FaUser, FaSignOutAlt, FaCrown } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';
import { useRouter } from 'next/router';

const Header = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, loading, isConfigured } = useAuth();
  const { isOpen: isLoginOpen, onOpen: onLoginOpen, onClose: onLoginClose } = useDisclosure();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // 确保在客户端渲染
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleProfileClick = () => {
    router.push('/space');
  };

  const handleMembershipClick = () => {
    router.push('/membership');
  };

  // 调试日志
  useEffect(() => {
    console.log('Header - 认证状态:', {
      user: !!user,
      loading,
      isConfigured,
      userEmail: user?.email,
      userName: user?.user_metadata?.full_name
    });
  }, [user, loading, isConfigured]);

  return (
    <>
      <Box
        as="header"
        position="fixed"
        top={0}
        right={0}
        left={{ base: '60px', md: '250px' }}
        h="60px"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        px={4}
        zIndex={25}
        transition="left 0.2s"
      >
        <Flex h="full" align="center" justify="flex-end">
          <HStack spacing={{ base: 1, md: 2 }}>
            {/* 会员按钮 */}
            <Button
              leftIcon={<Icon as={FaCrown} />}
              size={{ base: 'sm', md: 'md' }}
              bgGradient="linear(to-r, yellow.400, orange.400, yellow.500)"
              color="white"
              _hover={{
                bgGradient: "linear(to-r, yellow.500, orange.500, yellow.600)",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(255, 193, 7, 0.4)"
              }}
              _active={{
                transform: "translateY(0)"
              }}
              fontWeight="bold"
              borderRadius="full"
              px={{ base: 3, md: 4 }}
              onClick={handleMembershipClick}
              transition="all 0.2s"
              boxShadow="0 2px 8px rgba(255, 193, 7, 0.3)"
            >
              <Text display={{ base: 'none', md: 'block' }}>{t('membership.subscribe')}</Text>
            </Button>

            <IconButton
              aria-label={colorMode === 'light' ? '切换深色模式' : '切换浅色模式'}
              icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
              onClick={toggleColorMode}
              variant="ghost"
              size={{ base: 'sm', md: 'md' }}
            />

            <Menu>
              <MenuButton
                as={IconButton}
                aria-label={t('nav.switchLanguage')}
                icon={<FaGlobe />}
                variant="ghost"
                size={{ base: 'sm', md: 'md' }}
              />
              <MenuList zIndex={30}>
                <MenuItem 
                  onClick={() => setLanguage('zh')}
                  bg={language === 'zh' ? 'blue.50' : 'transparent'}
                  _dark={{ bg: language === 'zh' ? 'blue.900' : 'transparent' }}
                >
                  🇨🇳 简体中文
                </MenuItem>
                <MenuItem 
                  onClick={() => setLanguage('en')}
                  bg={language === 'en' ? 'blue.50' : 'transparent'}
                  _dark={{ bg: language === 'en' ? 'blue.900' : 'transparent' }}
                >
                  🇺🇸 English
                </MenuItem>
              </MenuList>
            </Menu>

            {/* 认证状态渲染 */}
            {isClient && isConfigured && (
              <>
                {user ? (
                  <Menu>
                    <MenuButton>
                      <HStack spacing={2} cursor="pointer">
                        <Avatar 
                          size={{ base: 'sm', md: 'sm' }} 
                          src={user.user_metadata?.avatar_url}
                          name={user.user_metadata?.full_name || user.email}
                        />
                        <Text 
                          fontSize="sm" 
                          display={{ base: 'none', md: 'block' }}
                          maxW="120px"
                          isTruncated
                        >
                          {user.user_metadata?.full_name || user.email}
                        </Text>
                      </HStack>
                    </MenuButton>
                    <MenuList zIndex={30}>
                      <MenuItem icon={<FaUser />} onClick={handleProfileClick}>
                        {t('auth.profile')}
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem 
                        icon={<FaSignOutAlt />} 
                        onClick={handleSignOut}
                        isDisabled={loading}
                      >
                        {t('auth.logout')}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                ) : (
                  <>
                    <Button
                      leftIcon={<FaUser />}
                      variant="outline"
                      size={{ base: 'sm', md: 'md' }}
                      display={{ base: 'none', sm: 'flex' }}
                      onClick={onLoginOpen}
                      isLoading={loading}
                    >
                      {t('auth.login')}
                    </Button>
                    <IconButton
                      aria-label={t('auth.login')}
                      icon={<FaUser />}
                      variant="outline"
                      size={{ base: 'sm', md: 'md' }}
                      display={{ base: 'flex', sm: 'none' }}
                      onClick={onLoginOpen}
                      isLoading={loading}
                    />
                  </>
                )}
              </>
            )}

            {/* 未配置状态 */}
            {isClient && !isConfigured && (
              <Text fontSize="sm" color="red.500">
                未配置
              </Text>
            )}
          </HStack>
        </Flex>
      </Box>

      <LoginModal isOpen={isLoginOpen} onClose={onLoginClose} />
    </>
  );
};

export default Header; 