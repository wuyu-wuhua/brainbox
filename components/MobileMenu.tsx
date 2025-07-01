import React from 'react';
import {
  Box,
  VStack,
  Text,
  IconButton,
  Flex,
  useColorModeValue,
  CloseButton,
  Image,
  Link as ChakraLink,
  Button,
  Icon,
} from '@chakra-ui/react';
import { FaRobot, FaBook, FaPaintBrush, FaHistory, FaUser, FaPlus, FaVideo } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat?: () => void;
  onNewDraw?: () => void;
  onNewRead?: () => void;
  onNewVideo?: () => void;
}

const MenuItem = ({ href, icon: Icon, children, isActive, onClick, showAddButton, onAdd, t }) => (
  <Flex align="center" justify="space-between" w="full">
    <ChakraLink
      as={Link}
      href={href}
      flex={1}
      _hover={{ textDecoration: 'none' }}
      onClick={(e) => {
        if (isActive) {
          e.preventDefault();
        }
        onClick?.();
      }}
    >
      <Flex
        align="center"
        p={4}
        mx={-4}
        borderRadius="md"
        role="group"
        cursor="pointer"
        color={isActive ? 'purple.500' : 'inherit'}
        _hover={{
          bg: useColorModeValue('gray.100', 'gray.700'),
        }}
      >
        <Icon size="20px" />
        <Text ml={4} fontWeight={isActive ? 'bold' : 'normal'}>
          {children}
        </Text>
      </Flex>
    </ChakraLink>
    {showAddButton && (
      <IconButton
        aria-label={t('session.newButton')}
        icon={<FaPlus />}
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onAdd?.();
        }}
        mr={2}
      />
    )}
  </Flex>
);

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, onNewChat, onNewDraw, onNewRead, onNewVideo }) => {
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.900');
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 0, 0, 0.5)"
      zIndex={2000}
      display={{ base: 'block', md: 'none' }}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        w="280px"
        h="100vh"
        bg={bgColor}
        p={6}
        overflowY="auto"
      >
        <Flex justify="space-between" align="center" mb={8}>
          <Flex align="center">
            <Image src="/images/logo.png" alt="BrainBox Logo" boxSize="32px" />
            <Text fontSize="lg" fontWeight="bold" ml={2}>
              BrainBox
            </Text>
          </Flex>
          <CloseButton onClick={onClose} size="sm" />
        </Flex>

        <VStack spacing={4} align="stretch">
          <MenuItem
            href="/"
            icon={FaRobot}
            isActive={router.pathname === '/'}
            onClick={onClose}
            showAddButton={!!onNewChat}
            onAdd={() => {
              onNewChat?.();
              onClose();
            }}
            t={t}
          >
            {t('nav.aiChat')}
          </MenuItem>
          <MenuItem
            href="/draw"
            icon={FaPaintBrush}
            isActive={router.pathname === '/draw'}
            onClick={onClose}
            showAddButton={!!onNewDraw}
            onAdd={() => {
              onNewDraw?.();
              onClose();
            }}
            t={t}
          >
            {t('nav.aiDraw')}
          </MenuItem>
          <MenuItem
            href="/read"
            icon={FaBook}
            isActive={router.pathname === '/read'}
            onClick={onClose}
            showAddButton={!!onNewRead}
            onAdd={() => {
              onNewRead?.();
              onClose();
            }}
            t={t}
          >
            {t('nav.aiRead')}
          </MenuItem>
          <MenuItem
            href="/video"
            icon={FaVideo}
            isActive={router.pathname === '/video'}
            onClick={onClose}
            showAddButton={!!onNewVideo}
            onAdd={() => {
              onNewVideo?.();
              onClose();
            }}
            t={t}
          >
            {t('nav.aiVideo')}
          </MenuItem>
          <MenuItem
            href="/history"
            icon={FaHistory}
            isActive={router.pathname === '/history'}
            onClick={onClose}
            showAddButton={false}
            onAdd={undefined}
            t={t}
          >
            {t('nav.history')}
          </MenuItem>
          <MenuItem
            href="/space"
            icon={FaUser}
            isActive={router.pathname === '/space'}
            onClick={onClose}
            showAddButton={false}
            onAdd={undefined}
            t={t}
          >
            {t('nav.space')}
          </MenuItem>
        </VStack>
      </Box>
    </Box>
  );
};

export default MobileMenu; 