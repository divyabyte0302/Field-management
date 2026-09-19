import { 
  User, WorkOrder, DashboardStats, Technician, Facility, Asset, 
  ServiceRequest, Part, SlaPolicy, AppNotification, Customer, WorkOrderStatus, RoleName, Priority 
} from '../types';

// In-memory / LocalStorage client fallback store
const DEMO_USERS: Record<string, User> = {
  'admin@keystone.io': {
    id: 'u-admin-1',
    organizationId: 'org-apex-1',
    email: 'admin@keystone.io',
    firstName: 'Michael',
    lastName: 'Scott',
    roles: ['ADMIN'],
    isActive: true,
  },
  'dispatcher@keystone.io': {
    id: 'u-dispatcher-1',
    organizationId: 'org-apex-1',
    email: 'dispatcher@keystone.io',
    firstName: 'Marcus',
    lastName: 'Chen',
    roles: ['DISPATCHER'],
    isActive: true,
  },
  'superadmin@keystone.io': {
    id: 'u-super-1',
    organizationId: 'org-apex-1',
    email: 'superadmin@keystone.io',
    firstName: 'Sarah',
    lastName: 'Vance',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    isActive: true,
  },
  'tech@keystone.io': {
    id: 'u-tech-1',
    organizationId: 'org-apex-1',
    email: 'tech.davis@keystone.io',
    firstName: 'Elena',
    lastName: 'Reyes',
    roles: ['TECHNICIAN'],
    isActive: true,
  },
  'tech.davis@keystone.io': {
    id: 'u-tech-1',
    organizationId: 'org-apex-1',
    email: 'tech.davis@keystone.io',
    firstName: 'Elena',
    lastName: 'Reyes',
    roles: ['TECHNICIAN'],
    isActive: true,
  },
  'customer@keystone.io': {
    id: 'u-customer-1',
    organizationId: 'org-apex-1',
    email: 'facilitymgr@globalfin.com',
    firstName: 'David',
    lastName: 'Kim',
    roles: ['CUSTOMER'],
    isActive: true,
  },
  'facilitymgr@globalfin.com': {
    id: 'u-customer-1',
    organizationId: 'org-apex-1',
    email: 'facilitymgr@globalfin.com',
    firstName: 'David',
    lastName: 'Kim',
    roles: ['CUSTOMER'],
    isActive: true,
  },
};

export function clientFallbackLogin(email: string, password: string): any {
  const cleanEmail = email.trim().toLowerCase();
  
  // Check demo users
  let user = DEMO_USERS[cleanEmail];
  
  // Check locally registered users
  if (!user) {
    try {
      const regRaw = localStorage.getItem('keystone_registered_users');
      if (regRaw) {
        const regUsers: User[] = JSON.parse(regRaw);
        user = regUsers.find(u => u.email.toLowerCase() === cleanEmail);
      }
    } catch (e) {
      // Ignore parse error
    }
  }

  // Check alias mappings
  if (!user) {
    const aliases: Record<string, string> = {
      'admin@apexservices.com': 'admin@keystone.io',
      'dispatcher@apexservices.com': 'dispatcher@keystone.io',
      'tech@apexservices.com': 'tech@keystone.io',
      'technician@keystone.io': 'tech@keystone.io',
      'customer@acme.com': 'customer@keystone.io',
    };
    const target = aliases[cleanEmail];
    if (target && DEMO_USERS[target]) {
      user = DEMO_USERS[target];
    }
  }

  if (!user) {
    // If not found in known demo list, allow login as standard role based on email pattern
    if (cleanEmail.includes('admin')) {
      user = {
        id: `u-${Date.now()}`,
        organizationId: 'org-apex-1',
        email: cleanEmail,
        firstName: cleanEmail.split('@')[0],
        lastName: 'Admin',
        roles: ['ADMIN'],
        isActive: true,
      };
    } else if (cleanEmail.includes('tech')) {
      user = {
        id: `u-${Date.now()}`,
        organizationId: 'org-apex-1',
        email: cleanEmail,
        firstName: cleanEmail.split('@')[0],
        lastName: 'Tech',
        roles: ['TECHNICIAN'],
        isActive: true,
      };
    } else if (cleanEmail.includes('dispatcher')) {
      user = {
        id: `u-${Date.now()}`,
        organizationId: 'org-apex-1',
        email: cleanEmail,
        firstName: cleanEmail.split('@')[0],
        lastName: 'Dispatcher',
        roles: ['DISPATCHER'],
        isActive: true,
      };
    } else {
      user = {
        id: `u-${Date.now()}`,
        organizationId: 'org-apex-1',
        email: cleanEmail,
        firstName: cleanEmail.split('@')[0],
        lastName: 'User',
        roles: ['CUSTOMER'],
        isActive: true,
      };
    }
  }

  const token = `keystone_client_jwt_${user.id}_${Date.now()}`;
  localStorage.setItem('keystone_user', JSON.stringify(user));
  
  return {
    success: true,
    statusCode: 200,
    message: 'Authentication successful (Client Session)',
    data: {
      token,
      accessToken: token,
      refreshToken: token,
      tokenType: 'Bearer',
      expiresIn: '7d',
      user,
    },
    token,
    accessToken: token,
    user,
  };
}

export function clientFallbackGetCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem('keystone_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEMO_USERS['dispatcher@keystone.io'];
}

export function clientFallbackRegister(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationCode?: string;
  role?: string;
}): any {
  const newUser: User = {
    id: `u-reg-${Date.now()}`,
    organizationId: data.organizationCode ? `org-${data.organizationCode.toLowerCase()}` : 'org-apex-1',
    email: data.email.trim().toLowerCase(),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    roles: [(data.role?.toUpperCase() as RoleName) || 'CUSTOMER'],
    isActive: true,
  };

  try {
    const existingRaw = localStorage.getItem('keystone_registered_users');
    const existing: User[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push(newUser);
    localStorage.setItem('keystone_registered_users', JSON.stringify(existing));
  } catch (e) {}

  return clientFallbackLogin(data.email, data.password);
}

// Fallback seed work orders for static hosting
export const FALLBACK_SEED_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo-101',
    workOrderNumber: 'WO-2026-0881',
    organizationId: 'org-apex-1',
    facilityId: 'fac-1',
    facilityName: 'Apex Tower Manhattan',
    assetId: 'ast-1',
    assetName: 'Main Chiller Centrifugal Unit 1',
    customerId: 'cust-1',
    customerName: 'Global Financial Corp',
    title: 'Chiller Compressor Low Suction Pressure Warning',
    description: 'BMS alarm indicated low suction pressure on chiller unit 1 compressor circuit B. Inspect expansion valve and refrigerant charge.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    category: 'HVAC',
    assignedTechnicianId: 'tech-1',
    assignedTechnicianName: 'Marcus Davis',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    slaResponseDeadline: new Date(Date.now() + 3600000 * 1).toISOString(),
    slaResolutionDeadline: new Date(Date.now() + 3600000 * 8).toISOString(),
    slaStatus: 'ON_TRACK',
    slaPolicyId: 'sla-pol-2',
    slaPolicyName: 'Standard High Commercial SLA',
    slaRemainingMinutes: 480,
    slaOverdueDurationMinutes: 0,
    isSlaResponseBreached: false,
    isSlaResolutionBreached: false,
    estimatedDurationHours: 4.0,
    actualDurationHours: 2.0,
    parts: [
      {
        id: 'wop-1',
        workOrderId: 'wo-101',
        partId: 'prt-1',
        partNumber: 'VLV-EXP-440',
        partName: 'Electronic Thermal Expansion Valve 440A',
        quantity: 1,
        unitCost: 340,
        totalCost: 340,
        unitPrice: 380,
        totalPrice: 380,
      }
    ],
    timeEntries: [
      {
        id: 'te-1',
        workOrderId: 'wo-101',
        technicianId: 'tech-1',
        technicianName: 'Marcus Davis',
        startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
        durationMinutes: 120,
        entryType: 'LABOR',
        isBillable: true,
        hourlyRate: 125,
        laborCost: 250,
        notes: 'Initial diagnostics completed. Replacement valve installed.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      }
    ],
    comments: [
      {
        id: 'comm-1',
        entityId: 'wo-101',
        entityType: 'WORK_ORDER',
        authorId: 'u-tech-1',
        authorName: 'Elena Reyes',
        authorRole: 'TECHNICIAN',
        content: 'Valve replaced. Calibrating sensor parameters.',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      }
    ],
    attachments: [],
    auditLogs: [],
    assignmentHistory: [
      {
        id: 'asg-1',
        workOrderId: 'wo-101',
        technicianId: 'tech-1',
        technicianName: 'Marcus Davis',
        assignedBy: 'Marcus Chen',
        assignedByRole: 'DISPATCHER',
        assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        notes: 'Assigned for priority HVAC dispatch.',
        status: 'ACTIVE',
      }
    ],
    statusHistory: [
      {
        id: 'sh-101-1',
        workOrderId: 'wo-101',
        previousStatus: 'NEW',
        newStatus: 'ASSIGNED',
        changedById: 'usr-dispatcher-1',
        changedByName: 'Marcus Chen',
        changedByRole: 'DISPATCHER',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        note: 'Assigned to Marcus Davis',
      },
      {
        id: 'sh-101-2',
        workOrderId: 'wo-101',
        previousStatus: 'ASSIGNED',
        newStatus: 'IN_PROGRESS',
        changedById: 'u-tech-1',
        changedByName: 'Marcus Davis',
        changedByRole: 'TECHNICIAN',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        note: 'Technician on site',
      }
    ],
    permittedNextStates: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  },
  {
    id: 'wo-102',
    workOrderNumber: 'WO-2026-0882',
    organizationId: 'org-apex-1',
    facilityId: 'fac-1',
    facilityName: 'Apex Tower Manhattan',
    assetId: 'ast-2',
    assetName: 'Main Switchgear Busway 480V',
    customerId: 'cust-1',
    customerName: 'Global Financial Corp',
    title: 'Thermal Imaging Anomaly on 480V Busway Feed 3',
    description: 'Routine infrared scan showed hot spot of 78°C on phase B connector bolt. Torque verification and thermal re-scan required.',
    priority: 'CRITICAL',
    status: 'ASSIGNED',
    category: 'ELECTRICAL',
    assignedTechnicianId: 'tech-2',
    assignedTechnicianName: 'Jamal Miller',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    slaResponseDeadline: new Date(Date.now() + 3600000 * 0.5).toISOString(),
    slaResolutionDeadline: new Date(Date.now() + 3600000 * 3).toISOString(),
    slaStatus: 'AT_RISK',
    slaPolicyId: 'sla-pol-1',
    slaPolicyName: 'Emergency Critical SLA (2h Response)',
    slaRemainingMinutes: 45,
    slaOverdueDurationMinutes: 0,
    isSlaResponseBreached: false,
    isSlaResolutionBreached: false,
    estimatedDurationHours: 3.0,
    actualDurationHours: 0,
    parts: [],
    timeEntries: [],
    comments: [],
    attachments: [],
    auditLogs: [],
    assignmentHistory: [
      {
        id: 'asg-2',
        workOrderId: 'wo-102',
        technicianId: 'tech-2',
        technicianName: 'Jamal Miller',
        assignedBy: 'Marcus Chen',
        assignedByRole: 'DISPATCHER',
        assignedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        notes: 'Critical electrical dispatch.',
        status: 'ACTIVE',
      }
    ],
    statusHistory: [
      {
        id: 'sh-102-1',
        workOrderId: 'wo-102',
        previousStatus: 'NEW',
        newStatus: 'ASSIGNED',
        changedById: 'usr-dispatcher-1',
        changedByName: 'Marcus Chen',
        changedByRole: 'DISPATCHER',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        note: 'Assigned to Jamal Miller',
      }
    ],
    permittedNextStates: ['IN_PROGRESS', 'CANCELLED'],
  },
  {
    id: 'wo-103',
    workOrderNumber: 'WO-2026-0883',
    organizationId: 'org-apex-1',
    facilityId: 'fac-2',
    facilityName: 'Silicon Valley Innovation Hub',
    assetId: 'ast-3',
    assetName: 'Data Center Primary Glycol Loop',
    customerId: 'cust-2',
    customerName: 'Nexis Cloud Systems',
    title: 'Glycol Pump 2 Seal Leakage & Vibration',
    description: 'Mechanical seal dripping at 12 drops/min. Replace mechanical seal and check bearing alignment.',
    priority: 'MEDIUM',
    status: 'NEW',
    category: 'PLUMBING',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    slaResponseDeadline: new Date(Date.now() + 3600000 * 4).toISOString(),
    slaResolutionDeadline: new Date(Date.now() + 3600000 * 24).toISOString(),
    slaStatus: 'ON_TRACK',
    slaPolicyId: 'sla-pol-3',
    slaPolicyName: 'Standard Commercial Plumbing SLA',
    slaRemainingMinutes: 1400,
    slaOverdueDurationMinutes: 0,
    isSlaResponseBreached: false,
    isSlaResolutionBreached: false,
    estimatedDurationHours: 3.5,
    actualDurationHours: 0,
    parts: [],
    timeEntries: [],
    comments: [],
    attachments: [],
    auditLogs: [],
    assignmentHistory: [],
    statusHistory: [
      {
        id: 'sh-103-1',
        workOrderId: 'wo-103',
        previousStatus: 'NEW',
        newStatus: 'NEW',
        changedById: 'usr-dispatcher-1',
        changedByName: 'Marcus Chen',
        changedByRole: 'DISPATCHER',
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        note: 'Created work order',
      }
    ],
    permittedNextStates: ['ASSIGNED', 'CANCELLED'],
  }
];

export function getFallbackWorkOrders(): WorkOrder[] {
  try {
    const raw = localStorage.getItem('keystone_work_orders');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_WORK_ORDERS;
}

export function saveFallbackWorkOrders(orders: WorkOrder[]) {
  try {
    localStorage.setItem('keystone_work_orders', JSON.stringify(orders));
  } catch (e) {}
}

export const FALLBACK_SEED_FACILITIES: Facility[] = [
  {
    id: 'fac-1',
    organizationId: 'org-apex-1',
    name: 'Apex Tower Manhattan',
    code: 'FAC-NYC-01',
    facilityType: 'COMMERCIAL_HIGH_RISE',
    address: '350 5th Avenue, Floors 12-45',
    city: 'New York',
    state: 'NY',
    postalCode: '10118',
    lat: 40.7484,
    lng: -73.9857,
    totalAssetsCount: 64,
  },
  {
    id: 'fac-2',
    organizationId: 'org-apex-1',
    name: 'Silicon Bay Innovation Campus',
    code: 'FAC-SFO-02',
    facilityType: 'DATA_CENTER_AND_LABS',
    address: '400 Technology Way',
    city: 'San Jose',
    state: 'CA',
    postalCode: '95110',
    lat: 37.3382,
    lng: -121.8863,
    totalAssetsCount: 118,
  },
  {
    id: 'fac-3',
    organizationId: 'org-apex-1',
    name: 'Metro BioTech Research Facility',
    code: 'FAC-BOS-03',
    facilityType: 'CLEANROOM_AND_CLINICAL',
    address: '88 Cambridge Science Park',
    city: 'Boston',
    state: 'MA',
    postalCode: '02142',
    lat: 42.3601,
    lng: -71.0589,
    totalAssetsCount: 42,
  }
];

export function getFallbackFacilities(): Facility[] {
  try {
    const raw = localStorage.getItem('keystone_facilities');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_FACILITIES;
}

export const FALLBACK_SEED_ASSETS: Asset[] = [
  {
    id: 'ast-1',
    organizationId: 'org-apex-1',
    facilityId: 'fac-1',
    tagNumber: 'AST-HVAC-1001',
    name: 'Trane Centrifugal Chiller 500-Ton',
    category: 'HVAC',
    model: 'CVHE-500-Series',
    serialNumber: 'TRN-8942-X1',
    manufacturer: 'Trane Commercial Systems',
    status: 'DEGRADED',
    criticality: 'CRITICAL',
    locationDetails: 'Roof Mechanical Penthouse A',
  },
  {
    id: 'ast-2',
    organizationId: 'org-apex-1',
    facilityId: 'fac-1',
    tagNumber: 'AST-ELEV-2044',
    name: 'Otis SkyRise High-Speed Elevator Bank C',
    category: 'ELEVATOR',
    model: 'SkyRise-Gen2-4000',
    serialNumber: 'OTS-2023-998',
    manufacturer: 'Otis Elevator Company',
    status: 'OPERATIONAL',
    criticality: 'HIGH',
    locationDetails: 'Core Shaft Passenger Bank North',
  },
  {
    id: 'ast-3',
    organizationId: 'org-apex-1',
    facilityId: 'fac-2',
    tagNumber: 'AST-PWR-3012',
    name: 'Cummins Emergency Diesel Generator 1.5MW',
    category: 'ELECTRICAL',
    model: 'QSK50-G4-1500',
    serialNumber: 'CUM-50-88741',
    manufacturer: 'Cummins Power Systems',
    status: 'OPERATIONAL',
    criticality: 'CRITICAL',
    locationDetails: 'Sub-Basement Backup Vault B2',
  },
  {
    id: 'ast-4',
    organizationId: 'org-apex-1',
    facilityId: 'fac-3',
    tagNumber: 'AST-BAS-4009',
    name: 'Johnson Controls Metasys DDC Server',
    category: 'BUILDING_AUTOMATION',
    model: 'NAE-55-Server',
    serialNumber: 'JCI-NAE-7734',
    manufacturer: 'Johnson Controls',
    status: 'OPERATIONAL',
    criticality: 'HIGH',
    locationDetails: 'Server Room 302',
  }
];

export function getFallbackAssets(): Asset[] {
  try {
    const raw = localStorage.getItem('keystone_assets');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_ASSETS;
}

export const FALLBACK_SEED_TECHNICIANS: Technician[] = [
  {
    id: 'tech-1',
    userId: 'u-tech-1',
    organizationId: 'org-apex-1',
    employeeCode: 'EMP-7701',
    name: 'Elena Reyes',
    email: 'tech.davis@keystone.io',
    phone: '(555) 234-8901',
    skills: ['HVAC Chiller Master', 'EPA Universal', 'VFD Drives', 'Johnson Controls BAS'],
    certifications: ['Master HVAC License #9941', 'NATE Certified Commercial Specialist'],
    hourlyRate: 85.00,
    status: 'ON_SITE',
    currentAssignedCount: 2,
    lat: 40.7484,
    lng: -73.9857,
  },
  {
    id: 'tech-2',
    userId: 'u-tech-2',
    organizationId: 'org-apex-1',
    employeeCode: 'EMP-7702',
    name: 'Jamal Miller',
    email: 'tech.miller@keystone.io',
    phone: '(555) 345-6789',
    skills: ['Commercial Electrical', 'Switchgear 480V', 'Cummins Generator Specialist', 'Infrared Thermography'],
    certifications: ['Master Electrician License #4412', 'NFPA 70E Arc Flash Certified'],
    hourlyRate: 92.00,
    status: 'AVAILABLE',
    currentAssignedCount: 1,
    lat: 37.3382,
    lng: -121.8863,
  },
  {
    id: 'tech-3',
    userId: 'u-tech-3',
    organizationId: 'org-apex-1',
    employeeCode: 'EMP-7703',
    name: 'Liam Gallagher',
    email: 'liam.g@keystone.io',
    phone: '(555) 456-7890',
    skills: ['Commercial Plumbing', 'Fire Suppression Sprinklers', 'Backflow Prevention'],
    certifications: ['Master Plumber NY-6612', 'NICET Fire Protection Level II'],
    hourlyRate: 78.00,
    status: 'IN_TRANSIT',
    currentAssignedCount: 2,
    lat: 42.3601,
    lng: -71.0589,
  }
];

export function getFallbackTechnicians(): Technician[] {
  try {
    const raw = localStorage.getItem('keystone_technicians');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_TECHNICIANS;
}

export const FALLBACK_SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    organizationId: 'org-apex-1',
    name: 'Global Financial Corp',
    contactPerson: 'David Kim',
    email: 'facilitymgr@globalfin.com',
    phone: '(555) 890-1234',
    tier: 'ENTERPRISE',
    slaTier: 'Mission-Critical 24/7 Enterprise Tier',
    primaryFacilityId: 'fac-1',
    primaryFacilityName: 'Apex Tower Manhattan',
    activeContract: 'CNT-2026-GF01',
    status: 'ACTIVE',
    openTicketsCount: 2,
    totalSpentYtd: 48500.00,
    address: '350 5th Avenue, Floors 12-45',
    city: 'New York',
    state: 'NY',
  },
  {
    id: 'cust-2',
    organizationId: 'org-apex-1',
    name: 'BioHealth Laboratories',
    contactPerson: 'Dr. Evelyn Reed',
    email: 'labops@biohealthlabs.org',
    phone: '(555) 781-9920',
    tier: 'ENTERPRISE',
    slaTier: 'BioHealth Labs Research Wing Strict SLA',
    primaryFacilityId: 'fac-3',
    primaryFacilityName: 'Metro BioTech Research Facility',
    activeContract: 'CNT-2026-BH02',
    status: 'ACTIVE',
    openTicketsCount: 1,
    totalSpentYtd: 36200.00,
    address: '88 Cambridge Science Park',
    city: 'Boston',
    state: 'MA',
  },
  {
    id: 'cust-3',
    organizationId: 'org-apex-1',
    name: 'Silicon Bay Innovation Partners',
    contactPerson: 'Marcus Vance',
    email: 'facilities@siliconbay.io',
    phone: '(555) 432-8811',
    tier: 'PREMIUM',
    slaTier: 'High Priority Standard Facility SLA',
    primaryFacilityId: 'fac-2',
    primaryFacilityName: 'Silicon Bay Innovation Campus',
    activeContract: 'CNT-2026-SB03',
    status: 'ACTIVE',
    openTicketsCount: 0,
    totalSpentYtd: 22800.00,
    address: '400 Technology Way',
    city: 'San Jose',
    state: 'CA',
  }
];

export function getFallbackCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem('keystone_customers');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_CUSTOMERS;
}

export const FALLBACK_SEED_PARTS: Part[] = [
  {
    id: 'prt-1',
    organizationId: 'org-apex-1',
    partNumber: 'TRN-EXP-V99',
    name: 'Thermal Expansion Valve 15-Ton R-410A',
    description: 'Precision balanced-port thermostatic expansion valve for commercial packaged systems.',
    category: 'HVAC',
    unitCost: 145.00,
    unitPrice: 285.00,
    supplier: 'Trane Supply Wholesale',
    isActive: true,
    stockOnHand: 14,
    reorderLevel: 5,
    minStock: 3,
  },
  {
    id: 'prt-2',
    organizationId: 'org-apex-1',
    partNumber: 'SQD-CNT-40A',
    name: 'Square D 3-Pole 40A 24V Contactor',
    description: 'Definite purpose magnetic contactor with screw terminals for HVAC compressor duty.',
    category: 'ELECTRICAL',
    unitCost: 38.50,
    unitPrice: 85.00,
    supplier: 'Schneider Electric Direct',
    isActive: true,
    stockOnHand: 22,
    reorderLevel: 8,
    minStock: 4,
  },
  {
    id: 'prt-3',
    organizationId: 'org-apex-1',
    partNumber: 'AAF-FLT-24X24',
    name: 'MERV 13 High-Efficiency Pleated Filter 24x24x2',
    description: 'Commercial air filtration media designed for LEED-certified ventilation systems.',
    category: 'HVAC',
    unitCost: 16.00,
    unitPrice: 38.00,
    supplier: 'American Air Filter International',
    isActive: true,
    stockOnHand: 48,
    reorderLevel: 20,
    minStock: 10,
  }
];

export function getFallbackParts(): Part[] {
  try {
    const raw = localStorage.getItem('keystone_parts');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_PARTS;
}

export const FALLBACK_SEED_SLA_POLICIES: SlaPolicy[] = [
  {
    id: 'sla-crit-247',
    organizationId: 'org-apex-1',
    name: 'Mission-Critical 24/7 Enterprise Tier',
    priority: 'CRITICAL',
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
    businessHoursOnly: false,
    escalationRules: [
      { id: 'esc-1', triggerPercentage: 50, action: 'NOTIFY_DISPATCHER', description: 'Alert dispatcher when 50% response time elapsed without technician acceptance' },
      { id: 'esc-2', triggerPercentage: 75, action: 'ESCALATE_SUPERVISOR', description: 'Escalate to regional operations manager when 75% resolution time elapsed' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sla-high-std',
    organizationId: 'org-apex-1',
    name: 'High Priority Standard Facility SLA',
    priority: 'HIGH',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 480,
    businessHoursOnly: true,
    escalationRules: [
      { id: 'esc-4', triggerPercentage: 75, action: 'NOTIFY_DISPATCHER', description: 'Alert dispatcher if technician has not reached site within 75% response window' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
];

export function getFallbackSlaPolicies(): SlaPolicy[] {
  try {
    const raw = localStorage.getItem('keystone_sla_policies');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_SLA_POLICIES;
}

export const FALLBACK_SEED_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-101',
    requestNumber: 'SR-2026-0441',
    organizationId: 'org-apex-1',
    customerId: 'cust-1',
    customerName: 'Global Financial Corp',
    facilityId: 'fac-1',
    facilityName: 'Apex Tower Manhattan',
    assetId: 'ast-1',
    assetName: 'Trane Centrifugal Chiller 500-Ton',
    title: 'Abnormal vibration and noise on Floor 32 HVAC feed',
    description: 'Tenant reported rhythmic grinding sound from ceiling plenum during morning chill-down cycle.',
    priority: 'HIGH',
    status: 'PENDING_REVIEW',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    comments: [],
    attachments: [],
  }
];

export function getFallbackServiceRequests(): ServiceRequest[] {
  try {
    const raw = localStorage.getItem('keystone_service_requests');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_SERVICE_REQUESTS;
}

export const FALLBACK_SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    organizationId: 'org-apex-1',
    title: 'New High Priority Work Order',
    message: 'WO-2026-0881 has been created and assigned to Elena Reyes.',
    type: 'WORK_ORDER_ASSIGNED',
    entityType: 'WORK_ORDER',
    entityId: 'wo-101',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
  },
  {
    id: 'notif-2',
    organizationId: 'org-apex-1',
    title: 'SLA Escalation Alert',
    message: 'Work order WO-2026-0882 has reached 75% of resolution window.',
    type: 'SLA_BREACHED',
    entityType: 'SLA',
    entityId: 'wo-102',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
  }
];

export function getFallbackNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem('keystone_notifications');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return FALLBACK_SEED_NOTIFICATIONS;
}

export function clientFallbackGetDashboardStats(): DashboardStats {
  const orders = getFallbackWorkOrders();
  const totalOrders = orders.length;
  const openOrders = orders.filter(w => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length;
  const inProgressOrders = orders.filter(w => w.status === 'IN_PROGRESS').length;
  const completedOrders = orders.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length;
  const overdueOrders = orders.filter(w => w.slaStatus === 'BREACHED' || (w.slaResolutionRemainingMinutes !== undefined && w.slaResolutionRemainingMinutes < 0)).length;
  const slaAtRiskCount = orders.filter(w => w.slaStatus === 'AT_RISK' || (w.slaResolutionRemainingMinutes !== undefined && w.slaResolutionRemainingMinutes > 0 && w.slaResolutionRemainingMinutes <= 60)).length;
  const slaBreachedCount = orders.filter(w => w.slaStatus === 'BREACHED').length;
  const unassignedOrders = orders.filter(w => !w.assignedTechnicianId && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length;
  const compliantCount = orders.filter(w => w.slaStatus === 'ON_TRACK' || w.slaStatus === 'COMPLETED' || (!w.slaStatus && w.status !== 'CANCELLED')).length;
  const slaComplianceRate = totalOrders > 0 ? Math.round((compliantCount / totalOrders) * 100) : 100;

  const statusCounts: Record<WorkOrderStatus, number> = {
    NEW: orders.filter(w => w.status === 'NEW').length,
    ASSIGNED: orders.filter(w => w.status === 'ASSIGNED').length,
    IN_PROGRESS: orders.filter(w => w.status === 'IN_PROGRESS').length,
    ON_HOLD: orders.filter(w => w.status === 'ON_HOLD').length,
    COMPLETED: orders.filter(w => w.status === 'COMPLETED').length,
    CLOSED: orders.filter(w => w.status === 'CLOSED').length,
    CANCELLED: orders.filter(w => w.status === 'CANCELLED').length,
  };

  const priorityCounts: Record<Priority, number> = {
    CRITICAL: orders.filter(w => w.priority === 'CRITICAL').length,
    HIGH: orders.filter(w => w.priority === 'HIGH').length,
    MEDIUM: orders.filter(w => w.priority === 'MEDIUM').length,
    LOW: orders.filter(w => w.priority === 'LOW').length,
  };

  const techStats = {
    total: FALLBACK_SEED_TECHNICIANS.length,
    available: FALLBACK_SEED_TECHNICIANS.filter(t => t.status === 'AVAILABLE').length,
    onSite: FALLBACK_SEED_TECHNICIANS.filter(t => t.status === 'ON_SITE').length,
    inTransit: FALLBACK_SEED_TECHNICIANS.filter(t => t.status === 'IN_TRANSIT').length,
    offDuty: FALLBACK_SEED_TECHNICIANS.filter(t => t.status === 'OFF_DUTY').length,
  };

  const statusDistribution = [
    { status: 'NEW' as WorkOrderStatus, label: '1. New', count: statusCounts.NEW, color: '#94a3b8' },
    { status: 'ASSIGNED' as WorkOrderStatus, label: '2. Assigned', count: statusCounts.ASSIGNED, color: '#3b82f6' },
    { status: 'IN_PROGRESS' as WorkOrderStatus, label: '3. In Progress', count: statusCounts.IN_PROGRESS, color: '#f59e0b' },
    { status: 'ON_HOLD' as WorkOrderStatus, label: '4. On Hold', count: statusCounts.ON_HOLD, color: '#ea580c' },
    { status: 'COMPLETED' as WorkOrderStatus, label: '5. Completed', count: statusCounts.COMPLETED, color: '#10b981' },
    { status: 'CLOSED' as WorkOrderStatus, label: '6. Closed', count: statusCounts.CLOSED, color: '#475569' },
    { status: 'CANCELLED' as WorkOrderStatus, label: '7. Cancelled', count: statusCounts.CANCELLED, color: '#f43f5e' },
  ];

  const priorityDistribution = [
    { priority: 'CRITICAL' as Priority, label: 'Critical', count: priorityCounts.CRITICAL, color: '#ef4444' },
    { priority: 'HIGH' as Priority, label: 'High', count: priorityCounts.HIGH, color: '#f59e0b' },
    { priority: 'MEDIUM' as Priority, label: 'Medium', count: priorityCounts.MEDIUM, color: '#3b82f6' },
    { priority: 'LOW' as Priority, label: 'Low', count: priorityCounts.LOW, color: '#94a3b8' },
  ];

  const slaPerformance = [
    { name: 'Compliant & On Track', count: compliantCount, percentage: totalOrders > 0 ? Math.round((compliantCount / totalOrders) * 100) : 100, color: '#10b981' },
    { name: 'SLA At Risk (<60m)', count: slaAtRiskCount, percentage: totalOrders > 0 ? Math.round((slaAtRiskCount / totalOrders) * 100) : 0, color: '#f59e0b' },
    { name: 'Breached Threshold', count: slaBreachedCount, percentage: totalOrders > 0 ? Math.round((slaBreachedCount / totalOrders) * 100) : 0, color: '#ef4444' },
  ];

  const ordersOverTime = [
    { date: 'Mon', created: 3, completed: 2 },
    { date: 'Tue', created: 5, completed: 4 },
    { date: 'Wed', created: 2, completed: 3 },
    { date: 'Thu', created: 6, completed: 5 },
    { date: 'Fri', created: 4, completed: 4 },
    { date: 'Sat', created: 1, completed: 1 },
    { date: 'Sun', created: 2, completed: 2 },
  ];

  const technicianWorkload = FALLBACK_SEED_TECHNICIANS.map(t => {
    const assigned = orders.filter(w => w.assignedTechnicianId === t.id);
    return {
      name: t.name.split(' ')[0],
      activeJobs: assigned.filter(w => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(w.status)).length,
      completedJobs: assigned.filter(w => ['COMPLETED', 'CLOSED'].includes(w.status)).length,
      hoursLogged: Number(assigned.reduce((acc, w) => acc + (w.actualDurationHours || 0), 0).toFixed(1)),
      status: t.status,
    };
  });

  return {
    totalOrders,
    openOrders,
    inProgressOrders,
    completedOrders,
    overdueOrders,
    slaAtRiskCount,
    slaBreachedCount,
    unassignedOrders,
    availableTechnicians: techStats.available,
    lowInventoryCount: FALLBACK_SEED_PARTS.filter(p => p.stockOnHand <= (p.reorderLevel || 5)).length,
    slaComplianceRate,
    technicianUtilizationRate: 78,
    openServiceRequests: FALLBACK_SEED_SERVICE_REQUESTS.filter(s => s.status === 'PENDING_REVIEW').length,
    totalLaborHours: 32.5,
    totalPartsCost: 2850,
    totalLaborCost: 4875,
    totalServiceCost: 7725,
    activeOrders: openOrders,
    criticalOrders: priorityCounts.CRITICAL,
    statusCounts,
    priorityCounts,
    techStats,
    charts: {
      statusDistribution,
      priorityDistribution,
      ordersOverTime,
      slaPerformance,
      technicianWorkload,
    }
  };
}

export { DEMO_USERS };
