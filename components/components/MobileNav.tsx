import React from 'react';
import {
  Box,
  IconButton,
  Flex,
  useColorModeValue,
  useDisclosure,
  Image,
  Heading,
  useColorMode,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
} from '@chakra-ui/react';
import { HamburgerIcon, MoonIcon, SunIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { FiGlobe, FiUser } from 'react-icons/fi';
import MobileMenu from './MobileMenu';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileNavProps {
  onClearHistory?: () => void;
  onNewChat?: () => void;
  onNewDraw?: () => void;
  onNewRead?: () => void;
  onNewVideo?: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ onClearHistory, onNewChat, onNewDraw, onNewRead, onNewVideo }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue('white', 'gray.800');
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      <Box
        display={{ base: 'block', md: 'none' }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg={bgColor}
        boxShadow="sm"
        zIndex={25}
      >
        <Flex px={4} h="60px" align="center" justify="space-between">
          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            onClick={onOpen}
            variant="ghost"
            size="sm"
          />
          
          <Flex align="center">
            <Image src="/images/logo.png" alt="BrainBox Logo" boxSize="32px" />
            <Heading size="sm" ml={2}>{t('common.brainbox')}</Heading>
          </Flex>
          
          <HStack spacing={1}>
            <IconButton
              aria-label={t('common.toggleColorMode')}
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
            />
            
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label={t('common.translate')}
                icon={<FiGlobe />}
                variant="ghost"
                size="sm"
              />
              <MenuList minW="120px" zIndex={30}>
                <MenuItem 
                  onClick={() => setLanguage('zh')}
                  bg={language === 'zh' ? 'blue.50' : 'transparent'}
                  _dark={{ bg: language === 'zh' ? 'blue.900' : 'transparent' }}
                >
                  <HStack>
                    <Text>🇨🇳</Text>
                    <Text>{t('common.chinese')}</Text>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  onClick={() => setLanguage('en')}
                  bg={language === 'en' ? 'blue.50' : 'transparent'}
                  _dark={{ bg: language === 'en' ? 'blue.900' : 'transparent' }}
                >
                  <HStack>
                    <Text>🇺🇸</Text>
                    <Text>{t('common.english')}</Text>
                  </HStack>
                </MenuItem>
              </MenuList>
            </Menu>
            
            <IconButton
              aria-label={t('common.login')}
              icon={<FiUser />}
              variant="ghost"
              size="sm"
            />
          </HStack>
        </Flex>
      </Box>

      <MobileMenu isOpen={isOpen} onClose={onClose} onNewChat={onNewChat} onNewDraw={onNewDraw} onNewRead={onNewRead} onNewVideo={onNewVideo} />
    </>
  );
};

export default MobileNav; 