import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

export interface ChatRoom {
  id: string;
  property_id: string;
  booking_id: string;
  tenant_id: string;
  owner_id: string;
  last_message_text?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export function useChat(bookingId?: string) {
  const { user } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize or fetch room
  const fetchRoom = useCallback(async () => {
    if (!bookingId || !user) return;
    setIsLoading(true);
    
    try {
      // 1. Try to find existing room for this booking
      const { data: existingRoom, error: fetchError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingRoom) {
        setRoom(existingRoom);
        fetchMessages(existingRoom.id);
      } else {
        // 2. Room doesn't exist, create it if booking is valid
        const { data: booking, error: bookingError } = await supabase
          .from('visit_bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (bookingError) throw bookingError;

        const { data: newRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            booking_id: bookingId,
            property_id: booking.property_id,
            tenant_id: booking.tenant_id,
            owner_id: booking.owner_id
          })
          .select()
          .single();

        if (createError) throw createError;
        setRoom(newRoom);
      }
    } catch (err) {
      console.error('Chat initialization failed:', err);
      toast.error('Failed to initialize chat');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, user]);

  const fetchMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch messages:', error);
      return;
    }
    setMessages(data || []);
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const sendMessage = async (content: string) => {
    if (!room || !user || !content.trim()) return;

    const { error } = await supabase.from('chat_messages').insert({
      room_id: room.id,
      sender_id: user.profile.id,
      content: content.trim(),
    });

    if (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  return {
    room,
    messages,
    isLoading,
    sendMessage,
    refreshChat: fetchRoom
  };
}
