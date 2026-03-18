import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Send, User, Clock, Loader2, ShieldCheck, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Property } from '@/types/property';

interface ChatDrawerProps {
  property: Property;
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ property, bookingId, open, onOpenChange }) => {
  const { user } = useAuth();
  const { room, messages, isLoading, sendMessage } = useChat(bookingId);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 100);
    }
  }, [open, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(input);
      setInput('');
      scrollToBottom();
    } catch (err) {
      // Error handled in hook
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[80vh] p-0 rounded-t-[2.5rem] border-none flex flex-col overflow-hidden bg-card/95 backdrop-blur-xl">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-1 opacity-50 shrink-0" />
        
        <SheetHeader className="p-4 sm:p-6 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                {property.postedBy === 'owner' ? 'O' : 'A'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                Property Owner
                <ShieldCheck className="w-4 h-4 text-primary" />
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium truncate">
                <MapPin className="w-3 h-3" />
                {property.title}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth no-scrollbar bg-gradient-to-b from-transparent to-muted/10"
        >
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
              <p className="text-xs font-black uppercase tracking-widest opacity-50">Connecting Securely...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-2">
                <MessageSquare className="w-10 h-10 text-primary/30" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg">Send your first message</h3>
                <p className="text-xs text-muted-foreground font-medium max-w-[200px] mx-auto">
                  Say hi to the owner and discuss your visit details.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.profile.id;
                const showDate = idx === 0 || 
                  new Date(messages[idx-1].created_at).toDateString() !== new Date(msg.created_at).toDateString();

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 bg-muted/20 px-4 py-1.5 rounded-full">
                          {new Date(msg.created_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn(
                        "flex flex-col max-w-[85%] sm:max-w-[75%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all",
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10" 
                          : "bg-secondary text-secondary-foreground rounded-tl-none border border-border/40"
                      )}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 px-1 opacity-40">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="text-[10px] font-bold">{formatTime(msg.created_at)}</span>
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-border/40 bg-card shrink-0 pb-8 sm:pb-10">
          <form onSubmit={handleSend} className="flex gap-3 items-center group">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something about the property..."
                className="h-14 pl-5 pr-12 rounded-2xl bg-secondary/50 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                disabled={isSending || isLoading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full bg-primary animate-pulse",
                  isSending ? "opacity-100" : "opacity-0"
                )} />
              </div>
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSending || isLoading}
              className="h-14 w-14 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-90 bg-primary hover:bg-primary/90 shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

