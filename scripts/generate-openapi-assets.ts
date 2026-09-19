import fs from 'fs';
import path from 'path';
import { OPENAPI_SPEC } from '../server/openapi';

const publicDir = path.resolve(process.cwd(), 'public');
const apiV1Dir = path.join(publicDir, 'api', 'v1');

if (!fs.existsSync(apiV1Dir)) {
  fs.mkdirSync(apiV1Dir, { recursive: true });
}

// 1. Write public/api/v1/openapi.json and public/openapi.json
const specJson = JSON.stringify(OPENAPI_SPEC, null, 2);
fs.writeFileSync(path.join(apiV1Dir, 'openapi.json'), specJson, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'openapi.json'), specJson, 'utf-8');

// 2. Write standalone public/swagger-ui.html
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KEYSTONE Enterprise API | Interactive Swagger Documentation</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    :root {
      --bg-white: #ffffff;
      --card-white: #ffffff;
      --border-slate: #e2e8f0;
      --accent-blue: #2563eb;
      --text-main: #0f172a;
      --text-muted: #64748b;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-white);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      background-color: #ffffff !important;
      border-bottom: 1px solid var(--border-slate);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .topbar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #0f172a;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0.05em;
    }
    .topbar-brand .logo-icon {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 13px;
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
    .topbar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .topbar-actions a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-download {
      color: #2563eb;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .btn-download:hover {
      background: #dbeafe;
    }
    .btn-app {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }
    .btn-app:hover {
      background: #f1f5f9;
    }
    .swagger-ui {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px 16px 64px 16px;
    }
    .swagger-ui .info {
      margin: 20px 0 24px 0;
    }
    .swagger-ui .info .title {
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .swagger-ui .info p, .swagger-ui .info li {
      color: var(--text-muted);
      line-height: 1.6;
    }
    .swagger-ui .scheme-container {
      background: #ffffff;
      border: 1px solid var(--border-slate);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .swagger-ui .schemes-title {
      color: #1e293b;
      font-weight: 600;
    }
    .swagger-ui .opblock {
      border-radius: 10px !important;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
      margin-bottom: 12px !important;
    }
    .swagger-ui .opblock .opblock-summary {
      padding: 10px 16px;
    }
    .swagger-ui .opblock .opblock-summary-method {
      border-radius: 6px !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      min-width: 70px;
      text-align: center;
    }
    .swagger-ui .opblock .opblock-summary-path {
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
    }
    .swagger-ui .opblock .opblock-summary-description {
      color: #64748b;
      font-size: 12px;
    }
    .swagger-ui .opblock-description-wrapper p, 
    .swagger-ui .opblock-external-docs-wrapper p, 
    .swagger-ui .opblock-title_normal p {
      color: #334155;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: var(--text-muted);
      border-bottom-color: var(--border-slate);
      font-size: 12px;
    }
    .swagger-ui .parameter__name {
      color: #0f172a;
      font-family: monospace;
    }
    .swagger-ui .parameter__name.required:after {
      color: #e11d48;
    }
    .swagger-ui .parameter__type {
      color: #0284c7;
      font-family: monospace;
    }
    .swagger-ui .response-col_status {
      color: #0f172a;
      font-weight: 700;
    }
    .swagger-ui section.models {
      border: 1px solid var(--border-slate);
      border-radius: 12px;
      background: #ffffff;
      margin-top: 32px;
    }
    .swagger-ui section.models h4 {
      color: #0f172a;
      font-weight: 700;
    }
    .swagger-ui .btn.authorize {
      color: #059669;
      border-color: #059669;
      background: #ecfdf5;
      border-radius: 8px;
    }
    .swagger-ui .btn.authorize svg {
      fill: #059669;
    }
    .swagger-ui .btn.execute {
      background-color: #2563eb;
      border-color: #2563eb;
      color: #fff;
      border-radius: 6px;
    }
    .swagger-ui input[type=text], .swagger-ui textarea {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      border-radius: 6px;
    }
    .swagger-ui select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      border-radius: 6px;
    }
    .swagger-ui .responses-inner {
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .swagger-ui .highlight-code {
      background: #f8fafc !important;
    }
  </style>
</head>
<body>
  <header class="topbar">
    <a href="/" class="topbar-brand">
      <div class="logo-icon">K</div>
      <span>KEYSTONE FSM</span>
      <span class="badge">OPENAPI 3.0</span>
    </a>
    <div class="topbar-actions">
      <a href="/api/v1/openapi.json" target="_blank" class="btn-download">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        JSON Specification
      </a>
      <a href="/" class="btn-app">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Return to App
      </a>
    </div>
  </header>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    const embeddedSpec = ${JSON.stringify(OPENAPI_SPEC)};

    window.onload = function() {
      try {
        window.ui = SwaggerUIBundle({
          url: "/api/v1/openapi.json",
          spec: embeddedSpec,
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "BaseLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          displayRequestDuration: true,
          docExpansion: "list",
          filter: true,
          showExtensions: true,
          showCommonExtensions: true
        });
      } catch (err) {
        console.error("Swagger UI load error:", err);
        window.ui = SwaggerUIBundle({
          spec: embeddedSpec,
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout"
        });
      }
    };
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'swagger-ui.html'), html, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'docs.html'), html, 'utf-8');
fs.writeFileSync(path.join(publicDir, 'api-docs.html'), html, 'utf-8');
console.log('✅ Generated Swagger UI and OpenAPI assets in public/ directory');
