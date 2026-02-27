import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listChatThreads, getChatMessages, sendMessage } from '@/lib/mockApi';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

export default function Chat() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>('thread1');
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: threads } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: listChatThreads,
  });

  const { data: messages } = useQuery({
    queryKey: ['chat-messages', selectedThreadId],
    queryFn: () => getChatMessages(selectedThreadId!),
    enabled: !!selectedThreadId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendMessage('owner2', content),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage);
  };

  const selectedThread = threads?.find((t) => t.id === selectedThreadId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 flex gap-6 h-[calc(100vh-80px)]">
        {/* Thread List */}
        <div className="w-1/3 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads?.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  'w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left',
                  selectedThreadId === thread.id && 'bg-secondary'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {thread.otherUser.avatarUrl ? (
                    <img src={thread.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {thread.otherUser.name[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate">{thread.otherUser.name}</p>
                    {thread.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {thread.lastMessage.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
          {selectedThread ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                   {selectedThread.otherUser.avatarUrl ? (
                    <img src={selectedThread.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {selectedThread.otherUser.name[0]}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-foreground">{selectedThread.otherUser.name}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.senderId === 'user1' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                        msg.senderId === 'user1'
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-secondary text-secondary-foreground rounded-tl-none'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
