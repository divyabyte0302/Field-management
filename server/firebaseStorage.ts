import firebaseConfig from '../firebase-applet-config.json';
import { 
  WorkOrder, AuditLog, ServiceRequest, Customer, Facility, 
  Asset, Technician, Part, FacilityInventory, TimeEntry 
} from './types';

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';
const API_KEY = firebaseConfig.apiKey;
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

console.log(`[Dual-Storage] Cloud Firestore Storage online. Database: ${DATABASE_ID}`);

/**
 * Convert standard JS object to Firestore typed fields
 */
function toFirestoreFields(obj: any): Record<string, any> {
  const fields: Record<string, any> = {};
  if (!obj || typeof obj !== 'object') return fields;

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            if (item && typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
    }
  }
  return fields;
}

/**
 * Convert Firestore typed fields back to standard JS object
 */
export function fromFirestoreFields(fields: Record<string, any>): any {
  if (!fields) return {};
  const obj: Record<string, any> = {};

  for (const [key, valObj] of Object.entries(fields)) {
    if (valObj.stringValue !== undefined) obj[key] = valObj.stringValue;
    else if (valObj.integerValue !== undefined) obj[key] = parseInt(valObj.integerValue, 10);
    else if (valObj.doubleValue !== undefined) obj[key] = Number(valObj.doubleValue);
    else if (valObj.booleanValue !== undefined) obj[key] = Boolean(valObj.booleanValue);
    else if (valObj.nullValue !== undefined) obj[key] = null;
    else if (valObj.arrayValue?.values) {
      obj[key] = valObj.arrayValue.values.map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.doubleValue !== undefined) return Number(v.doubleValue);
        if (v.booleanValue !== undefined) return Boolean(v.booleanValue);
        if (v.mapValue?.fields) return fromFirestoreFields(v.mapValue.fields);
        return null;
      });
    } else if (valObj.mapValue?.fields) {
      obj[key] = fromFirestoreFields(valObj.mapValue.fields);
    }
  }
  return obj;
}

/**
 * Generic persistent write to Firestore collection
 */
async function saveToFirestore(collection: string, docId: string, data: any): Promise<boolean> {
  try {
    const url = `${BASE_FIRESTORE_URL}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const payload = {
      fields: toFirestoreFields({
        ...data,
        _syncedAt: new Date().toISOString(),
      }),
    };
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    // Non-blocking background error
    return false;
  }
}

/**
 * Generic persistent delete from Firestore collection
 */
async function deleteFromFirestore(collection: string, docId: string): Promise<boolean> {
  try {
    const url = `${BASE_FIRESTORE_URL}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Generic fetch document from Firestore collection
 */
export async function getFromFirestore(collection: string, docId: string): Promise<any | null> {
  try {
    const url = `${BASE_FIRESTORE_URL}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreFields(json.fields);
  } catch (err) {
    return null;
  }
}

// -------------------------------------------------------------
// DUAL STORAGE: WORK ORDERS
// -------------------------------------------------------------
export async function mirrorWorkOrderToFirebase(order: WorkOrder): Promise<void> {
  if (!order?.id) return;
  await saveToFirestore('work_orders', order.id, order);
}

export async function deleteWorkOrderFromFirebase(id: string): Promise<void> {
  if (!id) return;
  await deleteFromFirestore('work_orders', id);
}

// -------------------------------------------------------------
// DUAL STORAGE: CUSTOMERS
// -------------------------------------------------------------
export async function mirrorCustomerToFirebase(customer: Customer): Promise<void> {
  if (!customer?.id) return;
  await saveToFirestore('customers', customer.id, customer);
}

// -------------------------------------------------------------
// DUAL STORAGE: FACILITIES / SITES
// -------------------------------------------------------------
export async function mirrorFacilityToFirebase(facility: Facility): Promise<void> {
  if (!facility?.id) return;
  await saveToFirestore('facilities', facility.id, facility);
}

// -------------------------------------------------------------
// DUAL STORAGE: ASSETS
// -------------------------------------------------------------
export async function mirrorAssetToFirebase(asset: Asset): Promise<void> {
  if (!asset?.id) return;
  await saveToFirestore('assets', asset.id, asset);
}

// -------------------------------------------------------------
// DUAL STORAGE: TECHNICIANS
// -------------------------------------------------------------
export async function mirrorTechnicianToFirebase(tech: Technician): Promise<void> {
  if (!tech?.id) return;
  await saveToFirestore('technicians', tech.id, tech);
}

// -------------------------------------------------------------
// DUAL STORAGE: PARTS CATALOG & INVENTORY
// -------------------------------------------------------------
export async function mirrorPartToFirebase(part: Part): Promise<void> {
  if (!part?.id) return;
  await saveToFirestore('parts', part.id, part);
}

export async function mirrorFacilityInventoryToFirebase(inv: FacilityInventory): Promise<void> {
  if (!inv?.id) return;
  await saveToFirestore('facility_inventory', inv.id, inv);
}

// -------------------------------------------------------------
// DUAL STORAGE: TIME ENTRIES
// -------------------------------------------------------------
export async function mirrorTimeEntryToFirebase(entry: TimeEntry): Promise<void> {
  if (!entry?.id) return;
  await saveToFirestore('time_entries', entry.id, entry);
}

export async function deleteTimeEntryFromFirebase(id: string): Promise<void> {
  if (!id) return;
  await deleteFromFirestore('time_entries', id);
}

// -------------------------------------------------------------
// DUAL STORAGE: AUDIT LOGS
// -------------------------------------------------------------
export async function mirrorAuditLogToFirebase(log: AuditLog): Promise<void> {
  if (!log?.id) return;
  await saveToFirestore('audit_logs', log.id, log);
}

// -------------------------------------------------------------
// DUAL STORAGE: SERVICE REQUESTS
// -------------------------------------------------------------
export async function mirrorServiceRequestToFirebase(req: ServiceRequest): Promise<void> {
  if (!req?.id) return;
  await saveToFirestore('service_requests', req.id, req);
}

export async function deleteServiceRequestFromFirebase(id: string): Promise<void> {
  if (!id) return;
  await deleteFromFirestore('service_requests', id);
}

// -------------------------------------------------------------
// INITIAL SEED DUAL-STORAGE SYNCHRONIZER
// -------------------------------------------------------------
export async function initializeDualStorageSync(data: {
  customers: Customer[];
  facilities: Facility[];
  assets: Asset[];
  technicians: Technician[];
  parts: Part[];
  inventory: FacilityInventory[];
  workOrders: WorkOrder[];
}): Promise<void> {
  try {
    console.log('[Dual-Storage] Bootstrapping dual-storage replication across Primary Relational Database & Firebase Firestore...');
    const syncPromises: Promise<any>[] = [];

    data.customers.forEach(c => syncPromises.push(mirrorCustomerToFirebase(c)));
    data.facilities.forEach(f => syncPromises.push(mirrorFacilityToFirebase(f)));
    data.assets.forEach(a => syncPromises.push(mirrorAssetToFirebase(a)));
    data.technicians.forEach(t => syncPromises.push(mirrorTechnicianToFirebase(t)));
    data.parts.forEach(p => syncPromises.push(mirrorPartToFirebase(p)));
    data.inventory.forEach(i => syncPromises.push(mirrorFacilityInventoryToFirebase(i)));
    data.workOrders.forEach(w => syncPromises.push(mirrorWorkOrderToFirebase(w)));

    await Promise.allSettled(syncPromises);
    console.log(`[Dual-Storage] Replicated ${data.workOrders.length} work orders, ${data.customers.length} customers, ${data.facilities.length} facilities, and ${data.parts.length} parts to Firebase Firestore.`);
  } catch (err) {
    console.warn('[Dual-Storage] Initial sync notice:', err);
  }
}
