// scripts/test-cart-api.mjs
// ============================================
// Cart API Smoke Test — local testing ke liye
//
// Usage:
//   1. Server chalao:  npm run dev
//   2. Phir doosre terminal me:  node scripts/test-cart-api.mjs
//
// Optional: BASE_URL=http://localhost:5000 node scripts/test-cart-api.mjs
// (Node 18+ required — fetch built-in hai)
// ============================================

const BASE = process.env.BASE_URL || 'http://localhost:5000';

let passed = 0;
let failed = 0;
const results = [];

function log(label, ok, extra = '') {
  const mark = ok ? '✅ PASS' : '❌ FAIL';
  results.push({ label, ok });
  ok ? passed++ : failed++;
  console.log(`${mark}  ${label}${extra ? `  ${extra}` : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}

async function main() {
  console.log(`\n🧪 Cart API Smoke Test — ${BASE}\n${'='.repeat(50)}\n`);

  // 0. Health check
  const health = await api('GET', '/');
  log('Health check (GET /)', health.status === 200);

  // 1. Register fresh test users (unique email)
  const stamp = Date.now();
  const userEmail = `cartuser_${stamp}@test.com`;
  const adminEmail = `cartadmin_${stamp}@test.com`;

  const userReg = await api('POST', '/api/auth/register', {
    body: { name: 'Cart Test User', email: userEmail, password: 'test123' }
  });
  const userToken = userReg.json?.data?.token;
  log('Register user (201)', userReg.status === 201 && !!userToken);

  const adminReg = await api('POST', '/api/auth/register', {
    body: { name: 'Cart Test Admin', email: adminEmail, password: 'test123', role: 'admin' }
  });
  const adminToken = adminReg.json?.data?.token;
  log('Register admin (201)', adminReg.status === 201 && !!adminToken);

  // 2. Ensure at least 2 products exist (admin create if empty)
  const list = await api('GET', '/api/products');
  let products = list.json?.data || [];
  if (products.length === 0) {
    for (const p of [
      { name: 'Test Product A', price: 100, category: 'test', description: 'smoke test item' },
      { name: 'Test Product B', price: 250, category: 'test', description: 'smoke test item' }
    ]) {
      await api('POST', '/api/products', { token: adminToken, body: p });
    }
    products = (await api('GET', '/api/products')).json?.data || [];
  }
  const [p1, p2] = products;
  log('Products available (need 2)', !!p1 && !!p2, `→ ${products.length} found`);

  const priceOf = id => products.find(p => p._id === id)?.price ?? 0;

  // 3. Cart without token → 401
  const noAuth = await api('GET', '/api/cart');
  log('Cart without token → 401', noAuth.status === 401);

  // 4. Get cart (auto-creates empty)
  const emptyCart = await api('GET', '/api/cart', { token: userToken });
  log('GET /api/cart → 200 empty cart', emptyCart.status === 200 && (emptyCart.json?.data?.items?.length ?? -1) === 0);

  // 5. Validation checks
  const noBody = await api('POST', '/api/cart', { token: userToken, body: {} });
  log('POST empty body → 400', noBody.status === 400);

  const badId = await api('POST', '/api/cart', { token: userToken, body: { productId: 'not-an-object-id', quantity: 1 } });
  log('POST invalid productId → 400', badId.status === 400);

  const wrongLen = await api('POST', '/api/cart', { token: userToken, body: { productId: 'aaaaaaaaaaaaaaaaaaaaaaaa', quantity: 1 } });
  log('POST unknown (valid-format) productId → 404', wrongLen.status === 404);

  const qtyZero = await api('POST', '/api/cart', { token: userToken, body: { productId: p1._id, quantity: 0 } });
  log('POST quantity 0 → 400', qtyZero.status === 400);

  const qtyFloat = await api('POST', '/api/cart', { token: userToken, body: { productId: p1._id, quantity: 1.5 } });
  log('POST quantity 1.5 → 400', qtyFloat.status === 400);

  // 6. Add items
  const add1 = await api('POST', '/api/cart', { token: userToken, body: { productId: p1._id, quantity: 2 } });
  log(
    'POST add product1 qty2 → total = 2×price',
    add1.status === 200 && add1.json?.data?.totalAmount === 2 * priceOf(p1._id),
    `total: ${add1.json?.data?.totalAmount} (expected ${2 * priceOf(p1._id)})`
  );

  const populated = add1.json?.data?.items?.[0]?.product;
  log('items.product populated hai (name/price aata hai)', !!populated && typeof populated === 'object' && !!populated.name);

  const add1again = await api('POST', '/api/cart', { token: userToken, body: { productId: p1._id, quantity: 3 } });
  log(
    'POST same product qty3 → increment (2+3=5)',
    add1again.status === 200 && add1again.json?.data?.items?.length === 1 && add1again.json?.data?.totalAmount === 5 * priceOf(p1._id),
    `total: ${add1again.json?.data?.totalAmount} (expected ${5 * priceOf(p1._id)})`
  );

  const add2 = await api('POST', '/api/cart', { token: userToken, body: { productId: p2._id, quantity: 1 } });
  log(
    'POST add product2 → 2 items, total updated',
    add2.status === 200 && add2.json?.data?.items?.length === 2 && add2.json?.data?.totalAmount === 5 * priceOf(p1._id) + 1 * priceOf(p2._id),
    `total: ${add2.json?.data?.totalAmount}`
  );

  // 7. User isolation — admin ka cart empty hona chahiye
  const adminCart = await api('GET', '/api/cart', { token: adminToken });
  log('User isolation: admin cart ≠ user cart', adminCart.status === 200 && (adminCart.json?.data?.items?.length ?? 1) === 0);

  // 8. Remove single item
  const rm = await api('DELETE', `/api/cart/${p1._id}`, { token: userToken });
  log(
    'DELETE /api/cart/:productId → item removed, total recalculated',
    rm.status === 200 && rm.json?.data?.items?.length === 1 && rm.json?.data?.totalAmount === 1 * priceOf(p2._id),
    `total: ${rm.json?.data?.totalAmount} (expected ${priceOf(p2._id)})`
  );

  // 9. Remove same item again → 404 (not in cart)
  const rmAgain = await api('DELETE', `/api/cart/${p1._id}`, { token: userToken });
  log('DELETE same item again → 404 "Item not found in cart"', rmAgain.status === 404);

  // 10. Clear cart
  const clear = await api('DELETE', '/api/cart', { token: userToken });
  log('DELETE /api/cart → cart cleared', clear.status === 200 && (clear.json?.data?.items?.length ?? 1) === 0 && clear.json?.data?.totalAmount === 0);

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('\n💥 Test script crashed:', e.message);
  console.error('→ Kya server chal raha hai? (npm run dev)');
  process.exit(1);
});
