-- =======================================================================
-- SQL SCHEMA & RLS POLICIES CHO CHỨC NĂNG CHAT & KÈO THÁCH ĐẤU CÁ NHÂN
-- Hướng dẫn: Copy toàn bộ nội dung file này và paste vào SQL Editor 
-- trên Supabase Dashboard của bạn, sau đó nhấn Run.
-- =======================================================================

-- 1. TẠO BẢNG FRIENDSHIPS (Quan hệ bạn bè)
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_friend UNIQUE (user_id, friend_id)
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Tạo RLS Policies cho friendships
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can respond to friend requests"
ON public.friendships FOR UPDATE
USING (auth.uid() = friend_id)
WITH CHECK (auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- 2. TẠO BẢNG PRIVATE_MESSAGES (Tin nhắn chat riêng tư)
CREATE TABLE IF NOT EXISTS public.private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Tạo RLS Policies cho private_messages
CREATE POLICY "Users can view their own messages"
ON public.private_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.private_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);


-- 3. TẠO BẢNG CUSTOM_BETS (Kèo thách đấu cá nhân tự tạo)
CREATE TABLE IF NOT EXISTS public.custom_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id INT REFERENCES public.matches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    points_wager INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'finished_creator_won', 'finished_challenger_won', 'finished_draw')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS
ALTER TABLE public.custom_bets ENABLE ROW LEVEL SECURITY;

-- Tạo RLS Policies cho custom_bets
CREATE POLICY "Users can view custom bets related to them"
ON public.custom_bets FOR SELECT
USING (auth.uid() = creator_id OR auth.uid() = challenger_id);

CREATE POLICY "Users can create custom bets"
ON public.custom_bets FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Cả 2 bên đều có quyền cập nhật trạng thái kèo (Ví dụ: challenger accept/reject, hoặc cả hai cùng xác nhận kết quả)
CREATE POLICY "Users can update their custom bets"
ON public.custom_bets FOR UPDATE
USING (auth.uid() = creator_id OR auth.uid() = challenger_id)
WITH CHECK (auth.uid() = creator_id OR auth.uid() = challenger_id);


-- =======================================================================
-- KÍNH HOẠT REALTIME CHO CHAT VÀ KÈO THÁCH ĐẤU
-- =======================================================================
-- Thêm các bảng vào publication supabase_realtime để client có thể lắng nghe thay đổi
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_bets;
