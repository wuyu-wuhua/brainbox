import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Textarea,
  Button,
  Select,
  FormControl,
  FormLabel,
  useColorModeValue,
  Icon,
  Divider,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiX, FiGlobe, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

interface TranslateViewProps {
  onClose: () => void;
}

const TranslateView: React.FC<TranslateViewProps> = ({ onClose }) => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const languages = [
    { code: 'auto', name: t('translate.autoDetect') },
    { code: 'zh', name: t('common.chinese') },
    { code: 'en', name: t('common.english') },
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast({
        title: '请输入要翻译的文本',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          from: sourceLang,
          to: targetLang,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTargetText(data.translatedText);
        toast({
          title: '翻译成功',
          status: 'success',
          duration: 2000,
        });
      } else {
        setError(data.error || '翻译失败');
        toast({
          title: '翻译失败',
          description: data.details || data.error,
          status: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('翻译请求错误:', error);
      setError('网络错误，请检查网络连接');
      toast({
        title: '网络错误',
        description: '请检查网络连接后重试',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
      setSourceText(targetText);
      setTargetText(sourceText);
      setError('');
    }
  };

  const handleClearAll = () => {
    setSourceText('');
    setTargetText('');
    setError('');
  };

  return (
    <Box
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="xl"
      p={6}
      w="full"
      maxW="800px"
      mx="auto"
    >
      <HStack justify="space-between" mb={4}>
        <HStack>
          <Icon as={FiGlobe} color="green.500" />
          <Heading size="md">{t('translate.title')}</Heading>
        </HStack>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          leftIcon={<Icon as={FiX} />}
        >
          {t('common.close')}
        </Button>
      </HStack>

      <Text color="gray.500" mb={6}>
        {t('translate.description')}
      </Text>

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <VStack spacing={4} align="stretch">
        {/* 语言选择 */}
        <HStack spacing={4} align="center">
          <FormControl>
            <FormLabel>{t('translate.sourceLang')}</FormLabel>
            <Select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <IconButton
            aria-label={t('translate.swapLanguages')}
            icon={<FiRefreshCw />}
            variant="ghost"
            onClick={handleSwapLanguages}
            isDisabled={sourceLang === 'auto' || isLoading}
            mt={8}
          />

          <FormControl>
            <FormLabel>{t('translate.targetLang')}</FormLabel>
            <Select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              {languages.filter(lang => lang.code !== 'auto').map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </Select>
          </FormControl>
        </HStack>

        {/* 翻译区域 */}
        <HStack spacing={4} align="stretch">
          <FormControl flex={1}>
            <FormLabel>{t('translate.sourceText')}</FormLabel>
            <Textarea
              placeholder={t('translate.sourcePlaceholder')}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              resize="vertical"
              isDisabled={isLoading}
            />
          </FormControl>

          <Box display="flex" alignItems="center" pt={8}>
            {isLoading ? (
              <Spinner size="sm" color="green.500" />
            ) : (
              <Icon as={FiArrowRight} color="gray.400" />
            )}
          </Box>

          <FormControl flex={1}>
            <FormLabel>{t('translate.targetText')}</FormLabel>
            <Textarea
              placeholder={t('translate.targetPlaceholder')}
              value={targetText}
              isReadOnly
              rows={6}
              resize="vertical"
              bg={useColorModeValue('gray.50', 'gray.700')}
            />
          </FormControl>
        </HStack>

        <Divider />

        <HStack justify="space-between" spacing={3}>
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            isDisabled={isLoading}
          >
            清空
          </Button>
          
          <HStack spacing={3}>
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              colorScheme="green"
              leftIcon={isLoading ? <Spinner size="sm" /> : <Icon as={FiGlobe} />}
              onClick={handleTranslate}
              isDisabled={!sourceText.trim() || isLoading}
              isLoading={isLoading}
              loadingText="翻译中..."
            >
              {t('translate.startTranslate')}
            </Button>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};

export default TranslateView;