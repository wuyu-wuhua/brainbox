import React, { useState } from 'react';
import {
  Box,
  VStack,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  Text,
  Progress,
  Select,
  HStack,
  IconButton,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
} from '@chakra-ui/react';
import { FiX, FiVideo } from 'react-icons/fi';
import { videoService } from '../services/videoService';
import { useLanguage } from '../contexts/LanguageContext';

interface VideoViewProps {
  onClose: () => void;
}

export default function VideoView({ onClose }: VideoViewProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [size, setSize] = useState('1280*720');
  const [error, setError] = useState('');
  const toast = useToast();
  const { t } = useLanguage();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: t('chat.videoPromptRequired'),
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError('');
    try {
      // 开始生成视频
      const response = await videoService.generateVideo(prompt, size);
      const taskId = response.output.task_id;
      
      // 开始轮询检查状态
      const checkStatus = async () => {
        try {
          const statusResponse = await videoService.checkVideoStatus(taskId);
          if (statusResponse.output.task_status === 'SUCCEEDED') {
            setVideoUrl(statusResponse.output.video_url || '');
            setIsGenerating(false);
            setProgress(100);
            toast({
              title: t('chat.videoSuccess'),
              status: 'success',
              duration: 2000,
            });
          } else if (statusResponse.output.task_status === 'FAILED') {
            setIsGenerating(false);
            setError(t('chat.videoFailed'));
            toast({
              title: t('chat.videoFailed'),
              status: 'error',
              duration: 2000,
            });
          } else {
            // 继续轮询
            setProgress(prev => Math.min(prev + 10, 90));
            setTimeout(checkStatus, 5000);
          }
        } catch (error) {
          console.error('Error checking video status:', error);
          setIsGenerating(false);
          setError(t('chat.videoCheckFailed'));
        }
      };

      // 开始第一次状态检查
      setTimeout(checkStatus, 5000);

    } catch (error) {
      console.error('Error generating video:', error);
      setIsGenerating(false);
      setError(t('chat.videoGenerationFailed'));
      toast({
        title: t('chat.videoGenerationFailed'),
        description: t('chat.tryAgainLater'),
        status: 'error',
        duration: 2000,
      });
    }
  };

  return (
    <Box
      bg={useColorModeValue('white', 'gray.800')}
      borderRadius="lg"
      p={6}
      shadow="md"
      w="full"
    >
      <HStack justify="space-between" mb={4}>
        <Text fontSize="xl" fontWeight="bold">{t('chat.video')}</Text>
        <IconButton
          icon={<FiX />}
          aria-label={t('common.close')}
          variant="ghost"
          onClick={onClose}
        />
      </HStack>

      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>{t('chat.videoPrompt')}</FormLabel>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('chat.videoPlaceholder')}
            size="lg"
            rows={4}
            isDisabled={isGenerating}
          />
        </FormControl>

        <FormControl>
          <FormLabel>{t('chat.videoSize')}</FormLabel>
          <Select 
            value={size} 
            onChange={(e) => setSize(e.target.value)}
            isDisabled={isGenerating}
          >
            <option value="1280*720">1280*720</option>
            <option value="1920*1080">1920*1080</option>
          </Select>
        </FormControl>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Button
          leftIcon={<FiVideo />}
          colorScheme="purple"
          onClick={handleGenerate}
          isLoading={isGenerating}
          loadingText={t('chat.videoGenerating')}
          isDisabled={!prompt.trim()}
        >
          {t('chat.videoGenerate')}
        </Button>

        {isGenerating && (
          <Box>
            <Text mb={2}>{t('chat.videoProgress')}</Text>
            <Progress value={progress} size="sm" colorScheme="purple" />
            <HStack justify="center" mt={2}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.500">{t('chat.videoProcessing')}</Text>
            </HStack>
          </Box>
        )}

        {videoUrl && (
          <Box>
            <Text mb={2}>{t('chat.videoResult')}</Text>
            <video
              src={videoUrl}
              controls
              style={{ width: '100%', borderRadius: '8px' }}
              poster="/images/video-placeholder.png"
            />
          </Box>
        )}
      </VStack>
    </Box>
  );
} 