// 页面状态管理工具
interface PageState {
  [key: string]: any;
}

interface GlobalPageState {
  chat: PageState;
  draw: PageState;
  read: PageState;
}

class PageStateManager {
  private state: GlobalPageState = {
    chat: {},
    draw: {},
    read: {}
  };

  private storageKey = 'page_states';

  constructor() {
    this.loadFromStorage();
  }

  // 从 sessionStorage 加载状态
  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const savedState = sessionStorage.getItem(this.storageKey);
        if (savedState) {
          this.state = JSON.parse(savedState);
          console.log('从 sessionStorage 加载页面状态:', this.state);
        }
      } catch (error) {
        console.error('加载页面状态失败:', error);
      }
    }
  }

  // 保存状态到 sessionStorage
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify(this.state));
      } catch (error) {
        console.error('保存页面状态失败:', error);
      }
    }
  }

  // 保存页面状态
  savePageState(page: keyof GlobalPageState, state: PageState) {
    this.state[page] = { ...state };
    this.saveToStorage();
    console.log(`保存${page}页面状态:`, state);
  }

  // 获取页面状态
  getPageState(page: keyof GlobalPageState): PageState {
    return this.state[page] || {};
  }

  // 清除页面状态
  clearPageState(page: keyof GlobalPageState) {
    this.state[page] = {};
    this.saveToStorage();
    console.log(`清除${page}页面状态`);
  }

  // 检查页面是否有状态
  hasPageState(page: keyof GlobalPageState): boolean {
    const pageState = this.state[page];
    return pageState && Object.keys(pageState).length > 0;
  }

  // 清除所有状态
  clearAllStates() {
    this.state = {
      chat: {},
      draw: {},
      read: {}
    };
    this.saveToStorage();
    console.log('清除所有页面状态');
  }
}

// 创建全局实例
export const pageStateManager = new PageStateManager();

// 导出类型
export type { PageState, GlobalPageState }; 