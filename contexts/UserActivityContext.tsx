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
  deleteHistoryFromDB,
  saveCompleteUserStatsToDB,
  getCompleteUserStatsFromDB,
  forceUpdateUserStats,
  forceAddActivity,
  debugUserStatsTable
} from '../utils/databaseStorage'
import { ChatHistory } from '../types/chat'
import { getCurrentTimeString } from '../utils/dateUtils'

interface UserStats {
  conversations: number
  images: number
  documents: number
  videos: number
  credits: number
  // 免费额度使用情况
  free_conversations_used: number
  free_images_used: number
  free_documents_used: number
  free_videos_used: number
  // 免费额度限制
  free_conversations_limit: number
  free_images_limit: number
  free_documents_limit: number
  free_videos_limit: number
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
  refreshHistories: () => Promise<void>
  checkFreeQuotaExceeded: (type: 'conversation' | 'image' | 'document' | 'video') => boolean
  getRemainingFreeQuota: (type: 'conversation' | 'image' | 'document' | 'video') => number
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
    // 免费额度使用情况
    free_conversations_used: 0,
    free_images_used: 0,
    free_documents_used: 0,
    free_videos_used: 0,
    // 免费额度限制
    free_conversations_limit: 50,
    free_images_limit: 5,
    free_documents_limit: 50,
    free_videos_limit: 2,
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
    if (user) {
      console.log('用户状态变化，开始加载用户数据...', user.id);
      // 立即从本地加载数据（快速显示）
      const userId = user.id;
      
      // 加载历史记录
      const localHistories = localStorage.getItem(`chatHistories_${userId}`);
      if (localHistories) setHistories(JSON.parse(localHistories));
      
      // 加载收藏
      const localFavorites = localStorage.getItem(`userFavorites_${userId}`);
      if (localFavorites) setFavorites(JSON.parse(localFavorites));
      
      // 加载统计数据
      const localStats = localStorage.getItem(`userStats_${userId}`);
      if (localStats) {
        try {
          setUserStats(JSON.parse(localStats));
        } catch (error) {
          console.error('解析本地统计数据失败:', error);
        }
      }
      
      // 加载活动记录
      const localActivities = localStorage.getItem(`userActivities_${userId}`);
      if (localActivities) {
        try {
          setRecentActivities(JSON.parse(localActivities));
        } catch (error) {
          console.error('解析本地活动数据失败:', error);
        }
      }
      
      setLoading(true);
      
      // 后台同步数据库数据 - 每次用户登录都重新加载
      loadUserData().finally(() => {
        setLoading(false);
        setHasLoaded(true);
      });
      
    } else {
      // 用户未登录，重置所有数据
      console.log('用户未登录，重置数据');
      setHistories([]);
      setFavorites([]);
      setUserStats({
        conversations: 0,
        images: 0,
        documents: 0,
        videos: 0,
        credits: 10000,
        free_conversations_used: 0,
        free_images_used: 0,
        free_documents_used: 0,
        free_videos_used: 0,
        free_conversations_limit: 50,
        free_images_limit: 5,
        free_documents_limit: 50,
        free_videos_limit: 2,
      });
      setRecentActivities([]);
      setLoading(false);
      setHasLoaded(false);
    }
  }, [user?.id]) // 监听用户ID变化，确保每次登录都重新加载

  // 监听历史记录更新事件
  useEffect(() => {
    if (!user) return;

    // 监听来自storage.ts的历史记录更新
    const handleHistoryUpdated = () => {
      const userId = user.id;
      const localHistories = localStorage.getItem(`user_${userId}_chat_histories`);
      if (localHistories) {
        const histories = JSON.parse(localHistories);
        setHistories(histories);
      }
    };

    window.addEventListener('history-updated', handleHistoryUpdated);

    return () => {
      window.removeEventListener('history-updated', handleHistoryUpdated);
    };
  }, [user])

  const clearUserData = () => {
    setUserStats({
      conversations: 0,
      images: 0,
      documents: 0,
      videos: 0,
      credits: 10000, // 重置时也给10000积分
      free_conversations_used: 0,
      free_images_used: 0,
      free_documents_used: 0,
      free_videos_used: 0,
      free_conversations_limit: 50,
      free_images_limit: 5,
      free_documents_limit: 50,
      free_videos_limit: 2,
    })
    setRecentActivities([])
    setFavorites([])
    setHistories([])
  }

  const loadUserData = async () => {
    if (!user) return
    const userId = user.id
    try {
      // 历史记录 - 使用storage.ts中的混合存储方式
      try {
        const { getHistoriesAsync } = await import('../utils/storage');
        const histories = await getHistoriesAsync();
        if (histories && histories.length > 0) {
          setHistories(histories);
        }
      } catch (error) {
        console.error('获取历史记录失败，使用本地数据:', error);
        // 如果数据库失败，使用本地数据
        const { getHistories } = await import('../utils/storage');
        const localHistories = getHistories();
        setHistories(localHistories);
      }
      
      // 活动（历史）
      const dbActivities = await getUserActivitiesFromDB(100)
      if (dbActivities && dbActivities.length > 0) {
        const activities = dbActivities.map((a: any) => ({
          id: a.id || a.created_at || Date.now().toString(),
          type: a.type,
          title: a.title,
          timestamp: a.created_at || a.timestamp || getCurrentTimeString(),
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
          timestamp: f.created_at || f.content?.timestamp || getCurrentTimeString()
        }))
        setFavorites(favs)
        localStorage.setItem(`userFavorites_${userId}`, JSON.stringify(favs))
      }
      
      // 统计数据 - 始终从数据库加载用户的真实数据
      console.log('开始从数据库加载用户统计数据...');
      
      // 首先调试表结构，确认字段名
      console.log('调试数据库表结构...');
      try {
        const debugResult = await debugUserStatsTable();
        console.log('调试结果:', debugResult);
      } catch (debugError) {
        console.error('调试表结构失败:', debugError);
      }
      
      const dbStats = await getCompleteUserStatsFromDB();
      
      if (dbStats) {
        // 数据库中有用户记录，直接使用数据库数据
        console.log('从数据库加载到用户统计数据:', dbStats);
        setUserStats(dbStats);
        localStorage.setItem(`userStats_${userId}`, JSON.stringify(dbStats));
      } else {
        // 数据库中没有用户记录，创建默认记录并保存到数据库
        console.log('数据库中没有用户记录，创建默认统计数据...');
        const defaultStats = {
          conversations: 0,
          images: 0,
          documents: 0,
          videos: 0,
          credits: 10000, // 默认给新用户10000积分
          // 免费额度使用情况
          free_conversations_used: 0,
          free_images_used: 0,
          free_documents_used: 0,
          free_videos_used: 0,
          // 免费额度限制
          free_conversations_limit: 50,
          free_images_limit: 5,
          free_documents_limit: 50,
          free_videos_limit: 2,
        };
        
        // 保存默认统计数据到数据库
        try {
          const saveSuccess = await saveCompleteUserStatsToDB(defaultStats);
          if (saveSuccess) {
            console.log('默认统计数据已保存到数据库');
          } else {
            console.warn('默认统计数据保存到数据库失败，仅使用本地数据');
          }
        } catch (error) {
          console.error('保存默认统计数据到数据库异常:', error);
        }
        
        setUserStats(defaultStats);
        localStorage.setItem(`userStats_${userId}`, JSON.stringify(defaultStats));
      }
      
    } catch (e) {
      console.error('加载用户数据失败，使用本地备份数据:', e);
      // 兜底本地
      const savedHistories = localStorage.getItem(`chatHistories_${userId}`)
      // 这里只同步到localStorage，具体页面/组件可自行拉取
      const savedActivities = localStorage.getItem(`userActivities_${userId}`)
      if (savedActivities) setRecentActivities(JSON.parse(savedActivities))
      const savedFavorites = localStorage.getItem(`userFavorites_${userId}`)
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites))
      const savedStats = localStorage.getItem(`userStats_${userId}`);
      if (savedStats) {
        setUserStats(JSON.parse(savedStats));
      } else {
        // 如果连本地数据都没有，使用默认数据
        const defaultStats = {
          conversations: 0,
          images: 0,
          documents: 0,
          videos: 0,
          credits: 10000,
          free_conversations_used: 0,
          free_images_used: 0,
          free_documents_used: 0,
          free_videos_used: 0,
          free_conversations_limit: 50,
          free_images_limit: 5,
          free_documents_limit: 50,
          free_videos_limit: 2,
        };
        setUserStats(defaultStats);
        localStorage.setItem(`userStats_${userId}`, JSON.stringify(defaultStats));
      }
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
    console.log('=== UserActivityContext.addActivity 开始 ===');
    console.log('用户信息:', user);
    console.log('活动信息:', activity);
    console.log('当前统计数据:', userStats);
    
    if (!user) {
      console.log('❌ 用户未登录，跳过添加活动');
      return;
    }

    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: getCurrentTimeString(),
    }

    // 立即更新本地状态
    const updatedActivities = [newActivity, ...recentActivities.slice(0, 9)]
    setRecentActivities(updatedActivities)

    // 更新总计数
    const statKey = activity.type === 'conversation' ? 'conversations' : 
                   activity.type === 'image' ? 'images' : 
                   activity.type === 'document' ? 'documents' : 'videos';
    
    // 更新免费额度使用计数
    const freeUsedKey = activity.type === 'conversation' ? 'free_conversations_used' : 
                       activity.type === 'image' ? 'free_images_used' : 
                       activity.type === 'document' ? 'free_documents_used' : 'free_videos_used';
    
    const updatedStats = {
      ...userStats,
      [statKey]: userStats[statKey] + 1,
      [freeUsedKey]: userStats[freeUsedKey] + 1
    }
    console.log('更新后的统计数据:', updatedStats);
    setUserStats(updatedStats)
    saveUserData(updatedStats, updatedActivities, favorites)

    // 使用强制保存方法保存到数据库
    console.log('准备使用强制方法保存活动到数据库...');
    try {
      const result = await forceAddActivity({
        type: activity.type,
        title: activity.title,
        description: activity.description
      });
      if (result) {
        console.log('✅ 活动已通过强制方法保存到数据库');
      } else {
        console.log('❌ 活动强制保存到数据库失败（方法返回false）');
        // 如果强制方法失败，尝试原方法作为备份
        console.log('尝试使用原方法作为备份...');
        const backupResult = await addActivityToDB({
          type: activity.type,
          title: activity.title,
          description: activity.description
        });
        if (backupResult) {
          console.log('✅ 活动通过备份方法保存成功');
        } else {
          console.log('❌ 活动备份方法也失败');
        }
      }
    } catch (error) {
      console.error('❌ 强制保存活动到数据库异常:', error);
    }

    // 使用强制方法同步完整统计数据到数据库
    console.log('准备使用强制方法保存完整统计数据到数据库...');
    try {
      const statsResult = await forceUpdateUserStats(updatedStats);
      if (statsResult) {
        console.log('✅ 完整统计数据已通过强制方法保存到数据库');
      } else {
        console.log('❌ 统计数据强制保存到数据库失败（方法返回false）');
        // 如果强制方法失败，尝试原方法作为备份
        console.log('尝试使用原方法作为备份...');
        const backupResult = await saveCompleteUserStatsToDB(updatedStats);
        if (backupResult) {
          console.log('✅ 统计数据通过备份方法保存成功');
        } else {
          console.log('❌ 统计数据备份方法也失败');
        }
      }
    } catch (error) {
      console.error('❌ 强制保存完整统计数据到数据库异常:', error);
    }
    
    console.log('=== UserActivityContext.addActivity 结束 ===');
  }

  const addFavorite = async (favorite: Omit<Favorite, 'id' | 'timestamp'>) => {
    if (!user) return

    const newFavorite: Favorite = {
      ...favorite,
      id: Date.now().toString(),
      timestamp: getCurrentTimeString(),
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

    // 同步完整统计数据到数据库
    saveCompleteUserStatsToDB(userStats);
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
        timestamp: f.created_at || f.content?.timestamp || getCurrentTimeString()
      }))
      setFavorites(favs)
      localStorage.setItem(`userFavorites_${user.id}`, JSON.stringify(favs))
    } catch (error) {
      console.error('从数据库删除收藏失败:', error)
    }

    // 同步完整统计数据到数据库
    saveCompleteUserStatsToDB(userStats);
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
    
    // 确定对应的免费额度使用字段
    let freeUsedKey: keyof UserStats | null = null;
    if (type === 'conversations') {
      freeUsedKey = 'free_conversations_used';
    } else if (type === 'images') {
      freeUsedKey = 'free_images_used';
    } else if (type === 'documents') {
      freeUsedKey = 'free_documents_used';
    } else if (type === 'videos') {
      freeUsedKey = 'free_videos_used';
    }
    
    // 更新统计数据，同时更新总计数和免费额度使用计数
    const updatedStats = {
      ...userStats,
      [type]: userStats[type] + increment,
      // 如果有对应的免费额度字段，也更新它
      ...(freeUsedKey ? { [freeUsedKey]: userStats[freeUsedKey] + increment } : {})
    }
    
    console.log(`updateStats - 更新 ${type}，增加 ${increment}，同时更新免费额度使用计数`);
    console.log('更新前:', { [type]: userStats[type], ...(freeUsedKey ? { [freeUsedKey]: userStats[freeUsedKey] } : {}) });
    console.log('更新后:', { [type]: updatedStats[type], ...(freeUsedKey ? { [freeUsedKey]: updatedStats[freeUsedKey] } : {}) });
    
    setUserStats(updatedStats)
    saveUserData(updatedStats, recentActivities, favorites)
    
    // 使用强制方法同步完整统计数据到数据库
    console.log('updateStats - 使用强制方法保存统计数据:', updatedStats);
    forceUpdateUserStats(updatedStats).then(result => {
      if (result) {
        console.log('✅ updateStats - 统计数据强制保存成功');
      } else {
        console.log('❌ updateStats - 统计数据强制保存失败，尝试备份方法');
        saveCompleteUserStatsToDB(updatedStats);
      }
    }).catch(error => {
      console.error('❌ updateStats - 强制保存异常，尝试备份方法:', error);
      saveCompleteUserStatsToDB(updatedStats);
    });
  }

  // 检查免费额度是否超出
  const checkFreeQuotaExceeded = (type: 'conversation' | 'image' | 'document' | 'video'): boolean => {
    switch (type) {
      case 'conversation':
        return userStats.free_conversations_used >= userStats.free_conversations_limit;
      case 'image':
        return userStats.free_images_used >= userStats.free_images_limit;
      case 'document':
        return userStats.free_documents_used >= userStats.free_documents_limit;
      case 'video':
        return userStats.free_videos_used >= userStats.free_videos_limit;
      default:
        return false;
    }
  };

  // 获取剩余免费额度
  const getRemainingFreeQuota = (type: 'conversation' | 'image' | 'document' | 'video'): number => {
    switch (type) {
      case 'conversation':
        return Math.max(0, userStats.free_conversations_limit - userStats.free_conversations_used);
      case 'image':
        return Math.max(0, userStats.free_images_limit - userStats.free_images_used);
      case 'document':
        return Math.max(0, userStats.free_documents_limit - userStats.free_documents_used);
      case 'video':
        return Math.max(0, userStats.free_videos_limit - userStats.free_videos_used);
      default:
        return 0;
    }
  };

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
        refreshHistories: loadUserData,
        checkFreeQuotaExceeded,
        getRemainingFreeQuota,
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