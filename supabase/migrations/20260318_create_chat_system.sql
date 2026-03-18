-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.visit_bookings(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(booking_id) -- One chat room per booking
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
DROP POLICY IF EXISTS "Participants can view their rooms" ON public.chat_rooms;
CREATE POLICY "Participants can view their rooms" ON public.chat_rooms
    FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Participants can insert their rooms" ON public.chat_rooms;
CREATE POLICY "Participants can insert their rooms" ON public.chat_rooms
    FOR INSERT WITH CHECK (auth.uid() = tenant_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Participants can update their rooms" ON public.chat_rooms;
CREATE POLICY "Participants can update their rooms" ON public.chat_rooms
    FOR UPDATE USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Room participants can view messages" ON public.chat_messages;
CREATE POLICY "Room participants can view messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = chat_messages.room_id
            AND (tenant_id = auth.uid() OR owner_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Room participants can insert messages" ON public.chat_messages;
CREATE POLICY "Room participants can insert messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE id = chat_messages.room_id
            AND (tenant_id = auth.uid() OR owner_id = auth.uid())
        )
        AND sender_id = auth.uid()
    );

-- Create function to update last_message in room
CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_rooms
    SET 
        last_message_text = LEFT(NEW.content, 100),
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
CREATE TRIGGER on_new_chat_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_message();

-- Enable Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
