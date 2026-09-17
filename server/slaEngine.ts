import { 
  WorkOrder, SlaPolicy, SlaStatus, Priority, WorkOrderStatus 
} from './types';

/**
 * Calculates deadline adding durationMinutes.
 * If businessHoursOnly is true, calculates deadline within 8:00 AM - 6:00 PM Monday-Friday.
 */
export function calculateDeadline(
  startDate: Date, 
  durationMinutes: number, 
  businessHoursOnly = false
): Date {
  if (!businessHoursOnly) {
    return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  }

  // Business hours: 08:00 to 18:00 (10 hours = 600 business minutes per day), Monday (1) to Friday (5)
  let current = new Date(startDate.getTime());
  let remainingMinutes = durationMinutes;

  while (remainingMinutes > 0) {
    const day = current.getDay(); // 0 = Sun, 6 = Sat
    const hour = current.getHours();
    const minute = current.getMinutes();

    // If weekend, advance to Monday 08:00
    if (day === 0) {
      current.setDate(current.getDate() + 1);
      current.setHours(8, 0, 0, 0);
      continue;
    }
    if (day === 6) {
      current.setDate(current.getDate() + 2);
      current.setHours(8, 0, 0, 0);
      continue;
    }

    // If before 08:00, snap to 08:00 today
    if (hour < 8) {
      current.setHours(8, 0, 0, 0);
      continue;
    }

    // If at or after 18:00, roll over to next day 08:00
    if (hour >= 18) {
      current.setDate(current.getDate() + 1);
      current.setHours(8, 0, 0, 0);
      continue;
    }

    // We are within business hours today. Find minutes until 18:00
    const minutesLeftToday = (18 - hour) * 60 - minute;
    if (remainingMinutes <= minutesLeftToday) {
      current = new Date(current.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= minutesLeftToday;
      current.setDate(current.getDate() + 1);
      current.setHours(8, 0, 0, 0);
    }
  }

  return current;
}

/**
 * Finds the most specific matching SLA policy based on facility, customer, and priority.
 */
export function matchSlaPolicy(
  policies: SlaPolicy[],
  criteria: { priority: Priority; customerId?: string; facilityId?: string; category?: string }
): SlaPolicy | undefined {
  // 1. Specific customer + facility + priority
  if (criteria.customerId && criteria.facilityId) {
    const exact = policies.find(p => 
      p.priority === criteria.priority && 
      p.customerId === criteria.customerId && 
      p.facilityId === criteria.facilityId
    );
    if (exact) return exact;
  }

  // 2. Specific facility + priority
  if (criteria.facilityId) {
    const facMatch = policies.find(p => 
      p.priority === criteria.priority && 
      p.facilityId === criteria.facilityId
    );
    if (facMatch) return facMatch;
  }

  // 3. Specific customer + priority
  if (criteria.customerId) {
    const custMatch = policies.find(p => 
      p.priority === criteria.priority && 
      p.customerId === criteria.customerId
    );
    if (custMatch) return custMatch;
  }

  // 4. Default by priority
  const defaultPolicy = policies.find(p => 
    p.priority === criteria.priority && 
    !p.facilityId && 
    !p.customerId
  );
  if (defaultPolicy) return defaultPolicy;

  // 5. Any matching priority
  return policies.find(p => p.priority === criteria.priority);
}

export interface SlaAssessment {
  slaStatus: SlaStatus;
  responseStatus: SlaStatus;
  resolutionStatus: SlaStatus;
  remainingMinutes: number;
  overdueMinutes: number;
  escalationTriggers: string[];
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
}

/**
 * Calculates real-time SLA metrics, deadlines, remaining durations, and breach status for a work order.
 */
export function assessWorkOrderSla(
  order: WorkOrder, 
  policy?: SlaPolicy, 
  now = new Date()
): SlaAssessment {
  const createdAt = new Date(order.createdAt).getTime();
  const resDeadline = new Date(order.slaResolutionDeadline).getTime();
  const respDeadline = new Date(order.slaResponseDeadline).getTime();
  const currentTime = now.getTime();

  // Response Status Check
  let isResponseBreached = order.isSlaResponseBreached;
  let responseStatus: SlaStatus = 'ON_TRACK';

  if (order.respondedAt) {
    const respTime = new Date(order.respondedAt).getTime();
    if (respTime <= respDeadline) {
      responseStatus = 'COMPLETED';
      isResponseBreached = false;
    } else {
      responseStatus = 'BREACHED';
      isResponseBreached = true;
    }
  } else {
    if (currentTime > respDeadline) {
      responseStatus = 'BREACHED';
      isResponseBreached = true;
    } else {
      const respWindow = respDeadline - createdAt;
      const respRemaining = respDeadline - currentTime;
      if (respWindow > 0 && respRemaining / respWindow <= 0.25) {
        responseStatus = 'AT_RISK';
      } else {
        responseStatus = 'ON_TRACK';
      }
    }
  }

  // Resolution Status Check
  const isResolvedOrClosed = ['COMPLETED', 'CLOSED'].includes(order.status);
  let isResolutionBreached = order.isSlaResolutionBreached;
  let resolutionStatus: SlaStatus = 'ON_TRACK';

  if (isResolvedOrClosed) {
    const compTime = order.completedAt ? new Date(order.completedAt).getTime() : currentTime;
    if (compTime <= resDeadline) {
      resolutionStatus = 'COMPLETED';
      isResolutionBreached = false;
    } else {
      resolutionStatus = 'BREACHED';
      isResolutionBreached = true;
    }
  } else {
    if (currentTime > resDeadline) {
      resolutionStatus = 'BREACHED';
      isResolutionBreached = true;
    } else {
      const resWindow = resDeadline - createdAt;
      const resRemaining = resDeadline - currentTime;
      // At risk if <= 25% window left or less than 60 mins left
      if ((resWindow > 0 && resRemaining / resWindow <= 0.25) || resRemaining <= 60 * 60 * 1000) {
        resolutionStatus = 'AT_RISK';
      } else {
        resolutionStatus = 'ON_TRACK';
      }
    }
  }

  // Remaining and Overdue durations
  const remainingMinutes = !isResolvedOrClosed 
    ? Math.max(0, Math.round((resDeadline - currentTime) / (60 * 1000))) 
    : 0;

  const overdueMinutes = (!isResolvedOrClosed && currentTime > resDeadline)
    ? Math.round((currentTime - resDeadline) / (60 * 1000))
    : (isResolvedOrClosed && order.completedAt && new Date(order.completedAt).getTime() > resDeadline)
      ? Math.round((new Date(order.completedAt).getTime() - resDeadline) / (60 * 1000))
      : 0;

  // Overall Status
  let overallStatus: SlaStatus = 'ON_TRACK';
  if (isResolutionBreached || isResponseBreached) {
    overallStatus = 'BREACHED';
  } else if (isResolvedOrClosed) {
    overallStatus = 'COMPLETED';
  } else if (resolutionStatus === 'AT_RISK' || responseStatus === 'AT_RISK') {
    overallStatus = 'AT_RISK';
  }

  // Escalation rule evaluations
  const escalationTriggers: string[] = [];
  if (policy && policy.escalationRules && !isResolvedOrClosed) {
    const totalTime = resDeadline - createdAt;
    const elapsed = currentTime - createdAt;
    const percentage = totalTime > 0 ? (elapsed / totalTime) * 100 : 0;

    for (const rule of policy.escalationRules) {
      if (percentage >= rule.triggerPercentage) {
        escalationTriggers.push(`[${rule.action}] at ${rule.triggerPercentage}%: ${rule.description}`);
      }
    }
  }

  return {
    slaStatus: overallStatus,
    responseStatus,
    resolutionStatus,
    remainingMinutes,
    overdueMinutes,
    escalationTriggers,
    isResponseBreached,
    isResolutionBreached,
  };
}

/**
 * Computes labor and parts cost rollup for a work order.
 */
export function calculateFinancialSummary(order: WorkOrder) {
  const parts = order.parts || [];
  const timeEntries = order.timeEntries || [];

  const totalPartsCost = parts.reduce((acc, p) => acc + (p.totalCost || (p.unitCost * p.quantity)), 0);
  const totalPartsPrice = parts.reduce((acc, p) => acc + (p.totalPrice || (p.unitPrice * p.quantity)), 0);

  const totalLaborMinutes = timeEntries.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  const billableLaborMinutes = timeEntries.reduce((acc, t) => acc + (t.isBillable !== false ? (t.durationMinutes || 0) : 0), 0);

  const totalLaborHours = Number((totalLaborMinutes / 60).toFixed(2));
  const billableLaborHours = Number((billableLaborMinutes / 60).toFixed(2));

  const totalLaborCost = Number(timeEntries.reduce((acc, t) => acc + (t.laborCost || ((t.durationMinutes / 60) * (t.hourlyRate || 85))), 0).toFixed(2));

  const totalCost = Number((totalPartsCost + totalLaborCost).toFixed(2));

  return {
    totalPartsCost: Number(totalPartsCost.toFixed(2)),
    totalPartsPrice: Number(totalPartsPrice.toFixed(2)),
    totalLaborHours,
    billableLaborHours,
    totalLaborCost,
    totalCost,
  };
}
