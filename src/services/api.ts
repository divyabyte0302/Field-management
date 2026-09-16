import { 
  WorkOrder, WorkOrderStatus, DashboardStats, Technician, Facility, 
  Asset, ServiceRequest, Part, RoleName, User, Customer 
} from '../types';

let authToken: string | null = localStorage.getItem('keystone_token') || null;
let refreshToken: string | null = localStorage.getItem('keystone_refresh_token') || null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAuthTokens(token: string | null, refresh: string | null = null) {
  authToken = token;
  if (token) {
    localStorage.setItem('keystone_token', token);
  } else {
    localStorage.removeItem('keystone_token');
  }

  if (refresh) {
    refreshToken = refresh;
    localStorage.setItem('keystone_refresh_token', refresh);
  } else if (refresh === null) {
    refreshToken = null;
    localStorage.removeItem('keystone_refresh_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setUnauthorizedCallback(callback: () => void) {
  onUnauthorizedCallback = callback;
}

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Check for expired token and attempt refresh
  if (res.status === 401 && refreshToken && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.data?.token) {
          setAuthTokens(refreshData.data.token, refreshData.data.refreshToken);
          headers.set('Authorization', `Bearer ${refreshData.data.token}`);
          // Retry original request
          res = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
        }
      } else {
        // Refresh token failed or expired
        setAuthTokens(null, null);
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
    } catch (err) {
      setAuthTokens(null, null);
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    if (res.status === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    const errorMessage = json.message || json.error || (Array.isArray(json.errors) ? json.errors.join(', ') : null) || `API error ${res.status}: ${res.statusText || 'Request failed'}`;
    const apiError = new Error(errorMessage);
    (apiError as any).statusCode = res.status;
    (apiError as any).details = json;
    throw apiError;
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // ---------------------------------------------------------------------------
  // AUTHENTICATION & IDENTITY
  // ---------------------------------------------------------------------------
  login: (data: { email: string; password: string }) => 
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationCode: string;
    role?: string;
  }) =>
    request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<any>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: () =>
    request<any>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getCurrentUser: () => request<User>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string) =>
    request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ---------------------------------------------------------------------------
  // USER MANAGEMENT (Admin & Super Admin)
  // ---------------------------------------------------------------------------
  getUsers: () => request<User[]>('/users'),

  updateUserStatus: (id: string, active: boolean) =>
    request<User>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

  // ---------------------------------------------------------------------------
  // DASHBOARD & TELEMETRY
  // ---------------------------------------------------------------------------
  getDashboardStats: () => request<DashboardStats>('/v1/dashboard/stats'),

  // ---------------------------------------------------------------------------
  // WORK ORDERS
  // ---------------------------------------------------------------------------
  getWorkOrders: (params: {
    query?: string;
    status?: string;
    priority?: string;
    facilityId?: string;
    technicianId?: string;
    page?: number;
    size?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') searchParams.set('priority', params.priority);
    if (params.facilityId && params.facilityId !== 'ALL') searchParams.set('facilityId', params.facilityId);
    if (params.technicianId && params.technicianId !== 'ALL') searchParams.set('technicianId', params.technicianId);
    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.size !== undefined) searchParams.set('size', String(params.size));

    return request<WorkOrder[]>(`/v1/work-orders?${searchParams.toString()}`);
  },

  getWorkOrderById: (id: string) => request<WorkOrder>(`/v1/work-orders/${id}`),
  getWorkOrder: (id: string) => request<WorkOrder>(`/v1/work-orders/${id}`),

  createWorkOrder: (data: {
    facilityId: string;
    assetId?: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    estimatedDurationHours?: number;
    assignedTechnicianId?: string;
  }) => request<WorkOrder>('/v1/work-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateWorkOrder: (id: string, data: Partial<WorkOrder>) =>
    request<WorkOrder>(`/v1/work-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWorkOrder: (id: string) =>
    request<any>(`/v1/work-orders/${id}`, {
      method: 'DELETE',
    }),

  addWorkOrderComment: (id: string, content: string) =>
    request<any>(`/v1/work-orders/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  addWorkOrderAttachment: (id: string, data: { fileName: string; url: string; caption?: string }) =>
    request<any>(`/v1/work-orders/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getWorkOrderAssignments: (id: string) =>
    request<any[]>(`/v1/work-orders/${id}/assignments`),

  transitionWorkOrder: (id: string, data: {
    targetStatus: WorkOrderStatus;
    notes?: string;
    holdReason?: string;
    rejectionReason?: string;
  }) => request<WorkOrder>(`/v1/work-orders/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  assignWorkOrder: (id: string, technicianId: string, notes?: string) => 
    request<WorkOrder>(`/v1/work-orders/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ technicianId, notes }),
    }),

  logTimeEntry: (id: string, data: {
    durationMinutes: number;
    entryType: 'TRAVEL' | 'DIAGNOSIS' | 'LABOR' | 'WAIT_PARTS';
    notes: string;
  }) => request<any>(`/v1/work-orders/${id}/time-entries`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  allocatePart: (id: string, data: { partId: string; quantity: number; notes?: string }) =>
    request<any>(`/v1/work-orders/${id}/parts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removePart: (workOrderId: string, partItemId: string) =>
    request<any>(`/v1/work-orders/${workOrderId}/parts/${partItemId}`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // TIME TRACKING & TIMERS
  // ---------------------------------------------------------------------------
  getTimeEntries: (params: {
    technicianId?: string;
    workOrderId?: string;
    isBillable?: string;
    entryType?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.technicianId && params.technicianId !== 'ALL') searchParams.set('technicianId', params.technicianId);
    if (params.workOrderId) searchParams.set('workOrderId', params.workOrderId);
    if (params.isBillable && params.isBillable !== 'ALL') searchParams.set('isBillable', params.isBillable);
    if (params.entryType && params.entryType !== 'ALL') searchParams.set('entryType', params.entryType);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    const qs = searchParams.toString();
    return request<any>(`/v1/time-entries${qs ? `?${qs}` : ''}`);
  },

  startTimer: (workOrderId: string, data: {
    technicianId?: string;
    entryType?: string;
    isBillable?: boolean;
    hourlyRate?: number;
    description?: string;
  }) => request<any>(`/v1/work-orders/${workOrderId}/timer/start`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  stopTimer: (workOrderId: string, data: {
    timeEntryId?: string;
    notes?: string;
    description?: string;
  } = {}) => request<any>(`/v1/work-orders/${workOrderId}/timer/stop`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getTechnicianActiveTimer: (technicianId: string) =>
    request<any>(`/v1/technicians/${technicianId}/active-timer`),

  deleteTimeEntry: (workOrderId: string, entryId: string) =>
    request<any>(`/v1/work-orders/${workOrderId}/time-entries/${entryId}`, {
      method: 'DELETE',
    }),

  // ---------------------------------------------------------------------------
  // INVENTORY & PARTS MANAGEMENT
  // ---------------------------------------------------------------------------
  getInventory: (params: {
    facilityId?: string;
    category?: string;
    lowStock?: boolean;
    search?: string;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.facilityId && params.facilityId !== 'ALL') searchParams.set('facilityId', params.facilityId);
    if (params.category && params.category !== 'ALL') searchParams.set('category', params.category);
    if (params.lowStock) searchParams.set('lowStock', 'true');
    if (params.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return request<any>(`/v1/inventory${qs ? `?${qs}` : ''}`);
  },

  getFacilityInventory: (facilityId: string) =>
    request<any[]>(`/v1/facilities/${facilityId}/inventory`),

  adjustInventory: (data: {
    facilityId: string;
    partId: string;
    quantityChanged: number;
    reason: string;
  }) => request<any>('/v1/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  restockInventory: (data: {
    facilityId: string;
    partId: string;
    quantity: number;
    supplierRef?: string;
    reason?: string;
  }) => request<any>('/v1/inventory/restock', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getInventoryHistory: (params: { facilityId?: string; partId?: string; changeType?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.facilityId && params.facilityId !== 'ALL') searchParams.set('facilityId', params.facilityId);
    if (params.partId && params.partId !== 'ALL') searchParams.set('partId', params.partId);
    if (params.changeType && params.changeType !== 'ALL') searchParams.set('changeType', params.changeType);
    const qs = searchParams.toString();
    return request<any[]>(`/v1/inventory/history${qs ? `?${qs}` : ''}`);
  },

  createPart: (data: Partial<Part>) =>
    request<Part>('/v1/parts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePart: (id: string, data: Partial<Part>) =>
    request<Part>(`/v1/parts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ---------------------------------------------------------------------------
  // SLA POLICIES & DASHBOARD
  // ---------------------------------------------------------------------------
  getSlaPolicies: (params: { priority?: string; facilityId?: string; customerId?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.priority && params.priority !== 'ALL') searchParams.set('priority', params.priority);
    if (params.facilityId && params.facilityId !== 'ALL') searchParams.set('facilityId', params.facilityId);
    if (params.customerId && params.customerId !== 'ALL') searchParams.set('customerId', params.customerId);
    const qs = searchParams.toString();
    return request<any[]>(`/v1/sla-policies${qs ? `?${qs}` : ''}`);
  },

  createSlaPolicy: (data: any) =>
    request<any>('/v1/sla-policies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSlaPolicy: (id: string, data: any) =>
    request<any>(`/v1/sla-policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSlaPolicy: (id: string) =>
    request<any>(`/v1/sla-policies/${id}`, {
      method: 'DELETE',
    }),

  getSlaDashboard: () => request<any>('/v1/sla/dashboard'),
  getBreachedWorkOrders: () => request<WorkOrder[]>('/v1/sla/breached'),
  getAtRiskWorkOrders: () => request<WorkOrder[]>('/v1/sla/at-risk'),

  // ---------------------------------------------------------------------------
  // MASTER DATA
  // ---------------------------------------------------------------------------
  getTechnicians: () => request<Technician[]>('/v1/technicians'),
  updateTechnicianStatus: (id: string, data: { status: string; latitude?: number; longitude?: number }) =>
    request<Technician>(`/v1/technicians/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getFacilities: () => request<Facility[]>('/v1/facilities'),
  getAssets: (facilityId?: string) => 
    request<Asset[]>(facilityId ? `/v1/assets?facilityId=${facilityId}` : '/v1/assets'),
  getParts: () => request<Part[]>('/v1/parts'),
  
  getServiceRequests: (params: { query?: string; status?: string; priority?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') searchParams.set('priority', params.priority);
    const qs = searchParams.toString();
    return request<ServiceRequest[]>(`/v1/service-requests${qs ? `?${qs}` : ''}`);
  },

  getServiceRequestById: (id: string) => request<ServiceRequest>(`/v1/service-requests/${id}`),

  createServiceRequest: (data: {
    facilityId: string;
    assetId?: string;
    title: string;
    description: string;
    priority: string;
    locationDetails?: string;
    requestedDate?: string;
  }) => request<ServiceRequest>('/v1/service-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateServiceRequest: (id: string, data: Partial<ServiceRequest>) =>
    request<ServiceRequest>(`/v1/service-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteServiceRequest: (id: string) =>
    request<any>(`/v1/service-requests/${id}`, {
      method: 'DELETE',
    }),

  addServiceRequestComment: (id: string, content: string) =>
    request<any>(`/v1/service-requests/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  addServiceRequestAttachment: (id: string, data: { fileName: string; url: string; caption?: string }) =>
    request<any>(`/v1/service-requests/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  convertServiceRequest: (id: string, data?: {
    priority?: string;
    category?: string;
    assignedTechnicianId?: string;
    dueDate?: string;
  }) => request<WorkOrder>(`/v1/service-requests/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  }),

  convertServiceRequestToWorkOrder: (id: string, data?: any) =>
    request<WorkOrder>(`/v1/service-requests/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  // Work Order Comments & Attachments
  getWorkOrderComments: (workOrderId: string) =>
    request<any[]>(`/v1/work-orders/${workOrderId}/comments`),

  getWorkOrderAttachments: (workOrderId: string) =>
    request<any[]>(`/v1/work-orders/${workOrderId}/attachments`),

  // Notifications API
  getNotifications: (unreadOnly: boolean = false) =>
    request<any[]>(`/v1/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),

  getUnreadNotificationCount: () =>
    request<{ count: number }>('/v1/notifications/unread-count'),

  markNotificationRead: (id: string) =>
    request<any>(`/v1/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request<any>('/v1/notifications/mark-all-read', {
      method: 'POST',
    }),

  createNotification: (data: any) =>
    request<any>('/v1/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getArchitecture: () => request<any>('/v1/architecture'),

  // Technicians, Facilities, Assets, Customers, Reports
  getTechnicianById: (id: string) => request<any>(`/v1/technicians/${id}`),
  getFacilityById: (id: string) => request<any>(`/v1/facilities/${id}`),
  getAssetById: (id: string) => request<any>(`/v1/assets/${id}`),
  getCustomers: () => request<Customer[]>('/v1/customers'),
  getCustomerById: (id: string) => request<any>(`/v1/customers/${id}`),
  getReports: () => request<any>('/v1/reports'),
  getAuditLogs: (params: { query?: string; action?: string; role?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.query) sp.set('query', params.query);
    if (params.action && params.action !== 'ALL') sp.set('action', params.action);
    if (params.role && params.role !== 'ALL') sp.set('role', params.role);
    const qs = sp.toString();
    return request<any[]>(`/v1/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
