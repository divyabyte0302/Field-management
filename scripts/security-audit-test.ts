import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'keystone_super_secret_jwt_signing_key_2026_commercial_facility_ops_prod';

interface LoginRes {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    user: any;
  };
}

async function login(email: string, password = 'password123'): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginRes;
  if (!data.success || !data.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.data.token;
}

async function runSecurityAudit() {
  console.log('=== STARTING KEYSTONE SECURITY API AUDIT ===\n');
  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  // 1. Get Tokens
  const adminToken = await login('admin@keystone.io');
  const customer1Token = await login('facilitymgr@globalfin.com'); // cust-1
  const tech1Token = await login('tech.davis@keystone.io'); // tech-1 (Elena Reyes)
  const tech2Token = await login('tech.miller@keystone.io'); // tech-2 (Jamal Miller)

  // -------------------------------------------------------------
  // Test 1: Customer accessing another customer's work order
  // -------------------------------------------------------------
  try {
    // wo-103 or wo-106 belongs to cust-2 (or another customer/facility not cust-1)
    // Let's find a work order not belonging to cust-1
    const allOrdersRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allOrders = (await allOrdersRes.json()).data;
    const foreignOrder = allOrders.find((w: any) => w.customerId && w.customerId !== 'cust-1') ||
                         allOrders.find((w: any) => w.facilityId !== 'fac-1');

    if (!foreignOrder) {
      throw new Error('No foreign order found to test');
    }

    const testRes = await fetch(`${BASE_URL}/work-orders/${foreignOrder.id}`, {
      headers: { Authorization: `Bearer ${customer1Token}` },
    });
    const testJson = await testRes.json();

    if (testRes.status === 403) {
      results.push({
        test: "customer accessing another customer's work order",
        status: 'PASS',
        details: `HTTP 403 Forbidden received: "${testJson.message}"`,
      });
    } else {
      results.push({
        test: "customer accessing another customer's work order",
        status: 'FAIL',
        details: `Expected HTTP 403 but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: "customer accessing another customer's work order", status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 2: Technician accessing another technician's job
  // -------------------------------------------------------------
  try {
    // Find a work order assigned to tech-2
    const allOrdersRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allOrders = (await allOrdersRes.json()).data;
    const tech2Order = allOrders.find((w: any) => w.assignedTechnicianId === 'tech-2');

    if (!tech2Order) {
      throw new Error('No work order assigned to tech-2 found');
    }

    // Attempt to access with tech-1 token
    const testRes = await fetch(`${BASE_URL}/work-orders/${tech2Order.id}`, {
      headers: { Authorization: `Bearer ${tech1Token}` },
    });
    const testJson = await testRes.json();

    if (testRes.status === 403) {
      results.push({
        test: "technician accessing another technician's job",
        status: 'PASS',
        details: `HTTP 403 Forbidden received: "${testJson.message}"`,
      });
    } else {
      results.push({
        test: "technician accessing another technician's job",
        status: 'FAIL',
        details: `Expected HTTP 403 but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: "technician accessing another technician's job", status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 3: Technician attempting unauthorized close
  // -------------------------------------------------------------
  try {
    // Find an order assigned to tech-1 or any order
    const allOrdersRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allOrders = (await allOrdersRes.json()).data;
    const tech1Order = allOrders.find((w: any) => w.assignedTechnicianId === 'tech-1') || allOrders[0];

    const testRes = await fetch(`${BASE_URL}/work-orders/${tech1Order.id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tech1Token}`,
      },
      body: JSON.stringify({ targetStatus: 'CLOSED', notes: 'Tech attempting illegal close' }),
    });
    const testJson = await testRes.json();

    if (testRes.status === 403) {
      results.push({
        test: 'technician attempting unauthorized close',
        status: 'PASS',
        details: `HTTP 403 Forbidden received: "${testJson.message}"`,
      });
    } else {
      results.push({
        test: 'technician attempting unauthorized close',
        status: 'FAIL',
        details: `Expected HTTP 403 but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: 'technician attempting unauthorized close', status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 4: Expired JWT
  // -------------------------------------------------------------
  try {
    const expiredPayload = {
      userId: 'u-admin-1',
      email: 'admin@keystone.io',
      organizationId: 'org-apex-1',
      roles: ['ADMIN'],
      firstName: 'Michael',
      lastName: 'Scott',
      type: 'access',
      tokenVersion: 1,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };
    const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);

    const testRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const testJson = await testRes.json();

    if (testRes.status === 401 && (testJson.code === 'TOKEN_EXPIRED' || testJson.message?.includes('expired'))) {
      results.push({
        test: 'expired JWT',
        status: 'PASS',
        details: `HTTP 401 Unauthorized received: "${testJson.message}" (${testJson.code})`,
      });
    } else {
      results.push({
        test: 'expired JWT',
        status: 'FAIL',
        details: `Expected HTTP 401 TOKEN_EXPIRED but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: 'expired JWT', status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 5: Invalid JWT
  // -------------------------------------------------------------
  try {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidSignatureFakeToken';

    const testRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${invalidToken}` },
    });
    const testJson = await testRes.json();

    if (testRes.status === 401 && (testJson.code === 'INVALID_TOKEN' || testJson.message?.includes('Invalid JWT'))) {
      results.push({
        test: 'invalid JWT',
        status: 'PASS',
        details: `HTTP 401 Unauthorized received: "${testJson.message}" (${testJson.code})`,
      });
    } else {
      results.push({
        test: 'invalid JWT',
        status: 'FAIL',
        details: `Expected HTTP 401 INVALID_TOKEN but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: 'invalid JWT', status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 6: Illegal work-order transition
  // -------------------------------------------------------------
  try {
    // Find an order in NEW status
    const allOrdersRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allOrders = (await allOrdersRes.json()).data;
    const newOrder = allOrders.find((w: any) => w.status === 'NEW') || allOrders[0];

    // Attempt illegal transition NEW -> COMPLETED
    const testRes = await fetch(`${BASE_URL}/work-orders/${newOrder.id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ targetStatus: 'COMPLETED', notes: 'Skipping state machine illegally' }),
    });
    const testJson = await testRes.json();

    if ((testRes.status === 409 || testRes.status === 400) && (testJson.errorCode === 'INVALID_STATE_TRANSITION' || testJson.message?.includes('Invalid transition'))) {
      results.push({
        test: 'illegal work-order transition',
        status: 'PASS',
        details: `HTTP ${testRes.status} received: "${testJson.message}" (${testJson.errorCode || 'INVALID_STATE_TRANSITION'})`,
      });
    } else {
      results.push({
        test: 'illegal work-order transition',
        status: 'FAIL',
        details: `Expected HTTP 409 Conflict but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: 'illegal work-order transition', status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 7: Parts quantity exceeding stock
  // -------------------------------------------------------------
  try {
    const allOrdersRes = await fetch(`${BASE_URL}/work-orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allOrders = (await allOrdersRes.json()).data;
    const targetOrder = allOrders[0];

    // Attempt to allocate 99999 units of prt-1
    const testRes = await fetch(`${BASE_URL}/work-orders/${targetOrder.id}/parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ partId: 'prt-1', quantity: 99999, notes: 'Exceeding stock' }),
    });
    const testJson = await testRes.json();

    if (testRes.status === 400 && (testJson.message?.includes('Insufficient inventory') || testJson.message?.includes('In stock'))) {
      results.push({
        test: 'parts quantity exceeding stock',
        status: 'PASS',
        details: `HTTP 400 Bad Request received: "${testJson.message}"`,
      });
    } else {
      results.push({
        test: 'parts quantity exceeding stock',
        status: 'FAIL',
        details: `Expected HTTP 400 Insufficient inventory but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: 'parts quantity exceeding stock', status: 'FAIL', details: err.message });
  }

  // -------------------------------------------------------------
  // Test 8: Negative inventory
  // -------------------------------------------------------------
  try {
    // Attempt negative adjustment
    const testRes = await fetch(`${BASE_URL}/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        facilityId: 'fac-1',
        partId: 'prt-1',
        quantityChanged: -99999,
        reason: 'Attempting negative stock violation',
      }),
    });
    const testJson = await testRes.json();

    if (testRes.status === 400 && (testJson.message?.includes('cannot be negative') || testJson.message?.includes('rejected'))) {
      results.push({
        test: 'negative inventory',
        status: 'PASS',
        details: `HTTP 400 Bad Request received: "${testJson.message}"`,
      });
    } else {
      results.push({
        test: 'negative inventory',
        status: 'FAIL',
        details: `Expected HTTP 400 stock cannot be negative but got ${testRes.status}: ${JSON.stringify(testJson)}`,
      });
    }
  } catch (err: any) {
    results.push({ test: 'negative inventory', status: 'FAIL', details: err.message });
  }

  console.log('-------------------------------------------------------------');
  console.log('TEST AUDIT SUMMARY:');
  console.log('-------------------------------------------------------------');
  let passCount = 0;
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}`);
    console.log(`       Details: ${r.details}`);
    if (r.status === 'PASS') passCount++;
  }
  console.log('-------------------------------------------------------------');
  console.log(`TOTAL: ${passCount} / ${results.length} PASSED`);
  console.log('-------------------------------------------------------------');
  if (passCount !== results.length) {
    process.exit(1);
  }
}

runSecurityAudit().catch(err => {
  console.error('Audit script fatal error:', err);
  process.exit(1);
});
