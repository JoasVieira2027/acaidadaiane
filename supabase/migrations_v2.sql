-- =========================================================
-- MIGRACAO V2: Acai Daiane - Gestao Financeira, Custos e Promocoes por Tamanho
-- Execute este script no Supabase SQL Editor (idempotente - seguro repetir)
-- =========================================================

-- 1. Promocao por tamanho: percentual de desconto aplicado sobre cada tamanho individualmente
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_percent NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_applies_to_sizes BOOLEAN DEFAULT FALSE;

-- 2. Custo dos produtos: configuracao para calculo de preco ideal (nao afeta pedidos)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_config JSONB DEFAULT NULL;

-- 3. Indices para consultas financeiras por data e status
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 4. Tabela de Despesas Operacionais (Gestão Financeira)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- Habilita RLS para despesas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Política de leitura/escrita para admin/anon (mesmo padrão do sistema existente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_all_policy'
  ) THEN
    CREATE POLICY expenses_all_policy ON expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
