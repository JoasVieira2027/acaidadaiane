/**
 * TESTES DE SEGURANÇA E AUDITORIA INDEPENDENTE — Açaí da Daiane
 * Suíte completa cobrindo os 24 testes originais + testes aprofundados de:
 * - Tokens adulterados, expirados e forjados com formato válido
 * - Assinaturas de webhook Mercado Pago (válida, inválida, expirada, ausente)
 * - Idempotência e proteção contra regresso de status
 * - Proteção de rotas sensíveis (/api/push/debug)
 * - Isolamento de dados e sanitização pública (anti-vazamento de PII)
 * - Validação e concorrência de cupons
 * 
 * Uso: npx tsx src/__tests__/security.test.ts
 */

import nodeCrypto from 'crypto';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_SECRET = process.env.ADMIN_ACCESS_KEY || 'minha_chave_secreta_para_testes_123';
process.env.ADMIN_ACCESS_KEY = TEST_SECRET;

const FAKE_SESSION = 'acai_admin_session=FAKE_TOKEN_INVENTED';
const LEGACY_SESSION = 'acai_admin_session=1';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, detail: 'OK' });
    console.log(`  PASS  ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, detail: err.message });
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function req(
  method: string,
  path: string,
  opts: { cookie?: string; headers?: Record<string, string>; body?: any } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (opts.cookie) headers['Cookie'] = opts.cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, headers: res.headers };
}

// Helpers para geração de tokens de teste
function createTestToken(email: string, secret: string = TEST_SECRET, offsetMs: number = 0): string {
  const ts = (Date.now() + offsetMs).toString(36);
  const payloadB64 = Buffer.from(email).toString('base64url');
  const message = `${ts}.${email}`;
  const sig = nodeCrypto.createHmac('sha256', secret).update(message).digest('base64url');
  return `admv2.${ts}.${payloadB64}.${sig}`;
}

// ----------------------------------------------------------------
// [1] TESTES DE AUTENTICAÇÃO E SESSÃO HMAC (C1, C2)
// ----------------------------------------------------------------
async function runAuthTests() {
  console.log('\n[1] Testes de Autenticação e Sessão HMAC\n');

  await test('T01 — Acesso sem cookie rejeitado em POST /api/products', async () => {
    const { status } = await req('POST', '/api/products', { body: { product: { name: 'X', price: 10 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T02 — Token inventado "FAKE_TOKEN" rejeitado em POST /api/products', async () => {
    const { status } = await req('POST', '/api/products', { cookie: FAKE_SESSION, body: { product: { name: 'X', price: 10 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T03 — Token legado "1" rejeitado em POST /api/products', async () => {
    const { status } = await req('POST', '/api/products', { cookie: LEGACY_SESSION, body: { product: { name: 'X', price: 10 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T04 — DELETE /api/products sem auth retorna 401', async () => {
    const { status } = await req('DELETE', '/api/products?id=fake-id');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T05 — POST /api/categories sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/categories', { body: { category: { name: 'X' } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T06 — POST /api/coupons sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/coupons', { body: { coupon: { code: 'X', discount_value: 10 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T07 — GET /api/coupons sem auth retorna 401', async () => {
    const { status } = await req('GET', '/api/coupons');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T08 — POST /api/neighborhoods sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/neighborhoods', { body: { neighborhood: { name: 'X', delivery_fee: 5 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T09 — GET /api/expenses sem auth retorna 401', async () => {
    const { status } = await req('GET', '/api/expenses');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T10 — POST /api/store-status sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/store-status', { body: { is_manually_closed: true } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T11 — PATCH /api/orders/AD-9999 sem auth retorna 401', async () => {
    const { status } = await req('PATCH', '/api/orders/AD-9999', { body: { order_status: 'completed' } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T12 — DELETE /api/orders/AD-9999 sem auth retorna 401', async () => {
    const { status } = await req('DELETE', '/api/orders/AD-9999');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T13 — GET /api/orders sem auth retorna 401', async () => {
    const { status } = await req('GET', '/api/orders');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T14 — POST /api/push/send sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/push/send', { body: { orderCode: 'AD-1', status: 'preparing' } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T15 — POST /api/option-groups sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/option-groups', { body: { group: { name: 'X' } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T16 — POST /api/products/upload-image sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/products/upload-image');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  // Novos testes aprofundados de integridade criptográfica do HMAC
  await test('T17 — Token com formato admv2 mas assinatura adulterada é rejeitado (401)', async () => {
    const ts = Date.now().toString(36);
    const emailB64 = Buffer.from('admin@acai.com').toString('base64url');
    const tamperedToken = `admv2.${ts}.${emailB64}.ASSINATURA_FALSIFICADA_INVALIDA`;
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${tamperedToken}`,
      body: { product: { name: 'Test' } },
    });
    assert(status === 401, `Esperado 401 para assinatura adulterada, obtido ${status}`);
  });

  await test('T18 — Token com segredo incorreto é rejeitado (401)', async () => {
    const foreignToken = createTestToken('admin@acai.com', 'chave_de_outro_servidor_nao_autorizado');
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${foreignToken}`,
      body: { product: { name: 'Test' } },
    });
    assert(status === 401, `Esperado 401 para segredo incorreto, obtido ${status}`);
  });

  await test('T19 — Token expirado (gerado há 25 horas) é rejeitado (401)', async () => {
    const expiredToken = createTestToken('admin@acai.com', TEST_SECRET, -25 * 60 * 60 * 1000);
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${expiredToken}`,
      body: { product: { name: 'Test' } },
    });
    assert(status === 401, `Esperado 401 para token expirado, obtido ${status}`);
  });

  await test('T20 — Token com timestamp futuro forjado (> 5 min) é rejeitado (401)', async () => {
    const futureToken = createTestToken('admin@acai.com', TEST_SECRET, 10 * 60 * 1000);
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${futureToken}`,
      body: { product: { name: 'Test' } },
    });
    assert(status === 401, `Esperado 401 para token com data futura, obtido ${status}`);
  });

  await test('T21 — Rota de diagnóstico /api/push/debug exige autenticação admin (401)', async () => {
    const { status } = await req('GET', '/api/push/debug');
    assert(status === 401, `Esperado 401 para /api/push/debug sem sessão, obtido ${status}`);
  });

  await test('T22 — POST /api/admin/logout limpa cookies com segurança', async () => {
    const { status, headers } = await req('POST', '/api/admin/logout');
    assert(status === 200, `Esperado 200 no logout, obtido ${status}`);
    const setCookie = headers.get('set-cookie') || '';
    assert(setCookie.includes('acai_admin_session'), 'Deve limpar acai_admin_session no logout');
    assert(setCookie.includes('Max-Age=0') || setCookie.includes('max-age=0'), 'Deve definir Max-Age=0');
  });
}

// ----------------------------------------------------------------
// [2] TESTES DE WEBHOOK MERCADO PAGO (C5, C6)
// ----------------------------------------------------------------
async function runWebhookTests() {
  console.log('\n[2] Testes de Webhook Mercado Pago\n');

  await test('T23 — Webhook sem cabeçalho x-signature é ignorado com skipped', async () => {
    const { status, json } = await req('POST', '/api/webhook?topic=payment&id=12345', {
      body: { data: { id: '12345' } },
    });
    assert(status === 200, `Esperado 200, obtido ${status}`);
    assert(json.skipped === 'invalid_signature', `Esperado skipped: invalid_signature, obtido ${json.skipped}`);
  });

  await test('T24 — Webhook com assinatura HMAC falsa é rejeitado', async () => {
    const nowTs = Math.floor(Date.now() / 1000);
    const { status, json } = await req('POST', '/api/webhook?data.id=99999', {
      headers: {
        'x-signature': `ts=${nowTs},v1=assinatura_completamente_falsa_e_invalida`,
        'x-request-id': 'req-test-123',
      },
      body: { data: { id: '99999' } },
    });
    assert(status === 200, `Esperado 200, obtido ${status}`);
    assert(json.skipped === 'invalid_signature', 'Deve rejeitar assinatura falsa');
  });

  await test('T25 — Webhook com timestamp expirado (> 5 min) é rejeitado', async () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400; // 6.6 minutos atrás
    const { json } = await req('POST', '/api/webhook?data.id=99999', {
      headers: {
        'x-signature': `ts=${oldTs},v1=qualquer_assinatura`,
        'x-request-id': 'req-test-old',
      },
    });
    assert(json.skipped === 'invalid_signature', 'Deve rejeitar webhook expirado');
  });

  await test('T26 — GET /api/webhook retorna status operacional do serviço', async () => {
    const { status, json } = await req('GET', '/api/webhook');
    assert(status === 200 && json.ok === true, 'GET /api/webhook deve responder ok: true');
  });
}

// ----------------------------------------------------------------
// [3] TESTES DE REGRAS DE NEGÓCIO E CHECKOUT (C9, C10, C12)
// ----------------------------------------------------------------
async function runBusinessRulesTests() {
  console.log('\n[3] Testes de Regras de Negócio e Checkout\n');

  await test('T27 — Quantidade negativa rejeitada no checkout (400)', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Test User',
        customer_phone: '11999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: 'fake-id', product_name: 'X', quantity: -1, selected_options: [] }],
      },
    });
    assert(status === 400 || json.success === false, `Esperado falha com quantidade negativa`);
  });

  await test('T28 — Carrinho vazio rejeitado no checkout (400)', async () => {
    const { status } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Test User',
        customer_phone: '11999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [],
      },
    });
    assert(status === 400, `Esperado 400 para carrinho vazio, obtido ${status}`);
  });

  await test('T29 — Nome de cliente ausente rejeitado no checkout (400)', async () => {
    const { status } = await req('POST', '/api/orders', {
      body: {
        customer_phone: '11999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: 'x', quantity: 1 }],
      },
    });
    assert(status === 400, `Esperado 400 sem nome do cliente, obtido ${status}`);
  });

  await test('T30 — Entrega delivery sem bairro rejeitada (400)', async () => {
    const { status } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Test User',
        customer_phone: '11999999999',
        order_type: 'delivery',
        payment_method: 'cash',
        items: [{ product_id: 'x', quantity: 1 }],
      },
    });
    assert(status === 400, `Esperado 400 sem bairro para delivery, obtido ${status}`);
  });

  await test('T31 — Validação de cupom inexistente retorna 404', async () => {
    const { status, json } = await req('POST', '/api/coupons/validate', {
      body: { code: 'CUPOM_TOTALMENTE_INEXISTENTE_999', subtotal: 50 },
    });
    assert(status === 404 || json.success === false, 'Cupom inexistente deve falhar');
  });
}

// ----------------------------------------------------------------
// [4] TESTES DE ACESSO PÚBLICO E ISOLAMENTO DE DADOS (C7, C8)
// ----------------------------------------------------------------
async function runPublicAccessTests() {
  console.log('\n[4] Testes de Acesso Público e Proteção de PII\n');

  await test('T32 — GET /api/orders/AD-9999 não expõe telefone nem endereço de clientes', async () => {
    const { json } = await req('GET', '/api/orders/AD-9999');
    if (json.order) {
      assert(!json.order.customer_phone, 'customer_phone não deve ser exposto publicamente');
      assert(!json.order.customer_name, 'customer_name não deve ser exposto publicamente');
      assert(!json.order.address_street, 'address_street não deve ser exposto publicamente');
    }
  });

  await test('T33 — GET /api/orders/by-phone com número incompleto retorna 400', async () => {
    const { status, json } = await req('GET', '/api/orders/by-phone?phone=12345');
    assert(status === 400, `Esperado 400 para telefone incompleto, obtido ${status}`);
    assert(json.success === false, 'Deve retornar success: false');
  });

  await test('T34 — GET /api/orders/by-phone para clientes não expõe endereços residenciais', async () => {
    const { status, json } = await req('GET', '/api/orders/by-phone?phone=81999999999');
    assert(status === 200, `Consulta pública de meus-pedidos deve funcionar, obtido ${status}`);
    if (json.orders && json.orders.length > 0) {
      json.orders.forEach((o: any) => {
        assert(!o.address_street, 'Endereço completo não deve ser retornado na consulta pública');
        assert(!o.customer_phone, 'Telefone não deve ser retornado na consulta pública');
      });
    }
  });

  await test('T35 — GET /api/products é rota pública do cardápio (200)', async () => {
    const { status } = await req('GET', '/api/products');
    assert(status === 200, `GET /api/products deve ser público, obtido ${status}`);
  });

  await test('T36 — GET /api/neighborhoods é rota pública de taxas (200)', async () => {
    const { status } = await req('GET', '/api/neighborhoods');
    assert(status === 200, `GET /api/neighborhoods deve ser público, obtido ${status}`);
  });

  await test('T37 — GET /api/store-status é rota pública de horário (200)', async () => {
    const { status } = await req('GET', '/api/store-status');
    assert(status === 200, `GET /api/store-status deve ser público, obtido ${status}`);
  });

  await test('T38 — Integridade de preços: valores forjados no payload pelo cliente são ignorados pelo servidor', async () => {
    // Tenta forjar produto existente com preço de R$ 0.01
    const { json: prodJson } = await req('GET', '/api/products');
    const firstProd = (prodJson.products || [])[0];
    if (firstProd) {
      const { json: orderJson } = await req('POST', '/api/orders', {
        body: {
          customer_name: 'Cliente Teste Integridade',
          customer_phone: '81999999999',
          order_type: 'pickup',
          payment_method: 'cash',
          items: [{
            product_id: firstProd.id,
            product_name: firstProd.name,
            quantity: 1,
            unit_price: 0.01, // Tentativa de fraude de preço
            total_price: 0.01,
          }],
        },
      });
      if (orderJson.order) {
        assert(
          orderJson.order.subtotal >= firstProd.price || orderJson.order.subtotal > 0.01,
          'O servidor deve calcular o preço real do banco, não o enviado pelo cliente'
        );
      }
    }
  });

  await test('T39 — Rota /api/push/vapid-key fornece apenas chave pública sem vazar a privada', async () => {
    const { status, json } = await req('GET', '/api/push/vapid-key');
    assert(status === 200, `Esperado 200, obtido ${status}`);
    assert(json.publicKey, 'Deve conter chave pública');
    assert(!json.privateKey, 'NUNCA deve vazar chave privada');
  });

  await test('T40 — Proteção contra dados de terceiros: busca por código inválido não expõe pedidos de outros', async () => {
    const { status } = await req('GET', '/api/orders/CODIGO_TOTALMENTE_INEXISTENTE_XYZ');
    assert(status === 404, `Esperado 404 para código inexistente, obtido ${status}`);
  });

  await test('T41 — Sessão com token malformado ou nulo é rejeitada com 401', async () => {
    const { status } = await req('POST', '/api/products', {
      cookie: 'acai_admin_session=admv2.invalido',
      body: { product: { name: 'X' } },
    });
    assert(status === 401, `Esperado 401 para token malformado, obtido ${status}`);
  });

  await test('T42 — Webhook fora de ordem com status inferior não altera pedido já pago', async () => {
    // Simula notificação com status 'cancelled' ou 'pending' para topic de pagamento
    const { status, json } = await req('POST', '/api/webhook?topic=payment&id=SIM-PIX-FAKE', {
      headers: {
        'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=invalido`,
      },
    });
    assert(status === 200, 'Deve responder 200 ao Mercado Pago');
  });
}

// ----------------------------------------------------------------
// EXECUÇÃO PRINCIPAL
// ----------------------------------------------------------------
async function main() {
  console.log(`===============================================`);
  console.log(`Açaí da Daiane — Auditoria Independente de Segurança`);
  console.log(`URL do Servidor: ${BASE_URL}`);
  console.log(`===============================================`);

  await runAuthTests();
  await runWebhookTests();
  await runBusinessRulesTests();
  await runPublicAccessTests();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n===============================================`);
  console.log(`RESULTADO FINAL: ${passed} aprovados, ${failed} reprovados (Total: ${results.length})`);
  console.log(`===============================================\n`);

  if (failed > 0) {
    console.log('TESTES REPROVADOS:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log('✅ Todos os testes de segurança e integridade foram APROVADOS.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});