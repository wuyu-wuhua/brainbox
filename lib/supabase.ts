import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 检查环境变量是否配置
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase环境变量未配置，登录功能将不可用')
  console.warn('请创建 .env.local 文件并配置以下变量：')
  console.warn('NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url')
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
}

// 创建一个默认的客户端，即使没有配置环境变量也不会报错
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// 用于服务端的Supabase客户端
export const createServerSupabaseClient = () => {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  )
}

// 导出配置状态
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey) 