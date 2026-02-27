export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatThread {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  lastMessage: ChatMessage;
  unreadCount: number;
}
