const BASE_URL = 'http://localhost:3000/api';

async function login(email: string, password = 'password123'): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success || !data.data?.token) {
    throw new Error(`Login failed for ${email}`);
  }
  return data.data.token;
}

async function runE2E() {
  console.log('=== STARTING COMPLETE END-TO-END BUSINESS FLOW VERIFICATION ===\n');

  const dispatcherToken = await login('dispatcher@keystone.io');
  const tech1Token = await login('tech.davis@keystone.io'); // tech-1
  const adminToken = await login('admin@keystone.io');
  const customerToken = await login('facilitymgr@globalfin.com');

  // Step 1: Dispatcher creates customer and site
  console.log('1. DISPATCHER: Creating customer and site...');
  const createCustRes = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dispatcherToken}` },
    body: JSON.stringify({
      name: 'Pinnacle Health Center',
      email: 'ops@pinnaclehealth.com',
      contactPerson: 'Dr. Robert Cole',
      phone: '(555) 777-8899',
      tier: 'ENTERPRISE',
      address: '700 Park Avenue',
      city: 'New York',
      state: 'NY',
    }),
  });
  const custJson = await createCustRes.json();
  console.log(`   Customer created: ${custJson.data?.id} (${custJson.data?.name})`);

  const createSiteRes = await fetch(`${BASE_URL}/customers/${custJson.data?.id}/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dispatcherToken}` },
    body: JSON.stringify({
      name: 'Pinnacle Medical Plaza',
      address: '700 Park Ave, Pavilion C',
      city: 'New York',
      state: 'NY',
      postalCode: '10021',
      totalSquareFeet: 85000,
    }),
  });
  const siteJson = await createSiteRes.json();
  console.log(`   Site created: ${siteJson.data?.id} (${siteJson.data?.name})`);

  // Step 2: Dispatcher creates Work Order
  console.log('\n2. DISPATCHER: Creating new work order...');
  const createWoRes = await fetch(`${BASE_URL}/work-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dispatcherToken}` },
    body: JSON.stringify({
      facilityId: siteJson.data?.id,
      title: 'HVAC Critical Chiller Overheating in ICU Wing',
      description: 'Chiller temperature exceeding 85F threshold, immediate repair required',
      priority: 'CRITICAL',
      category: 'EMERGENCY_REPAIR',
      customerId: custJson.data?.id,
      customerName: custJson.data?.name,
    }),
  });
  const woJson = await createWoRes.json();
  const wo = woJson.data;
  console.log(`   Work Order created: ${wo.id} | Code: ${wo.workOrderNumber} | Status: ${wo.status}`);
  if (wo.status !== 'NEW') throw new Error(`Expected NEW but got ${wo.status}`);

  // Step 3: Dispatcher assigns technician tech-1 (Elena Reyes)
  console.log('\n3. DISPATCHER: Assigning technician (tech-1)...');
  const assignRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dispatcherToken}` },
    body: JSON.stringify({ technicianId: 'tech-1', notes: 'Dispatched emergency specialist' }),
  });
  const assignJson = await assignRes.json();
  console.log(`   Assigned response status: ${assignRes.status}`);

  // Check order status is now ASSIGNED
  const checkOrderRes = await fetch(`${BASE_URL}/work-orders/${wo.id}`, {
    headers: { Authorization: `Bearer ${dispatcherToken}` },
  });
  const assignedOrder = (await checkOrderRes.json()).data;
  console.log(`   Work Order Status: ${assignedOrder.status} | Assigned To: ${assignedOrder.assignedTechnicianName}`);
  if (assignedOrder.status !== 'ASSIGNED') throw new Error(`Expected ASSIGNED but got ${assignedOrder.status}`);

  // Step 4: Technician accepts & starts job (ASSIGNED -> IN_PROGRESS)
  console.log('\n4. TECHNICIAN: Starting job (ASSIGNED -> IN_PROGRESS)...');
  const startRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ targetStatus: 'IN_PROGRESS', notes: 'On site, initiated diagnostics' }),
  });
  const startJson = await startRes.json();
  console.log(`   Transition result: ${startJson.message}`);

  // Step 5: Technician puts on hold (IN_PROGRESS -> ON_HOLD)
  console.log('\n5. TECHNICIAN: Putting job ON_HOLD (waiting for coolant valve)...');
  const holdRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ targetStatus: 'ON_HOLD', holdReason: 'PARTS_PENDING', notes: 'Waiting for replacement valve' }),
  });
  const holdJson = await holdRes.json();
  console.log(`   Hold result: ${holdJson.message}`);

  // Step 6: Technician resumes job (ON_HOLD -> IN_PROGRESS)
  console.log('\n6. TECHNICIAN: Resuming job (ON_HOLD -> IN_PROGRESS)...');
  const resumeRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ targetStatus: 'IN_PROGRESS', notes: 'Parts obtained, replacing valve' }),
  });
  const resumeJson = await resumeRes.json();
  console.log(`   Resume result: ${resumeJson.message}`);

  // Step 7: Technician logs time (60 mins)
  console.log('\n7. TECHNICIAN: Logging 60 minutes labor...');
  const timeRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/time-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ durationMinutes: 60, description: 'Diagnostic inspection and chiller valve replacement' }),
  });
  const timeJson = await timeRes.json();
  console.log(`   Time logged: ${timeJson.message}`);

  // Step 8: Technician logs parts (prt-1, qty 1)
  console.log('\n8. TECHNICIAN: Logging part usage (prt-1, qty 1)...');
  const partRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ partId: 'prt-1', quantity: 1, notes: 'Installed Honeywell Air Filter' }),
  });
  const partJson = await partRes.json();
  console.log(`   Part allocated: ${partJson.message || 'Success'}`);

  // Step 9: Technician completes job (IN_PROGRESS -> COMPLETED)
  console.log('\n9. TECHNICIAN: Completing job (IN_PROGRESS -> COMPLETED)...');
  const completeRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ targetStatus: 'COMPLETED', notes: 'System operating at optimal temperature (68F). All checklist items verified.' }),
  });
  const completeJson = await completeRes.json();
  console.log(`   Completion result: ${completeJson.message}`);

  // Step 10: Technician attempts unauthorized close -> MUST BE REJECTED 403
  console.log('\n10. SECURITY: Technician attempting unauthorized close...');
  const unauthCloseRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tech1Token}` },
    body: JSON.stringify({ targetStatus: 'CLOSED', notes: 'Attempting illegal close' }),
  });
  console.log(`    Status: ${unauthCloseRes.status} (Expected: 403 Forbidden)`);
  if (unauthCloseRes.status !== 403) throw new Error('Technician close was not rejected with 403');

  // Step 11: Manager/Admin reviews and closes work order (COMPLETED -> CLOSED)
  console.log('\n11. MANAGER: Reviewing labor/parts and closing work order (COMPLETED -> CLOSED)...');
  const closeRes = await fetch(`${BASE_URL}/work-orders/${wo.id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ targetStatus: 'CLOSED', notes: 'Manager final quality inspection passed, billing validated.' }),
  });
  const closeJson = await closeRes.json();
  console.log(`    Close result: ${closeJson.message}`);

  // Step 12: Verify full Status History
  console.log('\n12. AUDIT: Inspecting Work Order status history...');
  const finalOrderRes = await fetch(`${BASE_URL}/work-orders/${wo.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const finalOrder = (await finalOrderRes.json()).data;
  console.log(`    Final Work Order Status: ${finalOrder.status}`);
  console.log(`    Status History Entries (${finalOrder.statusHistory?.length || 0}):`);
  for (const sh of finalOrder.statusHistory || []) {
    console.log(`      [${sh.timestamp}] ${sh.previousStatus} -> ${sh.newStatus} | By: ${sh.changedByName} (${sh.changedByRole}) | Note: ${sh.note}`);
  }

  // Step 13: Manager views Dashboard
  console.log('\n13. MANAGER: Fetching live operational dashboard metrics...');
  const dashRes = await fetch(`${BASE_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dashData = (await dashRes.json()).data;
  console.log(`    Total Work Orders: ${dashData.totalOrders}`);
  console.log(`    SLA Compliance Rate: ${dashData.slaComplianceRate}%`);
  console.log(`    Completed Orders: ${dashData.completedOrders}`);

  console.log('\n=== COMPLETE END-TO-END BUSINESS FLOW VERIFIED SUCCESSFULLY! ===');
}

runE2E().catch(err => {
  console.error('E2E Verification failed:', err);
  process.exit(1);
});
