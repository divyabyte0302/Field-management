import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, setDoc, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkOrder, ServiceRequest, AuditLog } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Critical constraint: Validate connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connected to Firestore persistent storage');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('[Firebase] Connection offline. Check Firebase configuration.');
      return false;
    }
    // Document not existing is normal and confirms live server communication
    return true;
  }
}

// Initial connection test
testFirestoreConnection().catch(() => {});

// Firestore Storage Sync Helpers
export async function saveWorkOrderToFirestore(workOrder: WorkOrder): Promise<void> {
  try {
    const docRef = doc(db, 'work_orders', workOrder.id);
    await setDoc(docRef, {
      ...workOrder,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Non-blocking sync error for WorkOrder:', err);
  }
}

export async function saveAuditLogToFirestore(auditLog: AuditLog): Promise<void> {
  try {
    const docRef = doc(db, 'audit_logs', auditLog.id);
    await setDoc(docRef, {
      ...auditLog,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Non-blocking sync error for AuditLog:', err);
  }
}

export async function saveServiceRequestToFirestore(request: ServiceRequest): Promise<void> {
  try {
    const docRef = doc(db, 'service_requests', request.id);
    await setDoc(docRef, {
      ...request,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Non-blocking sync error for ServiceRequest:', err);
  }
}
