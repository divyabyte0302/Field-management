import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Key, Users, RefreshCw, 
  Server, Database, CheckCircle2, AlertTriangle, 
  FileCode, Layers, ArrowRight, Eye 
} from 'lucide-react';

export const SecurityArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'jwt' | 'spring' | 'isolation'>('matrix');

  return (
    <div id="security-architecture-view" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
              SPRING SECURITY + JWT ENTERPRISE BLUEPRINT
            </span>
            <span className="text-xs text-slate-500 font-mono">• Production Specification</span>
          </div>
          <h2 className="text-xl font-bold text-white">Security & Authorization Architecture</h2>
          <p className="text-xs text-slate-400">
            Multi-tiered role-based access control, stateless JWT lifecycle, token invalidation, and tenant isolation
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'matrix' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RBAC Matrix
          </button>
          <button
            onClick={() => setActiveTab('jwt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'jwt' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JWT Lifecycle & Revocation
          </button>
          <button
            onClick={() => setActiveTab('spring')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'spring' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spring Security Config
          </button>
          <button
            onClick={() => setActiveTab('isolation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'isolation' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tenant & Data Isolation
          </button>
        </div>
      </div>

      {/* TAB 1: RBAC MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Role-Based Access Control (RBAC) Entitlement Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict enforcement at filter and service layers preventing horizontal and vertical privilege escalation
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/50">
                  <th className="px-4 py-3">Functional Capability</th>
                  <th className="px-3 py-3 text-center text-purple-400">SUPER_ADMIN</th>
                  <th className="px-3 py-3 text-center text-blue-400">ADMIN</th>
                  <th className="px-3 py-3 text-center text-cyan-400">DISPATCHER</th>
                  <th className="px-3 py-3 text-center text-amber-400">TECHNICIAN</th>
                  <th className="px-3 py-3 text-center text-emerald-400">CUSTOMER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {[
                  { cap: 'Cross-Organization System Administration', roles: [true, false, false, false, false] },
                  { cap: 'User Management & Status Activation/Deactivation', roles: [true, true, false, false, false] },
                  { cap: 'Facility & Asset Configuration', roles: [true, true, false, false, false] },
                  { cap: 'Create & Triage Work Orders', roles: [true, true, true, false, false] },
                  { cap: 'Dispatch & Assign Technicians', roles: [true, true, true, false, false] },
                  { cap: 'View SLA Compliance & Operational Analytics', roles: [true, true, true, false, false] },
                  { cap: 'Accept Job & Start Work (Assigned Orders Only)', roles: [true, true, false, true, false] },
                  { cap: 'Log Labor Time & Allocate Replacement Parts', roles: [true, true, false, true, false] },
                  { cap: 'Mark Work Order Completed', roles: [true, true, false, true, false] },
                  { cap: 'Submit Service Requests (Facility Inbound)', roles: [true, true, true, false, true] },
                  { cap: 'Verify & Sign Off Completed Work Orders', roles: [true, true, true, false, true] },
                  { cap: 'Change Own Password & Invalidate Prior Tokens', roles: [true, true, true, true, true] },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{row.cap}</td>
                    {row.roles.map((allowed, rIdx) => (
                      <td key={rIdx} className="px-3 py-3 text-center">
                        {allowed ? (
                          <span className="inline-block w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold leading-5">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-block w-5 h-5 rounded-full bg-slate-800 text-slate-600 font-bold leading-5">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JWT LIFECYCLE & REVOCATION */}
      {activeTab === 'jwt' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Dual-Token Strategy & Security Specs</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-cyan-400">Short-Lived Access Token</span>
                <p className="text-slate-400">
                  Valid for 60 minutes. Contains user ID, organization ID, and role claims. Encrypted using HMAC-SHA256 signature verification.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-emerald-400">Rotated Refresh Token</span>
                <p className="text-slate-400">
                  Valid for 7 days. Used exclusively via <code className="text-cyan-300 font-mono">POST /api/auth/refresh</code>. Uses strict single-use rotation: exchanging a refresh token invalidates the old token immediately, preventing replay attacks.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-amber-400">BCrypt Password Hashing</span>
                <p className="text-slate-400">
                  Passwords salted with 10 rounds of BCrypt. Plain-text passwords are never persisted.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Token Invalidation & Revocation Registry</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-rose-400">Explicit Logout Revocation</span>
                <p className="text-slate-400">
                  Calling <code className="text-cyan-300 font-mono">POST /api/auth/logout</code> records the Bearer token in the <code className="text-slate-200">TokenBlacklistService</code>. Any subsequent request with that token is immediately rejected with 401 Unauthorized.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-purple-400">Password Change Invalidation</span>
                <p className="text-slate-400">
                  When a user changes their password, all active sessions and refresh tokens for that user ID are invalidated using atomic token versioning, terminating any compromised active devices.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-blue-400">Account Deactivation Guard</span>
                <p className="text-slate-400">
                  Deactivated accounts (<code className="text-slate-200">isActive: false</code>) are blocked at the authentication filter and login handler. Active sessions are terminated in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPRING SECURITY CONFIG */}
      {activeTab === 'spring' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Spring Security 6.x / Spring Boot 3 SecurityConfig Specification
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Implemented in <code className="font-mono text-cyan-400">backend/src/main/java/com/keystone/security/SecurityConfig.java</code>
              </p>
            </div>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
      .csrf(AbstractHttpConfigurer::disable)
      .cors(cors -> cors.configurationSource(corsConfigurationSource()))
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(auth -> auth
        // Public Auth & Health Endpoints
        .requestMatchers("/api/auth/**", "/api/v1/auth/**").permitAll()
        .requestMatchers("/api/health", "/api/v1/health").permitAll()
        
        // Admin-only Endpoints
        .requestMatchers("/api/users/**", "/api/v1/users/**").hasAnyRole("ADMIN", "SUPER_ADMIN")
        
        // Dispatcher & Admin Operations
        .requestMatchers(HttpMethod.POST, "/api/v1/work-orders/*/assign").hasAnyRole("DISPATCHER", "ADMIN", "SUPER_ADMIN")
        
        // Technician Execution
        .requestMatchers(HttpMethod.POST, "/api/v1/work-orders/*/time-entries").hasAnyRole("TECHNICIAN", "ADMIN", "SUPER_ADMIN")
        .requestMatchers(HttpMethod.POST, "/api/v1/work-orders/*/parts").hasAnyRole("TECHNICIAN", "ADMIN", "SUPER_ADMIN")
        
        // Authenticated Base
        .anyRequest().authenticated()
      )
      .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }
}`}
          </pre>
        </div>
      )}

      {/* TAB 4: TENANT & DATA ISOLATION */}
      {activeTab === 'isolation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Horizontal Privilege Escalation & Multi-Tenancy Protection</h3>
          </div>
          <p className="text-xs text-slate-400">
            KEYSTONE implements three layers of horizontal data isolation:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                1. Tenant Organization Scoping
              </span>
              <p className="text-slate-400 leading-relaxed">
                Users are strictly bound to their <code className="font-mono text-cyan-300">organizationId</code>. An admin or technician in <code className="font-mono text-slate-200">org-beta-2</code> is blocked with <code className="font-mono text-rose-400">403 Forbidden</code> if attempting to query or mutate <code className="font-mono text-slate-200">org-apex-1</code> work orders or facilities.
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                2. Technician Assignment Guard
              </span>
              <p className="text-slate-400 leading-relaxed">
                Technicians can only transition, log labor against, and allocate parts to work orders where <code className="font-mono text-amber-300">assignedTechnicianId === user.technicianId</code>. Attempting to log time against unassigned orders yields <code className="font-mono text-rose-400">403 Forbidden</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <span className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                3. Customer Ownership Scoping
              </span>
              <p className="text-slate-400 leading-relaxed">
                Customer users only see service requests and work orders matching their customer account or facilities. Customers cannot access internal dispatch queues, workforce telematics, or cross-customer facilities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
