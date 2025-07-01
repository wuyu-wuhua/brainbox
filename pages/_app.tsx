import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AuthProvider } from '../contexts/AuthContext';
import { UserActivityProvider } from '../contexts/UserActivityContext';
import StagewiseToolbar from '../components/StagewiseToolbar';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <LanguageProvider>
        <AuthProvider>
          <UserActivityProvider>
      <Head>
        <title>BrainBox</title>
        <meta name="description" content="BrainBox - 一站使用全球AI大模型，体验AI对话、AI绘画和AI阅读的强大功能。" />
        <link rel="icon" href="/images/logo.png" />
      </Head>
      <StagewiseToolbar />
      <Component {...pageProps} />
          </UserActivityProvider>
        </AuthProvider>
      </LanguageProvider>
    </ChakraProvider>
  );
} 