-- =========================================================
-- BANCO DE DADOS: AÇAÍ DAIANE - CARDÁPIO DIGITAL & SISTEMA DE PEDIDOS
-- Compatível com Supabase, Postgres 15+, RLS e Vercel
-- Fuso Horário padrão de referência da loja: America/Recife
-- =========================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONFIGURAÇÕES GERAIS DA LOJA
CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT NOT NULL DEFAULT 'Açaí Daiane',
    logo_url TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    whatsapp_number TEXT NOT NULL DEFAULT '5581999999999',
    address_text TEXT DEFAULT 'Rua Principal, 120 - Centro',
    primary_color TEXT DEFAULT '#4c1d95',
    secondary_color TEXT DEFAULT '#9333ea',
    currency_symbol TEXT DEFAULT 'R$',
    is_manually_closed BOOLEAN DEFAULT FALSE,
    is_manually_opened BOOLEAN DEFAULT FALSE,
    closed_message TEXT DEFAULT 'No momento nossa loja está fechada para novos pedidos. Consulte o cardápio e volte em nossos horários de atendimento!',
    open_message TEXT DEFAULT 'Estamos abertos e recebendo pedidos com muito carinho!',
    accept_pix BOOLEAN DEFAULT TRUE,
    accept_cash BOOLEAN DEFAULT TRUE,
    accept_card_delivery BOOLEAN DEFAULT TRUE,
    accept_card_link BOOLEAN DEFAULT TRUE,
    allow_pickup BOOLEAN DEFAULT TRUE,
    allow_delivery BOOLEAN DEFAULT TRUE,
    default_locale TEXT DEFAULT 'pt-BR',
    season_effect TEXT DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_en TEXT,
    name_es TEXT,
    description TEXT,
    description_en TEXT,
    description_es TEXT,
    image_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GRUPOS DE COMPLEMENTOS / ADICIONAIS REUTILIZÁVEIS
CREATE TABLE IF NOT EXISTS option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_en TEXT,
    name_es TEXT,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    min_options INT DEFAULT 0,
    max_options INT DEFAULT 1,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ITENS/OPÇÕES DENTRO DOS GRUPOS
CREATE TABLE IF NOT EXISTS options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_en TEXT,
    name_es TEXT,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    max_quantity_per_item INT DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    name_es TEXT,
    description TEXT,
    description_en TEXT,
    description_es TEXT,
    image_url TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    promotional_price NUMERIC(10, 2),
    is_promo_active BOOLEAN DEFAULT FALSE,
    promo_start_at TIMESTAMPTZ,
    promo_end_at TIMESTAMPTZ,
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    allow_notes BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    sizes JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar sizes a bancos existentes (idempotente)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT NULL;


-- 6. RELACIONAMENTO PRODUTO X GRUPOS DE ADICIONAIS
CREATE TABLE IF NOT EXISTS product_option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    UNIQUE(product_id, option_group_id)
);

-- 7. BAIRROS E TAXAS DE ENTREGA
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    free_delivery_threshold NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HORÁRIOS DE FUNCIONAMENTO (Fuso America/Recife)
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 1=Segunda, etc.
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FECHAMENTOS ESPECIAIS E FERIADOS
CREATE TABLE IF NOT EXISTS special_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CUPONS DE DESCONTO
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    max_uses INT,
    used_count INT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1001),
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
    neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
    neighborhood_name TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_reference TEXT,
    order_notes TEXT,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'cash', 'card_delivery', 'card_link')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_details JSONB DEFAULT '{}'::jsonb,
    order_status TEXT NOT NULL DEFAULT 'received' CHECK (order_status IN ('received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    coupon_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ITENS DO PEDIDO (HISTÓRICO IMUTÁVEL NO MOMENTO DA COMPRA)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    selected_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    item_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. HISTÓRICO DE MUDANÇA DE ESTADOS DO PEDIDO
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_available ON products(is_available, display_order);
CREATE INDEX IF NOT EXISTS idx_options_group ON options(group_id, is_available);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_active ON neighborhoods(is_active);

-- =========================================================
-- SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- =========================================================
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- 1. Leitura pública para dados do cardápio e funcionamento
DROP POLICY IF EXISTS "Public read store_settings" ON store_settings;
CREATE POLICY "Public read store_settings" ON store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read option_groups" ON option_groups;
CREATE POLICY "Public read option_groups" ON option_groups FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read options" ON options;
CREATE POLICY "Public read options" ON options FOR SELECT USING (is_available = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read product_option_groups" ON product_option_groups;
CREATE POLICY "Public read product_option_groups" ON product_option_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read neighborhoods" ON neighborhoods;
CREATE POLICY "Public read neighborhoods" ON neighborhoods FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read business_hours" ON business_hours;
CREATE POLICY "Public read business_hours" ON business_hours FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read special_closures" ON special_closures;
CREATE POLICY "Public read special_closures" ON special_closures FOR SELECT USING (true);

-- 2. Cupons: Apenas admins autenticados podem ver todos os cupons. Verificação de código feita no backend
DROP POLICY IF EXISTS "Admin full coupons" ON coupons;
CREATE POLICY "Admin full coupons" ON coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Pedidos: Apenas admins podem ler todos os pedidos. Clientes criam através de endpoint server validado
DROP POLICY IF EXISTS "Admin full orders" ON orders;
CREATE POLICY "Admin full orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full order_items" ON order_items;
CREATE POLICY "Admin full order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full order_status_history" ON order_status_history;
CREATE POLICY "Admin full order_status_history" ON order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Modificações em catálogo e configurações restritas a usuários autenticados (admin)
DROP POLICY IF EXISTS "Admin full store_settings" ON store_settings;
CREATE POLICY "Admin full store_settings" ON store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full categories" ON categories;
CREATE POLICY "Admin full categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full option_groups" ON option_groups;
CREATE POLICY "Admin full option_groups" ON option_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full options" ON options;
CREATE POLICY "Admin full options" ON options FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full products" ON products;
CREATE POLICY "Admin full products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full product_option_groups" ON product_option_groups;
CREATE POLICY "Admin full product_option_groups" ON product_option_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full neighborhoods" ON neighborhoods;
CREATE POLICY "Admin full neighborhoods" ON neighborhoods FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full business_hours" ON business_hours;
CREATE POLICY "Admin full business_hours" ON business_hours FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin full special_closures" ON special_closures;
CREATE POLICY "Admin full special_closures" ON special_closures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Bucket de imagens dos produtos no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket product-images
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin update product images" ON storage.objects;
CREATE POLICY "Admin update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
