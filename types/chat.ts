export interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
  avatar?: string;
  modelName?: string;
  metadata?: {
    style?: string;
    size?: string;
    mode?: string;
    actualSize?: string;
    prompt?: string;
    motionStrength?: number;
    [key: string]: any;
  };
}

export type ChatMode = 'default' | 'write' | 'translate' | 'travel' | 'script' | 'video';

export type HistoryType = 'chat' | 'draw' | 'read' | 'video';

export interface ChatHistory {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  timestamp: number;
  type: HistoryType;
}

export interface ChatState {
  currentMessages: Message[];
  histories: ChatHistory[];
  selectedModel: string;
} 