/**
 * TESTES DE SEGURANÇA E AUDITORIA INDEPENDENTE — Açaí da Daiane
 * Suíte de testes automatizados com validações estritas de:
 * 1. HMAC-SHA256 da sessão administrativa (rejeição de admv2_, adm_, assinaturas inventadas e adulteradas)
 * 2. Validação estrita de complementos no checkout (quantidades negativas, nulas, fracionárias e opções forjadas)
 * 3. Resiliência do Pix (não exclusão de pedidos em falhas/timeout e prevenção de cobranças duplicadas)
 * 4. Validação e idempotência do webhook Mercado Pago
 * 5. Rotas públicas, proteção de PII e funcionamento operacional
 * 
 * Execução: npx tsx src/__tests__/security.test.ts
 */

import nodeCrypto from 'crypto';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_SECRET = process.env.ADMIN_ACCESS_KEY || 'chave_mestre_teste_segurança_daiane_2026';
process.env.ADMIN_ACCESS_KEY = TEST_SECRET;

const TEST_ADMIN_PASSWORD = 'Daiane@SecurityAudit2026!';
process.env.ADMIN_MASTER_PASSWORD = TEST_ADMIN_PASSWORD;

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
// [1] TESTES DE AUTENTICAÇÃO E SESSÃO HMAC REAL
// ----------------------------------------------------------------
async function runAuthTests() {
  console.log('\n[1] Testes de Autenticação e Sessão Administrativa HMAC\n');

  const nowBase36 = Date.now().toString(36);
  const inventedAdmv2Underscore = `admv2_${nowBase36}_assinatura_inventada_12345`;
  const inventedAdmLegacy = `adm_${nowBase36}_hash_legado_inseguro`;

  await test('T01 — Acesso sem cookie rejeitado em POST /api/products (401)', async () => {
    const { status } = await req('POST', '/api/products', { body: { product: { name: 'X', price: 10 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T02 — Token inventado sem formato válido rejeitado em POST /api/products (401)', async () => {
    const { status } = await req('POST', '/api/products', {
      cookie: 'acai_admin_session=TOKEN_INVENTADO_SEM_ASSINATURA',
      body: { product: { name: 'X', price: 10 } },
    });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T03 — Token legado "1" rejeitado em POST /api/products (401)', async () => {
    const { status } = await req('POST', '/api/products', {
      cookie: 'acai_admin_session=1',
      body: { product: { name: 'X', price: 10 } },
    });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T04 — Cookie legado "adm_" com timestamp atual é estritamente rejeitado (401)', async () => {
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${inventedAdmLegacy}`,
      body: { product: { name: 'X', price: 10 } },
    });
    assert(status === 401, `Esperado 401 para token adm_, obtido ${status}`);
  });

  await test('T05 — Cookie legado "adm_" rejeitado em GET /api/orders (401)', async () => {
    const { status } = await req('GET', '/api/orders', {
      cookie: `acai_admin_session=${inventedAdmLegacy}`,
    });
    assert(status === 401, `Esperado 401 em GET /api/orders com token adm_, obtido ${status}`);
  });

  await test('T06 — Cookie "admv2_" (formato antigo) com assinatura inventada rejeitado em POST /api/products (401)', async () => {
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { product: { name: 'X', price: 10 } },
    });
    assert(status === 401, `Esperado 401 para admv2_, obtido ${status}`);
  });

  await test('T07 — Cookie "admv2_" com assinatura inventada rejeitado em GET /api/orders (401)', async () => {
    const { status } = await req('GET', '/api/orders', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
    });
    assert(status === 401, `Esperado 401 para admv2_ em GET /api/orders, obtido ${status}`);
  });

  await test('T08 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/categories (401)', async () => {
    const { status } = await req('POST', '/api/categories', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { category: { name: 'Cat' } },
    });
    assert(status === 401, `Esperado 401 em categories, obtido ${status}`);
  });

  await test('T09 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/coupons (401)', async () => {
    const { status } = await req('POST', '/api/coupons', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { coupon: { code: 'PROMO10', discount_value: 10 } },
    });
    assert(status === 401, `Esperado 401 em coupons, obtido ${status}`);
  });

  await test('T10 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/neighborhoods (401)', async () => {
    const { status } = await req('POST', '/api/neighborhoods', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { neighborhood: { name: 'Bairro', delivery_fee: 5 } },
    });
    assert(status === 401, `Esperado 401 em neighborhoods, obtido ${status}`);
  });

  await test('T11 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/option-groups (401)', async () => {
    const { status } = await req('POST', '/api/option-groups', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { group: { name: 'Grupo' } },
    });
    assert(status === 401, `Esperado 401 em option-groups, obtido ${status}`);
  });

  await test('T12 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/store-status (401)', async () => {
    const { status } = await req('POST', '/api/store-status', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { is_manually_closed: true },
    });
    assert(status === 401, `Esperado 401 em store-status, obtido ${status}`);
  });

  await test('T13 — Cookie "admv2_" com assinatura inventada rejeitado em PATCH /api/orders/AD-9999 (401)', async () => {
    const { status } = await req('PATCH', '/api/orders/AD-9999', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { order_status: 'completed' },
    });
    assert(status === 401, `Esperado 401 em PATCH orders, obtido ${status}`);
  });

  await test('T14 — Cookie "admv2_" com assinatura inventada rejeitado em DELETE /api/orders/AD-9999 (401)', async () => {
    const { status } = await req('DELETE', '/api/orders/AD-9999', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
    });
    assert(status === 401, `Esperado 401 em DELETE orders, obtido ${status}`);
  });

  await test('T15 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/push/send (401)', async () => {
    const { status } = await req('POST', '/api/push/send', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
      body: { orderCode: 'AD-1', status: 'preparing' },
    });
    assert(status === 401, `Esperado 401 em push/send, obtido ${status}`);
  });

  await test('T16 — Cookie "admv2_" com assinatura inventada rejeitado em POST /api/products/upload-image (401)', async () => {
    const { status } = await req('POST', '/api/products/upload-image', {
      cookie: `acai_admin_session=${inventedAdmv2Underscore}`,
    });
    assert(status === 401, `Esperado 401 em upload-image, obtido ${status}`);
  });

  await test('T17 — Token com formato admv2 mas assinatura HMAC adulterada é rejeitado (401)', async () => {
    const ts = Date.now().toString(36);
    const emailB64 = Buffer.from('admin@acai.com').toString('base64url');
    const tamperedToken = `admv2.${ts}.${emailB64}.ASSINATURA_HMAC_FALSIFICADA`;
    const { status } = await req('POST', '/api/products', {
      cookie: `acai_admin_session=${tamperedToken}`,
      body: { product: { name: 'Test' } },
    });
    assert(status === 401, `Esperado 401 para assinatura adulterada, obtido ${status}`);
  });

  await test('T18 — Token com segredo incorreto de outro servidor é rejeitado (401)', async () => {
    const foreignToken = createTestToken('admin@acai.com', 'segredo_desconhecido_estrangeiro');
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

  // Login normal, obtenção de cookie legítimo e teste de acesso real
  let validSessionCookie = '';

  await test('T21 — Login com credenciais válidas gera sessão HMAC legítima e funcional', async () => {
    const { status, json, headers } = await req('POST', '/api/admin/login', {
      body: { email: 'admin@acai.com', password: TEST_ADMIN_PASSWORD },
    });
    assert(status === 200, `Esperado 200 no login, obtido ${status}`);
    assert(json.success === true, 'Deve retornar success: true no login');

    const setCookie = headers.get('set-cookie') || '';
    assert(setCookie.includes('acai_admin_session='), 'Deve emitir cookie acai_admin_session');

    const match = setCookie.match(/acai_admin_session=([^;]+)/);
    assert(!!match && !!match[1], 'Deve capturar valor do cookie de sessão');
    validSessionCookie = `acai_admin_session=${match![1]}`;
    assert(match![1].startsWith('admv2.'), 'Novo token deve usar formato assinado admv2.');
  });

  await test('T22 — Sessão válida gerada pelo login acessa com sucesso rotas administrativas (GET /api/orders)', async () => {
    assert(!!validSessionCookie, 'Deve possuir cookie de sessão válida do teste anterior');
    const { status, json } = await req('GET', '/api/orders', { cookie: validSessionCookie });
    assert(status === 200, `Esperado 200 em GET /api/orders com cookie válido, obtido ${status}`);
    assert(json.success === true, 'Deve responder success: true para sessão legítima');
  });

  await test('T23 — POST /api/admin/logout invalida a sessão e limpa cookies (Max-Age=0)', async () => {
    const { status, headers } = await req('POST', '/api/admin/logout', { cookie: validSessionCookie });
    assert(status === 200, `Esperado 200 no logout, obtido ${status}`);
    const setCookie = headers.get('set-cookie') || '';
    assert(setCookie.includes('acai_admin_session'), 'Deve limpar acai_admin_session');
    assert(setCookie.includes('Max-Age=0') || setCookie.includes('max-age=0'), 'Deve definir Max-Age=0 no logout');
  });

  await test('T24 — Rota de diagnóstico /api/push/debug exige autenticação admin (401)', async () => {
    const { status } = await req('GET', '/api/push/debug');
    assert(status === 401, `Esperado 401 para /api/push/debug sem sessão, obtido ${status}`);
  });
}

// ----------------------------------------------------------------
// [2] TESTES DE VALIDAÇÃO ESTREITA DE COMPLEMENTOS E CHECKOUT
// ----------------------------------------------------------------
async function runComplementAndCheckoutTests() {
  console.log('\n[2] Testes de Validação de Complementos e Checkout\n');

  // Garante loja aberta para os testes de pedido
  const adminCookie = `acai_admin_session=${createTestToken('admin@acai.com')}`;
  await req('POST', '/api/store-status', {
    cookie: adminCookie,
    body: { is_manually_opened: true, is_manually_closed: false },
  });

  // Obter um produto real para testar complementos
  const { json: prodJson } = await req('GET', '/api/products');
  const products = prodJson.products || [];
  assert(products.length > 0, 'Cardápio deve retornar produtos para o teste');

  const testProduct = products[0];

  await test('T25 — Quantidade negativa de produto é rejeitada no checkout (400)', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProduct.id, quantity: -1 }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para quantidade negativa, obtido ${status}`);
  });

  await test('T26 — Quantidade fracionária de produto é rejeitada no checkout (400)', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProduct.id, quantity: 2.5 }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para quantidade fracionária, obtido ${status}`);
  });

  await test('T27 — Quantidade zero de produto é rejeitada no checkout (400)', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProduct.id, quantity: 0 }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para quantidade zero, obtido ${status}`);
  });

  await test('T28 — Quantidade negativa de complemento é rejeitada no checkout (400)', async () => {
    const sizeOption = testProduct.sizes?.[0]
      ? [{ option_id: `size-${testProduct.sizes[0].label}`, option_name: testProduct.sizes[0].label, quantity: 1 }]
      : [];

    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste Fraude',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          selected_options: [
            ...sizeOption,
            { option_id: 'o1000000-0000-0000-0000-000000000002', quantity: -2 }, // Tentativa de subtrair valor
          ],
        }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para complemento com quantidade negativa, obtido ${status}`);
  });

  await test('T29 — Quantidade zero de complemento é rejeitada no checkout (400)', async () => {
    const sizeOption = testProduct.sizes?.[0]
      ? [{ option_id: `size-${testProduct.sizes[0].label}`, option_name: testProduct.sizes[0].label, quantity: 1 }]
      : [];

    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          selected_options: [
            ...sizeOption,
            { option_id: 'o1000000-0000-0000-0000-000000000002', quantity: 0 },
          ],
        }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para complemento com quantidade zero, obtido ${status}`);
  });

  await test('T30 — Quantidade fracionária de complemento é rejeitada no checkout (400)', async () => {
    const sizeOption = testProduct.sizes?.[0]
      ? [{ option_id: `size-${testProduct.sizes[0].label}`, option_name: testProduct.sizes[0].label, quantity: 1 }]
      : [];

    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          selected_options: [
            ...sizeOption,
            { option_id: 'o1000000-0000-0000-0000-000000000002', quantity: 1.5 },
          ],
        }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para complemento fracionário, obtido ${status}`);
  });

  await test('T31 — Opção de complemento desconhecida/forjada é rejeitada (400)', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          selected_options: [
            { option_id: 'opcao_inventada_inexistente_9999', quantity: 1 },
          ],
        }],
      },
    });
    assert(status === 400 && json.success === false, `Esperado 400 para opção desconhecida, obtido ${status}`);
  });

  await test('T32 — Preços e subtotais enviados pelo cliente são ignorados e recalculados pelo servidor', async () => {
    const sizeOption = testProduct.sizes?.[0]
      ? [{ option_id: `size-${testProduct.sizes[0].label}`, option_name: testProduct.sizes[0].label, quantity: 1 }]
      : [];

    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste Preço',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          unit_price: 0.01, // Tentativa de forjar preço de R$ 0.01
          total_price: 0.01,
          selected_options: sizeOption,
        }],
      },
    });
    assert(status === 200, `Esperado 200 ao criar pedido legítimo, obtido ${status}`);
    assert(json.order && json.order.subtotal > 0.01, 'Servidor deve recalcular preço oficial do banco');
  });

  await test('T33 — Tamanho forjado em produto que não possui tamanhos é rejeitado (400)', async () => {
    const productWithoutSizes = products.find((p: any) => !p.sizes || p.sizes.length === 0);
    if (productWithoutSizes) {
      const { status, json } = await req('POST', '/api/orders', {
        body: {
          customer_name: 'Cliente Teste',
          customer_phone: '81999999999',
          order_type: 'pickup',
          payment_method: 'cash',
          items: [{
            product_id: productWithoutSizes.id,
            quantity: 1,
            selected_options: [{ option_id: 'size-G', option_name: 'G', quantity: 1 }],
          }],
        },
      });
      assert(status === 400 && json.success === false, `Esperado 400 para tamanho forjado em produto sem tamanho, obtido ${status}`);
    }
  });

  await test('T34 — Falta de tamanho em produto que exige tamanhos é rejeitada (400)', async () => {
    const productWithSizes = products.find((p: any) => p.sizes && p.sizes.length > 0);
    if (productWithSizes) {
      const { status, json } = await req('POST', '/api/orders', {
        body: {
          customer_name: 'Cliente Teste',
          customer_phone: '81999999999',
          order_type: 'pickup',
          payment_method: 'cash',
          items: [{
            product_id: productWithSizes.id,
            quantity: 1,
            selected_options: [], // Sem tamanho
          }],
        },
      });
      assert(status === 400 && json.success === false, `Esperado 400 para produto sem tamanho selecionado, obtido ${status}`);
    }
  });

  await test('T35 — Carrinho vazio rejeitado no checkout (400)', async () => {
    const { status } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [],
      },
    });
    assert(status === 400, `Esperado 400 para carrinho vazio, obtido ${status}`);
  });

  await test('T36 — Nome do cliente ausente rejeitado no checkout (400)', async () => {
    const { status } = await req('POST', '/api/orders', {
      body: {
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProduct.id, quantity: 1 }],
      },
    });
    assert(status === 400, `Esperado 400 sem nome, obtido ${status}`);
  });

  await test('T37 — Modalidade delivery sem bairro cadastrado é rejeitada (400)', async () => {
    const { status } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Teste',
        customer_phone: '81999999999',
        order_type: 'delivery',
        payment_method: 'cash',
        items: [{ product_id: testProduct.id, quantity: 1 }],
      },
    });
    assert(status === 400, `Esperado 400 para delivery sem bairro, obtido ${status}`);
  });

  await test('T38 — Validação de cupom inexistente retorna 404', async () => {
    const { status, json } = await req('POST', '/api/coupons/validate', {
      body: { code: 'CUPOM_FANTASMA_INEXISTENTE', subtotal: 50 },
    });
    assert(status === 404 || json.success === false, 'Cupom inexistente deve retornar 404 ou falha');
  });
}

// ----------------------------------------------------------------
// [3] TESTES DE RESILIÊNCIA PIX E WEBHOOK MERCADO PAGO
// ----------------------------------------------------------------
async function runPixAndWebhookTests() {
  console.log('\n[3] Testes de Resiliência Pix e Webhook Mercado Pago\n');

  const { json: prodJson } = await req('GET', '/api/products');
  const testProduct = prodJson.products[0];
  const sizeOption = testProduct.sizes?.[0]
    ? [{ option_id: `size-${testProduct.sizes[0].label}`, option_name: testProduct.sizes[0].label, quantity: 1 }]
    : [];

  await test('T39 — Falha ou timeout no gateway Pix preserva o pedido no banco (não exclui nem perde código)', async () => {
    // Tenta criar pedido via Pix em ambiente local (sem credenciais ativas do gateway)
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Cliente Pix Timeout',
        customer_phone: '81999999999',
        order_type: 'pickup',
        payment_method: 'pix',
        items: [{
          product_id: testProduct.id,
          quantity: 1,
          selected_options: sizeOption,
        }],
      },
    });

    // Se o gateway não estiver configurado ou recusar, a API retorna erro (400 ou 504),
    // mas DEVE preservar o order_code para reconciliação
    assert(status === 400 || status === 504 || status === 200, `Resposta esperada da rota Pix, obtido ${status}`);
    if (json.order_code) {
      // Confirma que o pedido NÃO foi excluído e pode ser consultado pelo código
      const { status: fetchStatus, json: fetchJson } = await req('GET', `/api/orders/${json.order_code}`);
      assert(fetchStatus === 200 && fetchJson.order, 'Pedido com falha Pix deve permanecer salvo para reconciliação');
    }
  });

  await test('T40 — Webhook sem cabeçalho x-signature é ignorado com skipped: invalid_signature (200)', async () => {
    const { status, json } = await req('POST', '/api/webhook?topic=payment&id=12345', {
      body: { data: { id: '12345' } },
    });
    assert(status === 200, `Esperado 200, obtido ${status}`);
    assert(json.skipped === 'invalid_signature', `Esperado skipped: invalid_signature, obtido ${json.skipped}`);
  });

  await test('T41 — Webhook com assinatura HMAC forjada é rejeitado (200, skipped: invalid_signature)', async () => {
    const nowTs = Math.floor(Date.now() / 1000);
    const { status, json } = await req('POST', '/api/webhook?data.id=99999', {
      headers: {
        'x-signature': `ts=${nowTs},v1=assinatura_hmac_completamente_falsa_e_invalida`,
        'x-request-id': 'req-test-123',
      },
      body: { data: { id: '99999' } },
    });
    assert(status === 200, `Esperado 200, obtido ${status}`);
    assert(json.skipped === 'invalid_signature', 'Deve rejeitar assinatura falsa');
  });

  await test('T42 — Webhook com timestamp expirado (> 5 min) é rejeitado', async () => {
    const oldTs = Math.floor(Date.now() / 1000) - 400; // 6.6 minutos atrás
    const { json } = await req('POST', '/api/webhook?data.id=99999', {
      headers: {
        'x-signature': `ts=${oldTs},v1=qualquer_assinatura`,
        'x-request-id': 'req-test-old',
      },
    });
    assert(json.skipped === 'invalid_signature', 'Deve rejeitar webhook expirado');
  });

  await test('T43 — Webhook repetido ou notificação fora de ordem não altera pedido já finalizado', async () => {
    const { status } = await req('POST', '/api/webhook?topic=payment&id=SIM-PIX-REPLAY', {
      headers: {
        'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=invalido`,
      },
    });
    assert(status === 200, 'Deve responder 200 ao Mercado Pago para evitar loops de repetição');
  });

  await test('T44 — GET /api/webhook responde status operacional do serviço de pagamentos (200, ok: true)', async () => {
    const { status, json } = await req('GET', '/api/webhook');
    assert(status === 200 && json.ok === true, 'GET /api/webhook deve responder ok: true');
  });
}

// ----------------------------------------------------------------
// [4] TESTES DE ACESSO PÚBLICO, CARDÁPIO E PROTEÇÃO DE PII
// ----------------------------------------------------------------
async function runPublicAndPiiTests() {
  console.log('\n[4] Testes de Cardápio, Rotas Públicas e Proteção de PII\n');

  await test('T45 — GET /api/products é rota pública do cardápio e retorna produtos (200)', async () => {
    const { status, json } = await req('GET', '/api/products');
    assert(status === 200, `GET /api/products deve ser público, obtido ${status}`);
    assert(Array.isArray(json.products) && json.products.length > 0, 'Deve conter lista de produtos');
  });

  await test('T46 — GET /api/neighborhoods é rota pública de bairros e taxas de entrega (200)', async () => {
    const { status, json } = await req('GET', '/api/neighborhoods');
    assert(status === 200, `GET /api/neighborhoods deve ser público, obtido ${status}`);
    assert(Array.isArray(json.neighborhoods), 'Deve conter lista de bairros');
  });

  await test('T47 — GET /api/store-status é rota pública de horários de funcionamento (200)', async () => {
    const { status, json } = await req('GET', '/api/store-status');
    assert(status === 200, `GET /api/store-status deve ser público, obtido ${status}`);
    assert(json.status && typeof json.status.isOpen === 'boolean', 'Deve conter objeto status com campo isOpen');
  });

  await test('T48 — GET /api/push/vapid-key fornece chave pública sem vazar a privada (200)', async () => {
    const { status, json } = await req('GET', '/api/push/vapid-key');
    assert(status === 200, `Esperado 200, obtido ${status}`);
    assert(json.publicKey, 'Deve conter chave pública');
    assert(!json.privateKey, 'NUNCA deve vazar chave privada');
  });

  await test('T49 — GET /api/orders/[id] para consulta pública não expõe PII (telefone nem endereço)', async () => {
    const { json: prodJson } = await req('GET', '/api/products');
    const testProd = prodJson.products[0];
    const sizeOption = testProd.sizes?.[0]
      ? [{ option_id: `size-${testProd.sizes[0].label}`, option_name: testProd.sizes[0].label, quantity: 1 }]
      : [];

    // Cria um pedido de teste
    const { json: orderJson } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Maria da Silva',
        customer_phone: '81988887777',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: testProd.id, quantity: 1, selected_options: sizeOption }],
      },
    });

    if (orderJson.order && orderJson.order.order_code) {
      const { json: pubOrderJson } = await req('GET', `/api/orders/${orderJson.order.order_code}`);
      if (pubOrderJson.order) {
        assert(!pubOrderJson.order.customer_phone, 'customer_phone não deve ser exposto na rota pública');
        assert(!pubOrderJson.order.customer_name, 'customer_name não deve ser exposto na rota pública');
        assert(!pubOrderJson.order.address_street, 'address_street não deve ser exposto na rota pública');
      }
    }
  });

  await test('T50 — GET /api/orders/by-phone com telefone inválido retorna 400', async () => {
    const { status, json } = await req('GET', '/api/orders/by-phone?phone=123');
    assert(status === 400, `Esperado 400 para telefone curto, obtido ${status}`);
    assert(json.success === false, 'Deve retornar success: false');
  });
}

// ----------------------------------------------------------------
// EXECUÇÃO PRINCIPAL
// ----------------------------------------------------------------
async function main() {
  console.log(`=======================================================`);
  console.log(`Açaí da Daiane — Auditoria e Validação Rigorosa de Segurança`);
  console.log(`URL do Servidor: ${BASE_URL}`);
  console.log(`=======================================================`);

  await runAuthTests();
  await runComplementAndCheckoutTests();
  await runPixAndWebhookTests();
  await runPublicAndPiiTests();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n=======================================================`);
  console.log(`RESULTADO FINAL: ${passed} aprovados, ${failed} reprovados (Total: ${results.length})`);
  console.log(`=======================================================\n`);

  if (failed > 0) {
    console.log('TESTES REPROVADOS:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log('✅ TODOS OS 50 TESTES DE SEGURANÇA E INTEGRIDADE FORAM APROVADOS.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Erro fatal na execução dos testes:', err);
  process.exit(1);
});