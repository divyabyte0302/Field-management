import firebaseConfig from '../firebase-applet-config.json';
import { getFromFirestore } from '../server/firebaseStorage';

const BASE_URL = 'http://localhost:3000/api';

async function verifyDualStorage() {
  console.log('=== VERIFYING DUAL STORAGE: PRIMARY DATABASE + FIREBASE FIRESTORE ===\n');

  console.log(`1. Target Database: ${firebaseConfig.firestoreDatabaseId}`);

  // 2. Login to primary backend API
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@keystone.io', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;

  if (!token) throw new Error('Login failed');
  console.log('2. Authenticated with Primary Relational Database API');

  // 3. Create a work order via API
  console.log('3. Creating test work order via API (Primary Database)...');
  const createRes = await fetch(`${BASE_URL}/work-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      facilityId: 'fac-1',
      title: 'Dual-Storage Replication Verification Order',
      description: 'Testing simultaneous persistence in Primary Database and Firebase Firestore',
      priority: 'HIGH',
      category: 'PREVENTIVE_MAINTENANCE',
    }),
  });
  const createdWo = (await createRes.json()).data;
  console.log(`   Work Order created: ${createdWo.id} (${createdWo.workOrderNumber})`);

  // 4. Verify in Primary Database
  const getFromApi = await fetch(`${BASE_URL}/work-orders/${createdWo.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const primaryOrder = (await getFromApi.json()).data;
  console.log(`4. Verified in Primary Database: Status = ${primaryOrder.status}, Title = "${primaryOrder.title}"`);

  // Wait 1 second for non-blocking network sync
  await new Promise(r => setTimeout(r, 1000));

  // 5. Verify directly in Firebase Firestore
  console.log('5. Querying Firebase Firestore directly for replicated document...');
  const firestoreData = await getFromFirestore('work_orders', createdWo.id);

  if (!firestoreData || !firestoreData.workOrderNumber) {
    console.error('FAILED: Document not found in Firestore!');
    process.exit(1);
  }

  console.log(`   Document found in Firestore! ID: ${createdWo.id}`);
  console.log(`   Firestore Title: "${firestoreData.title}"`);
  console.log(`   Firestore Work Order Number: ${firestoreData.workOrderNumber}`);
  console.log(`   Firestore Priority: ${firestoreData.priority}`);
  console.log(`   Firestore Status: ${firestoreData.status}`);

  console.log('\n=== DUAL STORAGE VERIFICATION PASSED: Stored in BOTH places successfully! ===\n');
}

verifyDualStorage().catch(err => {
  console.error('Dual storage verification error:', err);
  process.exit(1);
});
