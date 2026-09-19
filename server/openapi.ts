export const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "KEYSTONE Enterprise Field Service Management (FSM) API",
    version: "1.0.0-PROD",
    description: "Production RESTful API specification for Project KEYSTONE Field Service Management Platform. Enforces JWT authentication, multi-tier RBAC, strict tenant isolation, finite state machine work order lifecycles, and SLA compliance engine.",
    contact: {
      name: "KEYSTONE Engineering Team",
      email: "api-support@keystone.io"
    },
    license: {
      name: "Enterprise Commercial License"
    }
  },
  servers: [
    {
      url: "/api/v1",
      description: "Production API v1 Endpoint"
    },
    {
      url: "/api",
      description: "Legacy Direct API Endpoint"
    }
  ],
  tags: [
    { name: "Authentication", description: "Identity, session management, and token rotation" },
    { name: "Work Orders", description: "Core work order lifecycle, dispatching, and transitions" },
    { name: "Service Requests", description: "Customer-originated service requests and triage" },
    { name: "Technicians", description: "Technician roster, availability, and GPS telemetry" },
    { name: "Dispatch", description: "Workforce scheduling, assignment history, and queue management" },
    { name: "Inventory", description: "Multi-facility warehouse inventory, stock allocation, and audit log" },
    { name: "Parts", description: "Global replacement parts catalog" },
    { name: "SLA Engine", description: "Service Level Agreement policies, countdowns, and breach analytics" },
    { name: "Time Tracking", description: "Live technician stopwatch timers, travel time, and labor logs" },
    { name: "Dashboards & Reports", description: "Operational metrics, MTTR, utilization, and executive rollups" },
    { name: "Notifications", description: "Multi-channel in-app alerts and notifications" },
    { name: "Users", description: "Multi-tenant user administration and access control" },
    { name: "Facilities & Assets", description: "Commercial property registry and critical equipment hierarchy" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "System Health & Telemetry",
        description: "Returns health status of the database, security layer, and state machine.",
        responses: {
          "200": {
            description: "Service is operational",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                    version: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate user and issue JWT credentials",
        description: "Validates user email and password, returning short-lived Access Token and rotated Refresh Token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@keystone.io" },
                  password: { type: "string", format: "password", example: "password123" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Authentication successful with JWT tokens" },
          "401": { description: "Invalid credentials or deactivated account" }
        }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Exchange refresh token for a new access token",
        description: "Implements Refresh Token Rotation (RTR). The provided refresh token is invalidated upon exchange.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Token refreshed successfully" },
          "401": { description: "Invalid or revoked refresh token" }
        }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Invalidate tokens and end user session",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "User logged out successfully" }
        }
      }
    },
    "/work-orders": {
      get: {
        tags: ["Work Orders"],
        summary: "List work orders with multi-tenant filtering",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED", "CANCELLED"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] } },
          { name: "facilityId", in: "query", schema: { type: "string" } },
          { name: "query", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "size", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "Filtered list of work orders with enriched SLA status" },
          "401": { description: "Unauthorized" }
        }
      },
      post: {
        tags: ["Work Orders"],
        summary: "Create a new work order",
        security: [{ BearerAuth: [] }],
        description: "Permitted for SUPER_ADMIN, ADMIN, and DISPATCHER roles.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["facilityId", "title", "description"],
                properties: {
                  facilityId: { type: "string" },
                  assetId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
                  category: { type: "string", default: "CORRECTIVE_MAINTENANCE" },
                  assignedTechnicianId: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Work order created successfully" },
          "400": { description: "Validation failure" },
          "403": { description: "Forbidden - Insufficient permissions" }
        }
      }
    },
    "/work-orders/{id}": {
      get: {
        tags: ["Work Orders"],
        summary: "Get work order details by ID",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detailed work order record" },
          "403": { description: "Cross-organization access forbidden" },
          "404": { description: "Work order not found" }
        }
      }
    },
    "/work-orders/{id}/transition": {
      post: {
        tags: ["Work Orders"],
        summary: "Advance work order through state machine",
        security: [{ BearerAuth: [] }],
        description: "Validates state transitions according to Document v1.0 Section 10 finite state machine and RBAC constraints.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetStatus"],
                properties: {
                  targetStatus: { type: "string", enum: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CLOSED", "CANCELLED"] },
                  notes: { type: "string" },
                  holdReason: { type: "string" },
                  rejectionReason: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Status successfully updated" },
          "400": { description: "Invalid state transition" },
          "403": { description: "Unauthorized role for requested transition" }
        }
      }
    },
    "/work-orders/{id}/assign": {
      post: {
        tags: ["Dispatch"],
        summary: "Assign or reassign technician to work order",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["technicianId"],
                properties: {
                  technicianId: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Technician assigned and work order updated" }
        }
      }
    },
    "/work-orders/{id}/time-entries": {
      post: {
        tags: ["Time Tracking"],
        summary: "Log technician labor or travel time entry",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["durationMinutes"],
                properties: {
                  durationMinutes: { type: "integer", minimum: 1 },
                  entryType: { type: "string", enum: ["LABOR", "TRAVEL", "DIAGNOSIS", "WAIT_PARTS"] },
                  notes: { type: "string" },
                  hourlyRate: { type: "number" },
                  isBillable: { type: "boolean" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Time entry logged and financial cost rolled up" }
        }
      }
    },
    "/work-orders/{id}/parts": {
      post: {
        tags: ["Inventory"],
        summary: "Allocate parts to work order with stock verification",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["partId", "quantity"],
                properties: {
                  partId: { type: "string" },
                  quantity: { type: "integer", minimum: 1 }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Part allocated and warehouse stock decremented" },
          "400": { description: "Insufficient stock / Negative inventory prohibited" }
        }
      }
    },
    "/service-requests": {
      get: {
        tags: ["Service Requests"],
        summary: "List customer service requests",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Service request list" }
        }
      },
      post: {
        tags: ["Service Requests"],
        summary: "Submit customer service request",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["facilityId", "title", "description"],
                properties: {
                  facilityId: { type: "string" },
                  assetId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
                  locationDetails: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "Service request created" }
        }
      }
    },
    "/technicians": {
      get: {
        tags: ["Technicians"],
        summary: "Get list of field technicians with status and skill sets",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of technicians" }
        }
      }
    },
    "/facilities": {
      get: {
        tags: ["Facilities & Assets"],
        summary: "Get commercial facilities directory",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of facilities" }
        }
      }
    },
    "/assets": {
      get: {
        tags: ["Facilities & Assets"],
        summary: "Get critical assets catalog",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "List of assets" }
        }
      }
    },
    "/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "Get facility-level inventory balances and reorder alerts",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Facility inventory roster" }
        }
      }
    },
    "/sla/dashboard": {
      get: {
        tags: ["SLA Engine"],
        summary: "Compute real-time SLA metrics and compliance scorecard",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "SLA compliance rate, breaches, and priority distributions" }
        }
      }
    },
    "/dashboard/stats": {
      get: {
        tags: ["Dashboards & Reports"],
        summary: "High-level operations telemetry and pipeline distributions",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Dashboard summary statistics" }
        }
      }
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get notifications feed for authenticated user",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Notifications list" }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Stateless JWT Bearer Token generated by /api/auth/login"
      }
    }
  }
};

export function renderSwaggerHtml(specUrl: string = '/api/v1/openapi.json'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KEYSTONE API Documentation | Enterprise FSM</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .topbar {
      background-color: #ffffff !important;
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #0f172a;
      font-weight: 700;
      font-size: 16px;
      text-decoration: none;
      font-family: monospace;
      letter-spacing: 0.05em;
    }
    .topbar-brand span.badge {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .swagger-ui {
      max-width: 1300px;
      margin: 0 auto;
      padding: 20px;
    }
    .swagger-ui .info .title {
      color: #0f172a;
    }
    .swagger-ui .info p, .swagger-ui .info li {
      color: #475569;
    }
    .swagger-ui .scheme-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      padding: 16px;
      margin-bottom: 24px;
    }
    .swagger-ui .opblock {
      border-radius: 10px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
      margin-bottom: 12px !important;
    }
    .swagger-ui .opblock .opblock-summary-method {
      border-radius: 6px !important;
      font-weight: 700 !important;
    }
    .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-external-docs-wrapper p, .swagger-ui .opblock-title_normal p {
      color: #334155;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: #64748b;
      border-bottom-color: #e2e8f0;
    }
    .swagger-ui .parameter__name {
      color: #0f172a;
    }
    .swagger-ui .parameter__type {
      color: #0284c7;
    }
    .swagger-ui .response-col_status {
      color: #0f172a;
    }
    .swagger-ui section.models {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
    }
    .swagger-ui section.models h4 {
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <a href="/" class="topbar-brand">
      KEYSTONE <span class="badge">OPENAPI 3.0 SPEC</span>
    </a>
    <div style="display: flex; gap: 12px; align-items: center;">
      <a href="/api/v1/openapi.json" target="_blank" style="color: #2563eb; font-size: 12px; text-decoration: none; font-weight: 600;">Download JSON Spec &rarr;</a>
      <a href="/" style="background: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 8px; font-size: 12px; text-decoration: none; font-weight: 600;">Return to App &rarr;</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}
