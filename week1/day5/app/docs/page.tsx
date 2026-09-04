'use client';

import { useEffect } from 'react';

export default function SwaggerDocsPage() {
  useEffect(() => {
    // Dynamically inject Swagger UI Bundle CSS & JS from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      // @ts-ignore
      if (window.SwaggerUIBundle) {
        // @ts-ignore
        window.SwaggerUIBundle({
          url: '/api/docs',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            // @ts-ignore
            window.SwaggerUIBundle.presets.apis,
            // @ts-ignore
            window.SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div className="bg-slate-900 min-h-screen">
      <header className="bg-slate-800 border-b border-slate-700 p-4 text-white flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Interactive API Swagger Documentation</h1>
          <p className="text-xs text-slate-400">Multi-Tenant Projects, Tasks & Teams System</p>
        </div>
        <a
          href="/api/docs"
          target="_blank"
          className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded transition"
        >
          View Raw OpenAPI Spec JSON (/api/docs)
        </a>
      </header>
      <div id="swagger-ui" className="p-4 bg-white min-h-[calc(100vh-65px)]" />
    </div>
  );
}
