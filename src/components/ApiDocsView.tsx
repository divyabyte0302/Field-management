import React, { useState } from 'react';
import { 
  BookOpen, ExternalLink, Download, FileCode, Shield, Server,
  CheckCircle2, Copy, Check, ChevronRight, Terminal, RefreshCw
} from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'interactive' | 'reference'>('interactive');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const coreEndpoints = [
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Authenticate credentials & retrieve JWT token pair', tag: 'Auth' },
    { method: 'GET', path: '/api/v1/work-orders', desc: 'List work orders with pagination, status, and SLA filters', tag: 'Orders' },
    { method: 'POST', path: '/api/v1/work-orders', desc: 'Create a new maintenance work order in NEW status', tag: 'Orders' },
    { method: 'PATCH', path: '/api/v1/work-orders/{id}/status', desc: 'Execute FSM status transition with validation', tag: 'Orders' },
    { method: 'POST', path: '/api/v1/work-orders/{id}/assign', desc: 'Dispatch work order to eligible active technician', tag: 'Dispatch' },
    { method: 'GET', path: '/api/v1/technicians', desc: 'Query technician roster, skillsets, and live GPS', tag: 'Field' },
    { method: 'GET', path: '/api/v1/inventory/items', desc: 'Multi-facility parts stock with reorder indicators', tag: 'Inventory' },
    { method: 'GET', path: '/api/v1/sla/policies', desc: 'SLA target response and resolution countdowns', tag: 'SLA' },
    { method: 'GET', path: '/api/v1/dashboard/stats', desc: 'Aggregate operations KPIs, MTTR, and SLA compliance', tag: 'Analytics' },
    { method: 'GET', path: '/api/health', desc: 'System health, FSM engine, and database telemetry', tag: 'System' },
  ];

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'POST': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PATCH':
      case 'PUT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div id="api-docs-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              OPENAPI 3.0.3 SPECIFICATION
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              RESTful ARCHITECTURE
            </span>
            <span className="text-xs text-slate-500 font-mono">• Production Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interactive Swagger & API Documentation</h1>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            Complete API specification for Project KEYSTONE. Covers JWT authentication, finite-state machine transitions, technician dispatching, SLA tracking, and multi-tenant isolation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            id="btn-open-swagger-full"
            href="/swagger-ui.html"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Standalone Swagger</span>
          </a>

          <a
            id="btn-download-openapi-json"
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>OpenAPI JSON</span>
          </a>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'interactive' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interactive UI
            </button>
            <button
              onClick={() => setViewMode('reference')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'reference' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Reference
            </button>
          </div>
        </div>
      </div>

      {/* Security Architecture & Auth Notice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>JWT Bearer Authentication</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Pass <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[10px]">Authorization: Bearer &lt;token&gt;</code> on all requests. Tokens are verified against the revocation registry.
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Deterministic FSM Transitions</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Work order lifecycle strictly enforces valid state machine transitions (NEW &rarr; ASSIGNED &rarr; IN_PROGRESS &rarr; COMPLETED &rarr; CLOSED).
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs mb-1">
            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
            <span>Dual Path Support</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Both <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[10px]">/api/v1/*</code> (preferred) and legacy <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[10px]">/api/*</code> are supported identically.
          </p>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'interactive' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">Embedded Swagger UI</span>
              <span className="text-[10px] text-slate-400 font-mono">• Loaded from /swagger-ui.html</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                title="Reload Swagger UI"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a
                href="/swagger-ui.html"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                Open in new window &rarr;
              </a>
            </div>
          </div>
          
          <div className="relative w-full" style={{ height: '800px' }}>
            <iframe
              key={iframeKey}
              id="swagger-ui-embedded-frame"
              src="/swagger-ui.html"
              title="KEYSTONE Swagger UI"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      ) : (
        /* Quick Reference Table */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Key REST API Endpoints</h3>
              <p className="text-xs text-slate-500">Essential endpoints for field service automation and integration</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {coreEndpoints.length} Core Endpoints
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {coreEndpoints.map((ep, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                <div className="flex items-start sm:items-center gap-3">
                  <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded border uppercase min-w-16 text-center ${getMethodBadge(ep.method)}`}>
                    {ep.method}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-slate-900">{ep.path}</code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {ep.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{ep.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => copyToClipboard(ep.path)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition flex items-center gap-1 text-[11px]"
                    title="Copy path"
                  >
                    {copiedUrl === ep.path ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* cURL Example */}
          <div className="p-4 bg-slate-50 text-slate-800 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-700 font-semibold">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span>Example cURL Request</span>
              </div>
              <button
                onClick={() => copyToClipboard('curl -X GET "http://localhost:3000/api/v1/work-orders" -H "Authorization: Bearer <TOKEN>"')}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <Copy className="w-3 h-3" />
                <span>Copy command</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-800 overflow-x-auto p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
{`curl -X GET "http://localhost:3000/api/v1/work-orders?status=IN_PROGRESS&limit=10" \\
  -H "Authorization: Bearer $KEYSTONE_TOKEN" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
