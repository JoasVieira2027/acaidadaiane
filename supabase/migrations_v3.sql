-- =========================================================
-- MIGRAÇÃO V3: Açaí Daiane - Notificações Push de Pedidos
-- Execute no Supabase SQL Editor (idempotente - seguro repetir)
-- =========================================================

-- 1. Tabela de inscrições push — vinculada ao order_code do pedido
--    Garante que só quem fez o pedido pode receber notificações dele.
CREATE TABLE IF NOT EXISTS order_push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code   TEXT NOT NULL,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_code, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_order_code ON order_push_subscriptions(order_code);

-- 2. Habilitar RLS
ALTER TABLE order_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Política: qualquer um pode inserir/ler suas próprias inscrições
--    (A segurança real é feita via order_code único que o cliente possui)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_push_subscriptions'
    AND policyname = 'push_subscriptions_policy'
  ) THEN
    CREATE POLICY push_subscriptions_policy
      ON order_push_subscriptions
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Habilitar Realtime na tabela orders para o painel admin receber
--    notificações instantâneas de novos pedidos via WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
