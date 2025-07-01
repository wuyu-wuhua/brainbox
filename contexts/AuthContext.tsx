import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useToast } from '@chakra-ui/react'
import { clearAllUserData, setCurrentUserId } from '../utils/storage'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    // 如果Supabase未配置，直接设置为未加载状态
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // 获取初始会话
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('初始会话检查:', { session: !!session, error, user: session?.user?.email })
        
        if (error) {
          console.error('获取会话失败:', error)
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        // 设置用户ID到存储工具中
        setCurrentUserId(session?.user?.id ?? null)
      } catch (error) {
        console.error('获取会话失败:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', { event, session: !!session, user: session?.user?.email })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        // 设置用户ID到存储工具中
        setCurrentUserId(session?.user?.id ?? null)
        
        setLoading(false)

        // 只在真正的登录事件时显示提示
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id
          const loginToastKey = `login_toast_shown_${userId}`
          const hasShownToast = localStorage.getItem(loginToastKey)
          
          // 只有在没有显示过登录提示时才显示
          if (!hasShownToast) {
            console.log('显示登录成功提示')
            localStorage.setItem(loginToastKey, 'true')
            toast({
              title: '登录成功',
              status: 'success',
              duration: 3000,
            })
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('用户已退出')
          
          // 立即清除用户数据和状态
          clearAllUserData()
          setCurrentUserId(null)
          
          // 清除登录提示标记，下次登录时可以再次显示
          const allKeys = Object.keys(localStorage)
          allKeys.forEach(key => {
            if (key.startsWith('login_toast_shown_')) {
              localStorage.removeItem(key)
            }
          })
          
          // 触发页面状态更新
          window.dispatchEvent(new Event('auth-state-changed'))
          
          toast({
            title: '已退出登录',
            status: 'info',
            duration: 3000,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [toast])

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: '登录功能未配置',
        description: '请配置Supabase环境变量后重试',
        status: 'warning',
        duration: 5000,
      })
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Google登录错误:', error)
      toast({
        title: '登录失败',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const signInWithGithub = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: '登录功能未配置',
        description: '请配置Supabase环境变量后重试',
        status: 'warning',
        duration: 5000,
      })
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('GitHub登录错误:', error)
      toast({
        title: '登录失败',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return
    }

    try {
      // 先清除用户数据
      clearAllUserData()
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('登出错误:', error)
      toast({
        title: '登出失败',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      })
    }
  }

  const value = {
    user,
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    signInWithGoogle,
    signInWithGithub,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 