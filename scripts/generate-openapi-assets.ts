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
      --bg-dark: #0b0f17;
      --card-dark: #0f172a;
      --border-dark: #1e293b;
      --accent-cyan: #06b6d4;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      background-color: var(--card-dark) !important;
      border-bottom: 1px solid var(--border-dark);
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
      color: #fff;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0.05em;
    }
    .topbar-brand .logo-icon {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #0284c7, #06b6d4);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 13px;
    }
    .topbar-brand span.badge {
      background: rgba(6, 182, 212, 0.15);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.3);
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
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .btn-download:hover {
      background: rgba(56, 189, 248, 0.2);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .btn-app {
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid #334155;
    }
    .btn-app:hover {
      background: #334155;
      color: #fff;
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
      color: #f8fafc;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .swagger-ui .info p, .swagger-ui .info li {
      color: var(--text-muted);
      line-height: 1.6;
    }
    .swagger-ui .scheme-container {
      background: var(--card-dark);
      border: 1px solid var(--border-dark);
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .swagger-ui .schemes-title {
      color: #cbd5e1;
      font-weight: 600;
    }
    .swagger-ui .opblock {
      background: var(--card-dark) !important;
      border-radius: 10px !important;
      border: 1px solid var(--border-dark) !important;
      box-shadow: none !important;
      margin-bottom: 12px !important;
    }
    .swagger-ui .opblock .opblock-summary {
      border-color: var(--border-dark) !important;
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
      color: #f1f5f9;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
    }
    .swagger-ui .opblock .opblock-summary-description {
      color: #94a3b8;
      font-size: 12px;
    }
    .swagger-ui .opblock-description-wrapper p, 
    .swagger-ui .opblock-external-docs-wrapper p, 
    .swagger-ui .opblock-title_normal p {
      color: #cbd5e1;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: var(--text-muted);
      border-bottom-color: var(--border-dark);
      font-size: 12px;
    }
    .swagger-ui .parameter__name {
      color: #f1f5f9;
      font-family: monospace;
    }
    .swagger-ui .parameter__name.required:after {
      color: #f43f5e;
    }
    .swagger-ui .parameter__type {
      color: #38bdf8;
      font-family: monospace;
    }
    .swagger-ui .response-col_status {
      color: #f8fafc;
      font-weight: 700;
    }
    .swagger-ui section.models {
      border: 1px solid var(--border-dark);
      border-radius: 12px;
      background: var(--card-dark);
      margin-top: 32px;
    }
    .swagger-ui section.models h4 {
      color: #f8fafc;
      font-weight: 700;
    }
    .swagger-ui .btn.authorize {
      color: #10b981;
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 8px;
    }
    .swagger-ui .btn.authorize svg {
      fill: #10b981;
    }
    .swagger-ui .btn.execute {
      background-color: #0284c7;
      border-color: #0284c7;
      color: #fff;
      border-radius: 6px;
    }
    .swagger-ui input[type=text], .swagger-ui textarea {
      background: #0b0f17;
      border: 1px solid #334155;
      color: #f8fafc;
      border-radius: 6px;
    }
    .swagger-ui select {
      background: #0b0f17;
      border: 1px solid #334155;
      color: #f8fafc;
      border-radius: 6px;
    }
    .swagger-ui .responses-inner {
      padding: 16px;
      background: rgba(11, 15, 23, 0.6);
      border-radius: 8px;
    }
    .swagger-ui .highlight-code {
      background: #0b0f17 !important;
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
