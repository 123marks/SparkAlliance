-- =============================================
-- 星火购物模块 — 校园二手交易平台
-- 9表 + RLS + 触发器 + 种子分类数据
-- =============================================

-- ====== 1. shop_categories — 商品分类（多级） ======
CREATE TABLE IF NOT EXISTS shop_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  parent_id INT REFERENCES shop_categories(id),
  icon VARCHAR(10) DEFAULT '📦',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 种子分类数据
INSERT INTO shop_categories (name, icon, sort_order) VALUES
  ('教材书籍', '📚', 1),
  ('电子产品', '📱', 2),
  ('生活用品', '🛒', 3),
  ('学习用品', '✏️', 4),
  ('服饰鞋包', '👕', 5),
  ('运动健身', '🏀', 6),
  ('美妆护肤', '💄', 7),
  ('其他', '🎁', 8)
ON CONFLICT DO NOTHING;

-- 二级分类
INSERT INTO shop_categories (name, parent_id, sort_order) VALUES
  ('教材', 1, 1), ('课外书', 1, 2), ('考研资料', 1, 3), ('考证资料', 1, 4),
  ('手机', 2, 1), ('电脑', 2, 2), ('平板', 2, 3), ('耳机', 2, 4), ('配件', 2, 5),
  ('日用品', 3, 1), ('寝室用品', 3, 2), ('厨房用品', 3, 3),
  ('文具', 4, 1), ('笔记本', 4, 2), ('打印资料', 4, 3)
ON CONFLICT DO NOTHING;


-- ====== 2. shop_products — 商品 ======
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id INT REFERENCES shop_categories(id),
  condition VARCHAR(20) NOT NULL DEFAULT 'good'
    CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),          -- 原价（展示折扣力度）
  images TEXT[] NOT NULL DEFAULT '{}',     -- 图片URL数组
  video_url TEXT,                           -- 视频URL
  trade_method VARCHAR(50) NOT NULL DEFAULT '校内面交'
    CHECK (trade_method IN ('校内面交', '宿舍楼交易', '约定地点', '均可')),
  trade_location VARCHAR(200),             -- 具体交易地点
  is_negotiable BOOLEAN DEFAULT TRUE,      -- 是否可议价
  tags TEXT[] DEFAULT '{}',                -- 标签（急出/包邮/可小刀等）
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'sold', 'offline', 'deleted')),
  view_count INT DEFAULT 0,
  want_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sp_seller ON shop_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_sp_category ON shop_products(category_id);
CREATE INDEX IF NOT EXISTS idx_sp_status ON shop_products(status);
CREATE INDEX IF NOT EXISTS idx_sp_created ON shop_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_price ON shop_products(price);
CREATE INDEX IF NOT EXISTS idx_sp_title_search ON shop_products USING gin(to_tsvector('simple', title));

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sp_sel ON shop_products;
DROP POLICY IF EXISTS sp_ins ON shop_products;
DROP POLICY IF EXISTS sp_upd ON shop_products;
DROP POLICY IF EXISTS sp_del ON shop_products;
-- 所有人可见 active 和 sold 商品，卖家可见自己的所有商品
CREATE POLICY sp_sel ON shop_products FOR SELECT USING (
  status IN ('active', 'sold') OR seller_id = auth.uid()
);
CREATE POLICY sp_ins ON shop_products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY sp_upd ON shop_products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY sp_del ON shop_products FOR DELETE USING (auth.uid() = seller_id);


-- ====== 3. shop_favorites — 收藏/想要 ======
CREATE TABLE IF NOT EXISTS shop_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sf_user ON shop_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_product ON shop_favorites(product_id);

ALTER TABLE shop_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sf_sel ON shop_favorites;
DROP POLICY IF EXISTS sf_ins ON shop_favorites;
DROP POLICY IF EXISTS sf_del ON shop_favorites;
CREATE POLICY sf_sel ON shop_favorites FOR SELECT USING (true);
CREATE POLICY sf_ins ON shop_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sf_del ON shop_favorites FOR DELETE USING (auth.uid() = user_id);


-- ====== 4. shop_conversations — 聊天会话 ======
CREATE TABLE IF NOT EXISTS shop_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_unread INT DEFAULT 0,
  seller_unread INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, buyer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_sc_buyer ON shop_conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_seller ON shop_conversations(seller_id, last_message_at DESC);

ALTER TABLE shop_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sc_sel ON shop_conversations;
DROP POLICY IF EXISTS sc_ins ON shop_conversations;
DROP POLICY IF EXISTS sc_upd ON shop_conversations;
CREATE POLICY sc_sel ON shop_conversations FOR SELECT USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);
CREATE POLICY sc_ins ON shop_conversations FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY sc_upd ON shop_conversations FOR UPDATE USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);


-- ====== 5. shop_messages — 聊天消息 ======
CREATE TABLE IF NOT EXISTS shop_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES shop_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'product', 'system', 'quick_reply')),
  product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,  -- 商品卡片消息
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sm_conv ON shop_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sm_sender ON shop_messages(sender_id);

ALTER TABLE shop_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sm_sel ON shop_messages;
DROP POLICY IF EXISTS sm_ins ON shop_messages;
DROP POLICY IF EXISTS sm_upd ON shop_messages;
CREATE POLICY sm_sel ON shop_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM shop_conversations c WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);
CREATE POLICY sm_ins ON shop_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY sm_upd ON shop_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM shop_conversations c WHERE c.id = conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
);


-- ====== 6. shop_transactions — 交易订单 ======
CREATE TABLE IF NOT EXISTS shop_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  agreed_price DECIMAL(10, 2),
  trade_time TIMESTAMPTZ,
  trade_location VARCHAR(200),
  buyer_confirmed BOOLEAN DEFAULT FALSE,
  seller_confirmed BOOLEAN DEFAULT FALSE,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_st_buyer ON shop_transactions(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_seller ON shop_transactions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_product ON shop_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_st_status ON shop_transactions(status);

ALTER TABLE shop_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS st_sel ON shop_transactions;
DROP POLICY IF EXISTS st_ins ON shop_transactions;
DROP POLICY IF EXISTS st_upd ON shop_transactions;
CREATE POLICY st_sel ON shop_transactions FOR SELECT USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);
CREATE POLICY st_ins ON shop_transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY st_upd ON shop_transactions FOR UPDATE USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);


-- ====== 7. shop_reviews — 交易评价 ======
CREATE TABLE IF NOT EXISTS shop_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES shop_transactions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  description_match INT CHECK (description_match >= 1 AND description_match <= 5),
  attitude INT CHECK (attitude >= 1 AND attitude <= 5),
  content TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_sr_reviewee ON shop_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_sr_reviewer ON shop_reviews(reviewer_id);

ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sr_sel ON shop_reviews;
DROP POLICY IF EXISTS sr_ins ON shop_reviews;
CREATE POLICY sr_sel ON shop_reviews FOR SELECT USING (true);
CREATE POLICY sr_ins ON shop_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);


-- ====== 8. shop_reports — 举报 ======
CREATE TABLE IF NOT EXISTS shop_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('product', 'user', 'message')),
  target_id UUID NOT NULL,          -- 商品/用户/消息ID
  reason VARCHAR(50) NOT NULL,      -- 虚假信息/欺诈/违禁品/骚扰/其他
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shop_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS srp_sel ON shop_reports;
DROP POLICY IF EXISTS srp_ins ON shop_reports;
CREATE POLICY srp_sel ON shop_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY srp_ins ON shop_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);


-- ====== 9. shop_search_history — 搜索历史 ======
CREATE TABLE IF NOT EXISTS shop_search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ssh_user ON shop_search_history(user_id, created_at DESC);

ALTER TABLE shop_search_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ssh_sel ON shop_search_history;
DROP POLICY IF EXISTS ssh_ins ON shop_search_history;
DROP POLICY IF EXISTS ssh_del ON shop_search_history;
CREATE POLICY ssh_sel ON shop_search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ssh_ins ON shop_search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ssh_del ON shop_search_history FOR DELETE USING (auth.uid() = user_id);


-- ====== 触发器 ======

-- 收藏计数自动更新
CREATE OR REPLACE FUNCTION shop_update_want_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shop_products SET want_count = want_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shop_products SET want_count = GREATEST(want_count - 1, 0) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_shop_want_count ON shop_favorites;
CREATE TRIGGER trg_shop_want_count
  AFTER INSERT OR DELETE ON shop_favorites
  FOR EACH ROW EXECUTE FUNCTION shop_update_want_count();

-- 交易完成自动更新商品状态为 sold
CREATE OR REPLACE FUNCTION shop_auto_sold()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE shop_products SET status = 'sold', sold_at = NOW() WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_shop_auto_sold ON shop_transactions;
CREATE TRIGGER trg_shop_auto_sold
  AFTER UPDATE ON shop_transactions
  FOR EACH ROW EXECUTE FUNCTION shop_auto_sold();

-- 发消息时自动更新会话最后消息和未读数
CREATE OR REPLACE FUNCTION shop_update_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv RECORD;
BEGIN
  SELECT * INTO conv FROM shop_conversations WHERE id = NEW.conversation_id;
  IF conv IS NOT NULL THEN
    IF NEW.sender_id = conv.buyer_id THEN
      UPDATE shop_conversations SET
        last_message = LEFT(NEW.content, 100),
        last_message_at = NEW.created_at,
        seller_unread = seller_unread + 1
      WHERE id = NEW.conversation_id;
    ELSE
      UPDATE shop_conversations SET
        last_message = LEFT(NEW.content, 100),
        last_message_at = NEW.created_at,
        buyer_unread = buyer_unread + 1
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_shop_conv_update ON shop_messages;
CREATE TRIGGER trg_shop_conv_update
  AFTER INSERT ON shop_messages
  FOR EACH ROW EXECUTE FUNCTION shop_update_conversation();

-- ====== 10. shop_product_comments — 商品评论（任何人可评） ======
CREATE TABLE IF NOT EXISTS shop_product_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spc_product ON shop_product_comments(product_id, created_at DESC);

ALTER TABLE shop_product_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS spc_sel ON shop_product_comments;
DROP POLICY IF EXISTS spc_ins ON shop_product_comments;
CREATE POLICY spc_sel ON shop_product_comments FOR SELECT USING (true);
CREATE POLICY spc_ins ON shop_product_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 更新交易状态枚举（增加 accepted/meeting）
ALTER TABLE shop_transactions DROP CONSTRAINT IF EXISTS shop_transactions_status_check;
ALTER TABLE shop_transactions ADD CONSTRAINT shop_transactions_status_check
  CHECK (status IN ('pending', 'accepted', 'meeting', 'completed', 'cancelled'));

-- 更新商品状态枚举（增加 pending_review）
ALTER TABLE shop_products DROP CONSTRAINT IF EXISTS shop_products_status_check;
ALTER TABLE shop_products ADD CONSTRAINT shop_products_status_check
  CHECK (status IN ('draft', 'pending_review', 'active', 'sold', 'offline', 'deleted'));

-- 更新消息类型枚举（增加 offer/offer_response）
ALTER TABLE shop_messages DROP CONSTRAINT IF EXISTS shop_messages_message_type_check;
ALTER TABLE shop_messages ADD CONSTRAINT shop_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'product', 'system', 'quick_reply', 'offer', 'offer_response'));

-- 评价增加标签列（物美价廉/发货快等快选标签）
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =============================================
-- 完成！请在 Supabase SQL Editor 中执行
-- =============================================
