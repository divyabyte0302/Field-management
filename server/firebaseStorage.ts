import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { WorkOrder, AuditLog, ServiceRequest } from './types';

let dbInstance: any = null;

try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as any);
  dbInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
  console.log('[Firebase] Server storage client initialized with database:', firebaseConfig.firestoreDatabaseId || '(default)');
} catch (err) {
  console.warn('[Firebase] Server storage initialization notice:', err);
}

export async function mirrorWorkOrderToFirebase(order: WorkOrder): Promise<void> {
  if (!dbInstance) return;
  try {
    const docRef = doc(dbInstance, 'work_orders', order.id);
    await setDoc(docRef, {
      id: order.id,
      organizationId: order.organizationId,
      workOrderNumber: order.workOrderNumber,
      facilityId: order.facilityId,
      facilityName: order.facilityName,
      title: order.title,
      description: order.description,
      status: order.status,
      priority: order.priority,
      category: order.category,
      assignedTechnicianId: order.assignedTechnicianId || null,
      assignedTechnicianName: order.assignedTechnicianName || null,
      customerId: order.customerId || null,
      customerName: order.customerName || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    // Non-blocking background sync
  }
}

export async function mirrorAuditLogToFirebase(log: AuditLog): Promise<void> {
  if (!dbInstance) return;
  try {
    const docRef = doc(dbInstance, 'audit_logs', log.id);
    await setDoc(docRef, {
      ...log,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    // Non-blocking background sync
  }
}

export async function mirrorServiceRequestToFirebase(req: ServiceRequest): Promise<void> {
  if (!dbInstance) return;
  try {
    const docRef = doc(dbInstance, 'service_requests', req.id);
    await setDoc(docRef, {
      ...req,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    // Non-blocking background sync
  }
}
