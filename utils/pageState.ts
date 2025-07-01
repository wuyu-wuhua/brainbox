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

  // 保存页面状态
  savePageState(page: keyof GlobalPageState, state: PageState) {
    this.state[page] = { ...state };
    console.log(`保存${page}页面状态:`, state);
  }

  // 获取页面状态
  getPageState(page: keyof GlobalPageState): PageState {
    return this.state[page] || {};
  }

  // 清除页面状态
  clearPageState(page: keyof GlobalPageState) {
    this.state[page] = {};
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
    console.log('清除所有页面状态');
  }
}

// 创建全局实例
export const pageStateManager = new PageStateManager();

// 导出类型
export type { PageState, GlobalPageState }; 