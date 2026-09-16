/**
 * Project KEYSTONE - Comprehensive Production Security & Auth Test Suite
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name} - ${details}`);
}

async function api(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch (err) {
    data = { text: await res.text().catch(() => '') };
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('===============================================================');
  console.log('   KEYSTONE FSM - SECURITY & AUTHENTICATION TEST SUITE         ');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // 1. SYSTEM HEALTH
  // -------------------------------------------------------------------------
  try {
    const health = await api('/api/health');
    record('System Health Check', health.status === 200 && health.data.success === true, `Status: ${health.status}`);
  } catch (e: any) {
    record('System Health Check', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 2. VALID LOGIN (All 5 Roles)
  // -------------------------------------------------------------------------
  let superToken = '';
  let adminToken = '';
  let adminRefreshToken = '';
  let dispatcherToken = '';
  let techToken = '';
  let customerToken = '';
  let crossOrgToken = '';

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'superadmin@keystone.io', password: 'password123' })
    });
    superToken = res.data?.data?.token;
    record('Valid Login - SUPER_ADMIN', res.status === 200 && !!superToken, `Token generated: ${superToken ? 'YES' : 'NO'}`);
  } catch (e: any) {
    record('Valid Login - SUPER_ADMIN', false, e.message);
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@keystone.io', password: 'password123' })
    });
    adminToken = res.data?.data?.token;
    adminRefreshToken = res.data?.data?.refreshToken;
    record('Valid Login - ADMIN', res.status === 200 && !!adminToken, `Role verified: ${res.data?.data?.user?.roles?.join(', ')}`);
  } catch (e: any) {
    record('Valid Login - ADMIN', false, e.message);
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'dispatcher@keystone.io', password: 'password123' })
    });
    dispatcherToken = res.data?.data?.token;
    record('Valid Login - DISPATCHER', res.status === 200 && !!dispatcherToken, `User: ${res.data?.data?.user?.email}`);
  } catch (e: any) {
    record('Valid Login - DISPATCHER', false, e.message);
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'tech.davis@keystone.io', password: 'password123' })
    });
    techToken = res.data?.data?.token;
    record('Valid Login - TECHNICIAN', res.status === 200 && !!techToken, `User: ${res.data?.data?.user?.email}`);
  } catch (e: any) {
    record('Valid Login - TECHNICIAN', false, e.message);
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'facilitymgr@globalfin.com', password: 'password123' })
    });
    customerToken = res.data?.data?.token;
    record('Valid Login - CUSTOMER', res.status === 200 && !!customerToken, `User: ${res.data?.data?.user?.email}`);
  } catch (e: any) {
    record('Valid Login - CUSTOMER', false, e.message);
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'tenant2.admin@externalcorp.com', password: 'password123' })
    });
    crossOrgToken = res.data?.data?.token;
    record('Valid Login - CROSS_ORG_TENANT', res.status === 200 && !!crossOrgToken, `Org: ${res.data?.data?.user?.organizationId}`);
  } catch (e: any) {
    record('Valid Login - CROSS_ORG_TENANT', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 3. INVALID LOGIN
  // -------------------------------------------------------------------------
  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@keystone.io', password: 'wrongPassword999!' })
    });
    record('Invalid Login - Wrong Password', res.status === 401, `Status: ${res.status} (Expected 401)`);
  } catch (e: any) {
    record('Invalid Login - Wrong Password', false, e.message);
  }

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent.user@random.com', password: 'password123' })
    });
    record('Invalid Login - Nonexistent User', res.status === 401, `Status: ${res.status} (Expected 401)`);
  } catch (e: any) {
    record('Invalid Login - Nonexistent User', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 4. CURRENT USER ENDPOINT (GET /api/auth/me)
  // -------------------------------------------------------------------------
  try {
    const res = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Current User Endpoint (/api/auth/me)', res.status === 200 && res.data?.data?.email === 'admin@keystone.io', `Email: ${res.data?.data?.email}`);
  } catch (e: any) {
    record('Current User Endpoint (/api/auth/me)', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 5. EXPIRED / INVALID JWT
  // -------------------------------------------------------------------------
  try {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkZvbyBCYXIiLCJpYXQiOjE1MTYyMzkwMjJ9.invalidSignatureHereFake';
    const res = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${fakeToken}` }
    });
    record('Invalid JWT Signature Rejected', res.status === 401, `Status: ${res.status} (Expected 401)`);
  } catch (e: any) {
    record('Invalid JWT Signature Rejected', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 6. REFRESH TOKEN FLOW & ROTATION
  // -------------------------------------------------------------------------
  let rotatedRefreshToken = '';
  try {
    const res = await api('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: adminRefreshToken })
    });
    const newAccessToken = res.data?.data?.token;
    rotatedRefreshToken = res.data?.data?.refreshToken;
    const passed = res.status === 200 && !!newAccessToken && !!rotatedRefreshToken;
    record('Refresh Token Flow (Issue New Tokens)', passed, `New token received: ${!!newAccessToken}`);
    if (newAccessToken) adminToken = newAccessToken; // update adminToken
  } catch (e: any) {
    record('Refresh Token Flow (Issue New Tokens)', false, e.message);
  }

  // Old refresh token must be rejected (Refresh Token Rotation)
  try {
    const res = await api('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: adminRefreshToken })
    });
    record('Refresh Token Rotation (Old Token Revoked)', res.status === 401, `Status: ${res.status} (Expected 401 replay rejection)`);
  } catch (e: any) {
    record('Refresh Token Rotation (Old Token Revoked)', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 7. USER REGISTRATION
  // -------------------------------------------------------------------------
  const testRegEmail = `testuser.${Date.now()}@facilityops.com`;
  let registeredToken = '';
  try {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testRegEmail,
        password: 'Password999!',
        firstName: 'Jonathan',
        lastName: 'Dwight',
        organizationCode: 'APEX',
        role: 'CUSTOMER'
      })
    });
    registeredToken = res.data?.data?.token;
    record('User Registration (/api/auth/register)', res.status === 201 && !!registeredToken, `Email: ${testRegEmail}`);
  } catch (e: any) {
    record('User Registration (/api/auth/register)', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 8. LOGOUT & TOKEN INVALIDATION STRATEGY
  // -------------------------------------------------------------------------
  try {
    const logoutRes = await api('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    // Now request with registeredToken should fail
    const checkRes = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${registeredToken}` }
    });
    record('Token Invalidation on Logout', logoutRes.status === 200 && checkRes.status === 401, `After logout access status: ${checkRes.status} (Expected 401)`);
  } catch (e: any) {
    record('Token Invalidation on Logout', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 9. ROLE-BASED ACCESS CONTROL & UNAUTHORIZED ENDPOINTS
  // -------------------------------------------------------------------------
  // Customer cannot access /api/users (requires ADMIN or SUPER_ADMIN)
  try {
    const res = await api('/api/users', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    record('RBAC: Customer Access to Admin User Management Forbidden', res.status === 403, `Status: ${res.status} (Expected 403)`);
  } catch (e: any) {
    record('RBAC: Customer Access to Admin User Management Forbidden', false, e.message);
  }

  // Technician cannot assign a work order (requires DISPATCHER, ADMIN, SUPER_ADMIN)
  try {
    const res = await api('/api/v1/work-orders/wo-101/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({ technicianId: 'tech-2' })
    });
    record('RBAC: Technician Dispatch Assignment Forbidden', res.status === 403, `Status: ${res.status} (Expected 403)`);
  } catch (e: any) {
    record('RBAC: Technician Dispatch Assignment Forbidden', false, e.message);
  }

  // Admin CAN access /api/users
  try {
    const res = await api('/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('RBAC: Admin Access to User Management Allowed', res.status === 200 && Array.isArray(res.data?.data), `Count: ${res.data?.data?.length}`);
  } catch (e: any) {
    record('RBAC: Admin Access to User Management Allowed', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 10. TECHNICIAN PERMITTED ACTIONS
  // -------------------------------------------------------------------------
  // Technician can log time against an assigned order
  try {
    const res = await api('/api/v1/work-orders/wo-101/time-entries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({
        durationMinutes: 45,
        entryType: 'LABOR',
        notes: 'Replaced HVAC contactor relay'
      })
    });
    record('Technician Action: Log Time Entry Allowed', res.status === 201, `Status: ${res.status}`);
  } catch (e: any) {
    record('Technician Action: Log Time Entry Allowed', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 11. CUSTOMER PERMITTED ACTIONS
  // -------------------------------------------------------------------------
  // Customer can create a service request
  try {
    const res = await api('/api/v1/service-requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        facilityId: 'fac-1',
        title: 'Conference Room 4B AC temperature fluctuation',
        description: 'Room is heating up during afternoon meetings',
        priority: 'HIGH'
      })
    });
    record('Customer Action: Create Service Request Allowed', res.status === 201 && res.data?.data?.requestNumber, `Req: ${res.data?.data?.requestNumber}`);
  } catch (e: any) {
    record('Customer Action: Create Service Request Allowed', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 12. HORIZONTAL PRIVILEGE ESCALATION PREVENTION (Cross-Tenant Isolation)
  // -------------------------------------------------------------------------
  // Tenant 2 user attempting to view Tenant 1 Work Order wo-101
  try {
    const res = await api('/api/v1/work-orders/wo-101', {
      headers: { Authorization: `Bearer ${crossOrgToken}` }
    });
    record('Horizontal Privilege Isolation: Cross-Tenant Work Order Access Blocked', res.status === 403, `Status: ${res.status} (Expected 403 Cross-organization forbidden)`);
  } catch (e: any) {
    record('Horizontal Privilege Isolation: Cross-Tenant Work Order Access Blocked', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 13. ACCOUNT DEACTIVATION & SESSION TERMINATION
  // -------------------------------------------------------------------------
  try {
    // Deactivate user u-customer-1
    const deactRes = await api('/api/users/u-customer-1/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ active: false })
    });

    // Attempt login with deactivated user
    const loginDeact = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'facilitymgr@globalfin.com', password: 'password123' })
    });

    // Re-activate user u-customer-1 to keep system clean
    await api('/api/users/u-customer-1/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ active: true })
    });

    record('Account Deactivation & Login Block', deactRes.status === 200 && loginDeact.status === 403, `Deactivated login status: ${loginDeact.status} (Expected 403)`);
  } catch (e: any) {
    record('Account Deactivation & Login Block', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 14. PASSWORD CHANGE FLOW
  // -------------------------------------------------------------------------
  try {
    const changeRes = await api('/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        currentPassword: 'password123',
        newPassword: 'NewSecurePassword2026!'
      })
    });

    // Old token should now be rejected because sessions were invalidated
    const checkOldToken = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Login with new password
    const loginNew = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@keystone.io', password: 'NewSecurePassword2026!' })
    });

    // Revert password back to password123 for consistency
    if (loginNew.data?.data?.token) {
      await api('/api/auth/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${loginNew.data.data.token}` },
        body: JSON.stringify({
          currentPassword: 'NewSecurePassword2026!',
          newPassword: 'password123'
        })
      });
    }

    record('Password Change & Token Invalidation', changeRes.status === 200 && checkOldToken.status === 401 && loginNew.status === 200, `Status: Change ${changeRes.status}, Old token ${checkOldToken.status}, New login ${loginNew.status}`);
  } catch (e: any) {
    record('Password Change & Token Invalidation', false, e.message);
  }

  // -------------------------------------------------------------------------
  // 15. PASSWORD RESET ARCHITECTURE (Forgot & Reset)
  // -------------------------------------------------------------------------
  try {
    const forgotRes = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'dispatcher@keystone.io' })
    });
    const resetToken = forgotRes.data?.demoResetToken;

    let resetSuccess = false;
    if (resetToken) {
      const resetRes = await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetToken,
          newPassword: 'ResetDispatcher123!'
        })
      });

      // Verify login with newly reset password
      const testLogin = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'dispatcher@keystone.io', password: 'ResetDispatcher123!' })
      });

      // Reset back to original
      if (testLogin.data?.data?.token) {
        await api('/api/auth/change-password', {
          method: 'POST',
          headers: { Authorization: `Bearer ${testLogin.data.data.token}` },
          body: JSON.stringify({
            currentPassword: 'ResetDispatcher123!',
            newPassword: 'password123'
          })
        });
      }

      resetSuccess = resetRes.status === 200 && testLogin.status === 200;
    }

    record('Password Reset Flow (Token Generation & Verification)', forgotRes.status === 200 && resetSuccess, `Reset result: ${resetSuccess ? 'SUCCESS' : 'FAILED'}`);
  } catch (e: any) {
    record('Password Reset Flow (Token Generation & Verification)', false, e.message);
  }

  console.log('\n===============================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`TEST SUMMARY: ${passedCount}/${results.length} PASSED`);
  console.log('===============================================================\n');
}

runTests();
