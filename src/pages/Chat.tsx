import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, MapPin, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatDrawer } from '@/components/property/ChatDrawer';
import { Property } from '@/types/property';

interface ChatRoomExtended {
  id: string;
  property_id: string;
  booking_id: string;
  tenant_id: string;
  owner_id: string;
  last_message_text?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  properties: {
    title: string;
    city: string;
    images: string[];
    postedBy: string;
  };
}

export default function Chat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomExtended | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          properties:property_id (
            title,
            city,
            images,
            owner_id
          )
        `)
        .or(`tenant_id.eq.${user.profile.id},owner_id.eq.${user.profile.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRooms(data as any[]);
    } catch (err) {
      console.error('Failed to fetch chat rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRooms();

    // Subscribe to room updates
    if (user) {
      const channel = supabase
        .channel('chat-rooms-inbox')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_rooms',
            filter: `tenant_id=eq.${user.profile.id}`,
          },
          () => fetchRooms()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_rooms',
            filter: `owner_id=eq.${user.profile.id}`,
          },
          () => fetchRooms()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchRooms]);

  const handleOpenChat = (room: ChatRoomExtended) => {
    setSelectedRoom(room);
    setIsChatOpen(true);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col gap-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              Messages
            </h1>
            <p className="text-muted-foreground font-medium">Manage your conversations with owners and tenants.</p>
          </header>

          <div className="bg-card/50 backdrop-blur-xl rounded-[2rem] border border-border/40 min-h-[60vh] overflow-hidden flex flex-col shadow-2xl">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50">Synchronizing Inbox...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-24 h-24 rounded-[2.5rem] bg-secondary/50 flex items-center justify-center rotate-3 shadow-inner">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 -rotate-3" />
                </div>
                <div className="space-y-2 max-w-xs">
                  <h3 className="text-xl font-black tracking-tight">Your inbox is empty</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    Book a property visit to start chatting directly with owners. 
                  </p>
                </div>
                <Button variant="outline" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-8" asChild>
                  <a href="/properties">Explore Properties</a>
                </Button>
              </div>
            ) : (
              <div className="flex-1 divide-y divide-border/20">
                <AnimatePresence>
                  {rooms.map((room, idx) => (
                    <motion.button
                      key={room.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleOpenChat(room)}
                      className="w-full p-5 sm:p-6 flex items-center gap-4 sm:gap-6 hover:bg-secondary/30 transition-all text-left group"
                    >
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] overflow-hidden bg-muted shadow-lg group-hover:scale-105 transition-transform">
                          <img 
                            src={room.properties.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
                            alt={room.properties.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary border-4 border-card flex items-center justify-center shadow-lg">
                          <MessageSquare className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-black text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors pr-2">
                            {room.properties.title}
                          </h3>
                          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground whitespace-nowrap shrink-0 opacity-70">
                            {formatTime(room.last_message_at || room.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                          <MapPin className="w-3 h-3 text-primary/60" />
                          <span className="text-[10px] font-bold uppercase tracking-wider truncate opacity-80">
                            {room.properties.city}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground/60 font-medium truncate italic">
                          {room.last_message_text || "No messages yet. Say hi!"}
                        </p>
                      </div>

                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedRoom && (
        <ChatDrawer
          property={{ 
            id: selectedRoom.property_id, 
            title: selectedRoom.properties.title,
            ownerId: selectedRoom.owner_id,
            postedBy: 'owner'
          } as any}
          bookingId={selectedRoom.booking_id}
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
        />
      )}

      <Footer />
    </div>
  );
}
