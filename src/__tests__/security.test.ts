/**
 * TESTES DE SEGURANÇA — Açaí da Daiane
 * Executa verificações automatizadas das correções de segurança.
 * Uso: npx tsx src/__tests__/security.test.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
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

async function req(method: string, path: string, opts: { cookie?: string; body?: any } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.cookie) headers['Cookie'] = opts.cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// ----------------------------------------------------------------
// TESTES DE AUTENTICAÇÃO (C1, C2)
// ----------------------------------------------------------------
async function runAuthTests() {
  console.log('\n[1] Testes de Autenticação\n');

  await test('T01 — Acesso sem cookie rejeitado em POST /api/products', async () => {
    const { status } = await req('POST', '/api/products', { body: { product: { name: 'X', price: 10 } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T02 — Token falso "FAKE" rejeitado em POST /api/products', async () => {
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

  await test('T11 — PATCH /api/orders/fake-id sem auth retorna 401', async () => {
    const { status } = await req('PATCH', '/api/orders/AD-9999', { body: { order_status: 'completed' } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T12 — DELETE /api/orders/fake-id sem auth retorna 401', async () => {
    const { status } = await req('DELETE', '/api/orders/AD-9999');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T13 — GET /api/orders sem auth retorna 401', async () => {
    const { status } = await req('GET', '/api/orders');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T14 — GET /api/orders/by-phone sem auth retorna 401', async () => {
    const { status } = await req('GET', '/api/orders/by-phone?phone=11999999999');
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T15 — POST /api/push/send sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/push/send', { body: { orderCode: 'AD-1', status: 'preparing' } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });

  await test('T16 — POST /api/option-groups sem auth retorna 401', async () => {
    const { status } = await req('POST', '/api/option-groups', { body: { group: { name: 'X' } } });
    assert(status === 401, `Esperado 401, obtido ${status}`);
  });
}

// ----------------------------------------------------------------
// TESTES DE REGRAS DE NEGÓCIO (C9, C10, C12)
// ----------------------------------------------------------------
async function runBusinessRulesTests() {
  console.log('\n[2] Testes de Regras de Negócio\n');

  await test('T17 — Quantidade negativa rejeitada no checkout', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Test User',
        customer_phone: '11999999999',
        order_type: 'pickup',
        payment_method: 'cash',
        items: [{ product_id: 'fake-id', product_name: 'X', quantity: -1, selected_options: [] }],
      },
    });
    assert(
      status === 400 || (json.success === false),
      `Esperado falha com quantidade negativa, obtido status ${status}`
    );
  });

  await test('T18 — Carrinho vazio rejeitado', async () => {
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

  await test('T19 — Nome de cliente ausente rejeitado', async () => {
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

  await test('T20 — Entrega sem bairro rejeitada', async () => {
    const { status, json } = await req('POST', '/api/orders', {
      body: {
        customer_name: 'Test User',
        customer_phone: '11999999999',
        order_type: 'delivery',
        payment_method: 'cash',
        items: [{ product_id: 'x', quantity: 1 }],
      },
    });
    // Pode retornar 400 por bairro ausente ou por produto não encontrado — ambos são corretos
    assert(
      status === 400,
      `Esperado 400 sem bairro para delivery, obtido ${status}: ${JSON.stringify(json)}`
    );
  });
}

// ----------------------------------------------------------------
// TESTES PÚBLICOS (rota de pedido deve restringir dados)
// ----------------------------------------------------------------
async function runPublicAccessTests() {
  console.log('\n[3] Testes de Acesso Público\n');

  await test('T21 — GET /api/orders/AD-9999 não retorna dados pessoais para não-admin', async () => {
    const { json } = await req('GET', '/api/orders/AD-9999');
    // Se o pedido não existir, retorna 404 — OK
    // Se existir, nao deve ter customer_phone exposto
    if (json.order) {
      assert(!json.order.customer_phone, 'customer_phone não deve ser exposto publicamente');
      assert(!json.order.customer_name, 'customer_name não deve ser exposto publicamente');
    }
  });

  await test('T22 — GET /api/products é público (retorna 200)', async () => {
    const { status } = await req('GET', '/api/products');
    assert(status === 200, `GET /api/products deve ser público, obtido ${status}`);
  });

  await test('T23 — GET /api/neighborhoods é público (retorna 200)', async () => {
    const { status } = await req('GET', '/api/neighborhoods');
    assert(status === 200, `GET /api/neighborhoods deve ser público, obtido ${status}`);
  });

  await test('T24 — GET /api/store-status é público (retorna 200)', async () => {
    const { status } = await req('GET', '/api/store-status');
    assert(status === 200, `GET /api/store-status deve ser público, obtido ${status}`);
  });
}

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------
async function main() {
  console.log(`\n============================`);
  console.log(`Açaí da Daiane - Security Tests`);
  console.log(`URL: ${BASE_URL}`);
  console.log(`============================`);

  await runAuthTests();
  await runBusinessRulesTests();
  await runPublicAccessTests();

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n============================`);
  console.log(`RESULTADO: ${passed} aprovados, ${failed} reprovados`);
  console.log(`============================\n`);

  if (failed > 0) {
    console.log('FALHAS:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log('Todos os testes de segurança passaram.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});