import { useEffect } from 'react';

const StagewiseToolbar: React.FC = () => {
  useEffect(() => {
    // 只在开发环境中初始化 stagewise 工具栏
    if (process.env.NODE_ENV === 'development') {
      import('@stagewise/toolbar').then((stagewise: any) => {
        if (stagewise && stagewise.initToolbar) {
          stagewise.initToolbar({
            plugins: [],
          });
        }
      }).catch((error) => {
        console.log('Stagewise 工具栏初始化失败:', error);
      });
    }
  }, []);

  // 此组件不渲染任何内容
  return null;
};

export default StagewiseToolbar; 