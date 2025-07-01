import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { 
  addFavoriteToDB, 
  removeFavoriteFromDB, 
  getUserFavoritesFromDB,
  addActivityToDB,
  getUserActivitiesFromDB,
  getHistoriesFromDB,
  saveUserStatsToDB,
  getUserStatsFromDB,
  deleteHistoryFromDB
} from '../utils/databaseStorage'
import { ChatHistory } from '../types/chat'

interface UserStats {
  conversations: number
  images: number
  documents: number
  videos: number
  credits: number
}

interface Activity {
  id: string
  type: 'conversation' | 'image' | 'document' | 'video'
  title: string
  timestamp: string
  description?: string
}

interface Favorite {
  id: string
  type: 'conversation' | 'image' | 'document' | 'video'
  title: string
  description: string
  timestamp: string
}

interface UserActivityContextType {
  userStats: UserStats
  recentActivities: Activity[]
  favorites: Favorite[]
  histories: any[]
  loading: boolean
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => Promise<void>
  addFavorite: (favorite: Omit<Favorite, 'id' | 'timestamp'>) => Promise<void>
  removeFavorite: (id: string) => Promise<void>
  removeHistory: (id: string) => Promise<void>
  updateStats: (type: keyof UserStats, increment?: number) => void
  clearUserData: () => void
  getUserQuota: (type: 'conversation' | 'image' | 'document' | 'video') => number
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined)

// 免费额度和会员额度常量
const FREE_QUOTA = {
  conversations: 50,
  images: 5,
  documents: 50, // PDF 50次（限10页）
  videos: 2,
};
const ANNUAL_QUOTA = {
  conversations: Infinity,
  images: 100,
  documents: Infinity,
  videos: 25,
};
const MONTHLY_QUOTA = {
  conversations: Infinity,
  images: 100,
  documents: Infinity,
  videos: 25,
};

// 获取当前用户会员类型
function getMembershipType(user: any): 'free' | 'pro-annual' | 'pro-monthly' {
  if (!user) return 'free';
  const type = user.user_metadata?.membershipType;
  if (type === 'pro-annual' || type === 'pro-monthly') return type;
  return 'free';
}

// 获取当前用户配额
function getUserQuota(type: 'conversation' | 'image' | 'document' | 'video', user: any) {
  const membership = getMembershipType(user);
  if (membership === 'pro-annual') {
    if (type === 'conversation' || type === 'document') return ANNUAL_QUOTA[type + 's'];
    return ANNUAL_QUOTA[type + 's'];
  }
  if (membership === 'pro-monthly') {
    if (type === 'conversation' || type === 'document') return MONTHLY_QUOTA[type + 's'];
    return MONTHLY_QUOTA[type + 's'];
  }
  return FREE_QUOTA[type + 's'];
}

export const UserActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  
  const [userStats, setUserStats] = useState<UserStats>({
    conversations: 0,
    images: 0,
    documents: 0,
    videos: 0,
    credits: 10000, // 默认给新用户10000积分
  })
  
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    const userId = user?.id;
    if (userId) {
      const local = localStorage.getItem(`userFavorites_${userId}`);
      return local ? JSON.parse(local) : [];
    }
    return [];
  })
  const [histories, setHistories] = useState<any[]>(() => {
    const userId = user?.id;
    if (userId) {
      const local = localStorage.getItem(`chatHistories_${userId}`);
      return local ? JSON.parse(local) : [];
    }
    return [];
  })
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !hasLoaded) {
      // 先本地兜底
      const userId = user.id;
      const localHistories = localStorage.getItem(`chatHistories_${userId}`);
      if (localHistories) setHistories(JSON.parse(localHistories));
      const localFavorites = localStorage.getItem(`userFavorites_${userId}`);
      if (localFavorites) setFavorites(JSON.parse(localFavorites));
      setLoading(true);
      loadUserData().finally(() => {
        setLoading(false);
        setHasLoaded(true);
      });
    } else if (!user) {
      setHistories([]);
      setFavorites([]);
      setLoading(false);
      setHasLoaded(false);
    }
  }, [user])

  const clearUserData = () => {
    setUserStats({
      conversations: 0,
      images: 0,
      documents: 0,
      videos: 0,
      credits: 10000, // 重置时也给10000积分
    })
    setRecentActivities([])
    setFavorites([])
    setHistories([])
  }

  const loadUserData = async () => {
    if (!user) return
    const userId = user.id
    try {
      // 历史记录
      const dbHistories = await getHistoriesFromDB()
      if (dbHistories && dbHistories.length > 0) {
        setHistories(dbHistories)
        localStorage.setItem(`chatHistories_${userId}`, JSON.stringify(dbHistories))
      }
      // 活动（历史）
      const dbActivities = await getUserActivitiesFromDB(100)
      if (dbActivities && dbActivities.length > 0) {
        const activities = dbActivities.map((a: any) => ({
          id: a.id || a.created_at || Date.now().toString(),
          type: a.type,
          title: a.title,
          timestamp: a.created_at || a.timestamp || new Date().toLocaleString('zh-CN'),
          description: a.description || ''
        }))
        setRecentActivities(activities)
        localStorage.setItem(`userActivities_${userId}`, JSON.stringify(activities))
      }
      // 收藏
      const dbFavorites = await getUserFavoritesFromDB()
      if (dbFavorites && dbFavorites.length > 0) {
        const favs = dbFavorites.map((f: any) => ({
          id: f.item_id || f.id || f.created_at || Date.now().toString(),
          type: f.item_type,
          title: f.title,
          description: f.content?.description || (typeof f.content === 'string' ? JSON.parse(f.content).description : ''),
          timestamp: f.content?.timestamp || f.created_at || new Date().toISOString().split('T')[0]
        }))
        setFavorites(favs)
        localStorage.setItem(`userFavorites_${userId}`, JSON.stringify(favs))
      }
      // 拉取 Supabase 统计
      const dbStats = await getUserStatsFromDB();
      if (dbStats) {
        setUserStats({
          conversations: dbStats.total_conversations || 0,
          images: dbStats.total_images || 0,
          documents: dbStats.total_documents || 0,
          videos: dbStats.total_videos || 0,
          credits: dbStats.credits || 10000,
        });
        localStorage.setItem(`userStats_${userId}`, JSON.stringify({
          conversations: dbStats.total_conversations || 0,
          images: dbStats.total_images || 0,
          documents: dbStats.total_documents || 0,
          videos: dbStats.total_videos || 0,
          credits: dbStats.credits || 10000,
        }));
      }
    } catch (e) {
      // 兜底本地
      const savedHistories = localStorage.getItem(`chatHistories_${userId}`)
      // 这里只同步到localStorage，具体页面/组件可自行拉取
      const savedActivities = localStorage.getItem(`userActivities_${userId}`)
      if (savedActivities) setRecentActivities(JSON.parse(savedActivities))
      const savedFavorites = localStorage.getItem(`userFavorites_${userId}`)
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites))
      const savedStats = localStorage.getItem(`userStats_${userId}`);
      if (savedStats) setUserStats(JSON.parse(savedStats));
    }
  }

  const saveUserData = (stats: UserStats, activities: Activity[], favs: Favorite[]) => {
    if (!user) return

    const userId = user.id
    localStorage.setItem(`userStats_${userId}`, JSON.stringify(stats))
    localStorage.setItem(`userActivities_${userId}`, JSON.stringify(activities))
    localStorage.setItem(`userFavorites_${userId}`, JSON.stringify(favs))
  }

  const addActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    if (!user) return

    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('zh-CN'),
    }

    // 立即更新本地状态
    const updatedActivities = [newActivity, ...recentActivities.slice(0, 9)]
    setRecentActivities(updatedActivities)

    const updatedStats = {
      ...userStats,
      [activity.type === 'conversation' ? 'conversations' : 
       activity.type === 'image' ? 'images' : 
       activity.type === 'document' ? 'documents' : 'videos']: 
       userStats[activity.type === 'conversation' ? 'conversations' : 
                 activity.type === 'image' ? 'images' : 
                 activity.type === 'document' ? 'documents' : 'videos'] + 1
    }
    setUserStats(updatedStats)
    saveUserData(updatedStats, updatedActivities, favorites)

    // 同时保存到数据库
    try {
      await addActivityToDB({
        type: activity.type,
        title: activity.title,
        description: activity.description
      })
      console.log('活动已保存到数据库')
    } catch (error) {
      console.error('保存活动到数据库失败:', error)
    }

    // 新增：同步到 Supabase
    saveUserStatsToDB({
      total_conversations: updatedStats.conversations,
      total_messages: updatedStats.images + updatedStats.documents + updatedStats.videos, // 合并为消息数
      // credits 字段如有需要可加到 favorite_model 或扩展表结构
    });
  }

  const addFavorite = async (favorite: Omit<Favorite, 'id' | 'timestamp'>) => {
    if (!user) return

    const newFavorite: Favorite = {
      ...favorite,
      id: Date.now().toString(),
      timestamp: new Date().toISOString().split('T')[0],
    }

    // 立即更新本地状态
    const updatedFavorites = [newFavorite, ...favorites]
    setFavorites(updatedFavorites)
    saveUserData(userStats, recentActivities, updatedFavorites)

    // 同时保存到数据库
    try {
      await addFavoriteToDB({
        item_type: favorite.type,
        item_id: newFavorite.id,
        title: favorite.title,
        content: { 
          description: favorite.description,
          timestamp: newFavorite.timestamp 
        }
      })
      console.log('收藏已保存到数据库')
    } catch (error) {
      console.error('保存收藏到数据库失败:', error)
    }

    // 新增：同步到 Supabase
    saveUserStatsToDB({
      total_conversations: userStats.conversations,
      total_messages: userStats.images + userStats.documents + userStats.videos, // 合并为消息数
      // credits 字段如有需要可加到 favorite_model 或扩展表结构
    });
  }

  const removeFavorite = async (id: string) => {
    if (!user) return

    // 本地先删
    const updatedFavorites = favorites.filter(fav => fav.id !== id)
    setFavorites(updatedFavorites)
    saveUserData(userStats, recentActivities, updatedFavorites)

    // 数据库同步
    try {
      await removeFavoriteFromDB(id)
      // 删除后重新拉取云端，确保一致
      const dbFavorites = await getUserFavoritesFromDB()
      const favs = dbFavorites.map((f: any) => ({
        id: f.item_id || f.id || f.created_at || Date.now().toString(),
        type: f.item_type,
        title: f.title,
        description: f.content?.description || (typeof f.content === 'string' ? JSON.parse(f.content).description : ''),
        timestamp: f.content?.timestamp || f.created_at || new Date().toISOString().split('T')[0]
      }))
      setFavorites(favs)
      localStorage.setItem(`userFavorites_${user.id}`, JSON.stringify(favs))
    } catch (error) {
      console.error('从数据库删除收藏失败:', error)
    }

    // 新增：同步到 Supabase
    saveUserStatsToDB({
      total_conversations: userStats.conversations,
      total_messages: userStats.images + userStats.documents + userStats.videos, // 合并为消息数
      // credits 字段如有需要可加到 favorite_model 或扩展表结构
    });
  }

  const removeHistory = async (id: string) => {
    if (!user) return;
    // 本地先删
    const updatedHistories = histories.filter(h => h.id !== id);
    setHistories(updatedHistories);
    localStorage.setItem(`chatHistories_${user.id}`, JSON.stringify(updatedHistories));
    // 数据库同步
    try {
      await deleteHistoryFromDB(id);
      // 删除后重新拉取云端，确保一致
      const dbHistories = await getHistoriesFromDB();
      setHistories(dbHistories);
      localStorage.setItem(`chatHistories_${user.id}`, JSON.stringify(dbHistories));
    } catch (e) {
      console.error('数据库删除历史记录失败:', e);
    }
  };

  const updateStats = (type: keyof UserStats, increment: number = 1) => {
    if (!user) return
    const updatedStats = {
      ...userStats,
      [type]: userStats[type] + increment
    }
    setUserStats(updatedStats)
    saveUserData(updatedStats, recentActivities, favorites)
    // 新增：同步到 Supabase
    saveUserStatsToDB({
      total_conversations: updatedStats.conversations,
      total_messages: updatedStats.images + updatedStats.documents + updatedStats.videos, // 合并为消息数
      // credits 字段如有需要可加到 favorite_model 或扩展表结构
    });
  }

  return (
    <UserActivityContext.Provider
      value={{
        userStats,
        recentActivities,
        favorites,
        histories,
        loading,
        addActivity,
        addFavorite,
        removeFavorite,
        removeHistory,
        updateStats,
        clearUserData,
        getUserQuota: (type: 'conversation' | 'image' | 'document' | 'video') => getUserQuota(type, user),
      }}
    >
      {children}
    </UserActivityContext.Provider>
  )
}

export const useUserActivity = () => {
  const context = useContext(UserActivityContext)
  if (context === undefined) {
    throw new Error('useUserActivity must be used within a UserActivityProvider')
  }
  return context
} 