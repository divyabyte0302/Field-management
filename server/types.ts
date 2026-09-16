export type RoleName = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'DISPATCHER' 
  | 'TECHNICIAN' 
  | 'CUSTOMER';

export type WorkOrderStatus = 
  | 'NEW' 
  | 'TRIAGED' 
  | 'ASSIGNED' 
  | 'ACCEPTED' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'VERIFIED' 
  | 'CLOSED';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ServiceRequestStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'COMPLETED';

export type SlaEscalationAction = 'NOTIFY_DISPATCHER' | 'ESCALATE_SUPERVISOR' | 'PAGE_ONCALL' | 'FLAG_CRITICAL';

export interface SlaEscalationRule {
  id: string;
  triggerPercentage: number; // e.g., 50, 75, 90 (%)
  action: SlaEscalationAction;
  description: string;
}

export interface SlaPolicy {
  id: string;
  organizationId: string;
  name: string;
  priority: Priority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  customerId?: string;
  customerName?: string;
  facilityId?: string;
  facilityName?: string;
  category?: string;
  businessHoursOnly?: boolean; // 8 AM to 6 PM Mon-Fri
  escalationRules: SlaEscalationRule[];
  createdAt: string;
  updatedAt: string;
}

export type TechnicianStatus = 'AVAILABLE' | 'ON_SITE' | 'IN_TRANSIT' | 'OFF_DUTY';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
  isActive: boolean;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  tier: 'ENTERPRISE' | 'PREMIUM' | 'STANDARD';
  slaTier: string;
  primaryFacilityId: string;
  primaryFacilityName: string;
  activeContract: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  openTicketsCount: number;
  totalSpentYtd: number;
  address: string;
  city?: string;
  state?: string;
}

export interface Facility {
  id: string;
  organizationId: string;
  customerId?: string;
  name: string;
  code: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  totalAssetsCount: number;
}

export interface Asset {
  id: string;
  organizationId: string;
  facilityId: string;
  tagNumber: string;
  name: string;
  category: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE' | 'DECOMMISSIONED';
  criticality: Priority;
  locationDetails: string;
}

export interface Technician {
  id: string;
  userId: string;
  organizationId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  certifications: string[];
  hourlyRate: number;
  status: TechnicianStatus;
  currentAssignedCount: number;
  lat: number;
  lng: number;
  avatarUrl?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
}

export interface Sla {
  id: string;
  organizationId: string;
  name: string;
  priority: Priority;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
}

export interface Comment {
  id: string;
  entityId: string;
  entityType: 'WORK_ORDER' | 'SERVICE_REQUEST';
  authorId: string;
  authorName: string;
  authorRole: RoleName;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  entityId: string;
  entityType: 'WORK_ORDER' | 'SERVICE_REQUEST';
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedBy: string;
  uploadedByRole: RoleName;
  createdAt: string;
  caption?: string;
}

export interface AssignmentRecord {
  id: string;
  workOrderId: string;
  technicianId: string;
  technicianName: string;
  assignedBy: string;
  assignedByRole: RoleName;
  assignedAt: string;
  notes?: string;
  status: 'ACTIVE' | 'REASSIGNED' | 'COMPLETED';
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitPrice: number;
  totalPrice: number;
  facilityId?: string;
  facilityName?: string;
  addedAt?: string;
  addedBy?: string;
}

export interface TimeEntry {
  id: string;
  workOrderId: string;
  workOrderNumber?: string;
  technicianId: string;
  technicianName: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  entryType: 'TRAVEL' | 'DIAGNOSIS' | 'LABOR' | 'WAIT_PARTS';
  notes?: string;
  description?: string;
  isBillable: boolean;
  hourlyRate: number;
  laborCost: number;
  isRunning?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  entityName: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedByRole: RoleName;
  timestamp: string;
  previousState?: string;
  newState?: string;
  notes?: string;
}

export interface WorkOrder {
  id: string;
  organizationId: string;
  workOrderNumber: string;
  serviceRequestId?: string;
  facilityId: string;
  facilityName: string;
  customerId?: string;
  customerName?: string;
  assetId?: string;
  assetName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: Priority;
  category: string;
  estimatedDurationHours: number;
  actualDurationHours: number;
  slaPolicyId?: string;
  slaPolicyName?: string;
  slaResponseDeadline: string;
  slaResolutionDeadline: string;
  slaStatus?: SlaStatus;
  slaRemainingMinutes?: number;
  slaOverdueDurationMinutes?: number;
  dueDate?: string;
  respondedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
  isSlaResponseBreached: boolean;
  isSlaResolutionBreached: boolean;
  totalLaborHours?: number;
  billableLaborHours?: number;
  totalLaborCost?: number;
  totalPartsCost?: number;
  totalPartsPrice?: number;
  totalCost?: number;
  resolutionNotes?: string;
  holdReason?: string;
  rejectionReason?: string;
  notes?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  permittedNextStates?: WorkOrderStatus[];
  parts: WorkOrderPart[];
  timeEntries: TimeEntry[];
  auditLogs: AuditLog[];
  comments?: Comment[];
  attachments?: Attachment[];
  assignmentHistory?: AssignmentRecord[];
}

export interface ServiceRequest {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  facilityId: string;
  facilityName: string;
  assetId?: string;
  assetName?: string;
  requestNumber: string;
  title: string;
  description: string;
  priority: Priority;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  requestedDate?: string;
  createdAt: string;
  convertedWorkOrderId?: string;
  requesterEmail?: string;
  requesterName?: string;
  locationDetails?: string;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface Part {
  id: string;
  organizationId: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  isActive: boolean;
  stockOnHand: number;
  reorderLevel: number;
  minStock?: number;
}

export interface FacilityInventory {
  id: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  binLocation: string;
  stockOnHand: number;
  reservedQuantity: number;
  minStock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  lastRestockedAt?: string;
  updatedAt: string;
}

export interface InventoryHistory {
  id: string;
  organizationId: string;
  facilityId: string;
  facilityName: string;
  partId: string;
  partNumber: string;
  partName: string;
  changeType: 'CONSUMPTION' | 'RESTOCK' | 'ADJUSTMENT' | 'RESTORATION' | 'CYCLE_COUNT';
  quantityChanged: number;
  previousStock: number;
  newStock: number;
  referenceId?: string; // Work order ID or adjustment ref
  performedBy: string;
  performedByRole: RoleName;
  reason: string;
  timestamp: string;
}

export interface SlaDashboardStats {
  complianceRate: number;
  totalOrders: number;
  breachedCount: number;
  atRiskCount: number;
  onTrackCount: number;
  completedOnTimeCount: number;
  averageResponseMinutes: number;
  averageResolutionMinutes: number;
  responseSlaComplianceRate: number;
  resolutionSlaComplianceRate: number;
  complianceByPriority: Record<Priority, { total: number; compliant: number; breached: number; rate: number }>;
  complianceByFacility: Record<string, { facilityName: string; total: number; compliant: number; breached: number; rate: number }>;
}

export type NotificationType = 
  | 'NEW_SERVICE_REQUEST'
  | 'WORK_ORDER_ASSIGNED'
  | 'ASSIGNMENT_CHANGED'
  | 'STATUS_CHANGED'
  | 'SLA_AT_RISK'
  | 'SLA_BREACHED'
  | 'LOW_INVENTORY'
  | 'WORK_COMPLETED'
  | 'CUSTOMER_VERIFIED';

export interface AppNotification {
  id: string;
  organizationId: string;
  userId?: string;
  targetRoles?: RoleName[];
  type: NotificationType;
  title: string;
  message: string;
  entityType: 'WORK_ORDER' | 'SERVICE_REQUEST' | 'INVENTORY' | 'SLA';
  entityId: string;
  read: boolean;
  createdAt: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface DashboardStats {
  totalOrders: number;
  openOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  overdueOrders: number;
  slaAtRiskCount: number;
  slaBreachedCount: number;
  unassignedOrders: number;
  availableTechnicians: number;
  lowInventoryCount: number;
  slaComplianceRate: number;
  technicianUtilizationRate: number;
  openServiceRequests: number;
  totalLaborHours: number;
  totalPartsCost: number;
  totalLaborCost: number;
  totalServiceCost: number;
  activeOrders: number;
  criticalOrders: number;
  statusCounts: Record<WorkOrderStatus, number>;
  priorityCounts: Record<Priority, number>;
  techStats: {
    total: number;
    available: number;
    onSite: number;
    inTransit: number;
    offDuty: number;
  };
  charts: {
    statusDistribution: { status: WorkOrderStatus; label: string; count: number; color: string }[];
    priorityDistribution: { priority: Priority; label: string; count: number; color: string }[];
    facilityDistribution?: { facilityName: string; total: number; active: number; completed: number }[];
    ordersOverTime: { date: string; created: number; completed: number }[];
    slaPerformance: { name: string; count: number; percentage: number; color: string }[];
    technicianWorkload?: { name: string; activeJobs: number; completedJobs: number; hoursLogged: number; status: TechnicianStatus }[];
  };
}
