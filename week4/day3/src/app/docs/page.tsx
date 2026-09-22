"use client";

import { useEffect } from "react";
import Script from "next/script";
import Link from "next/link";

export default function SwaggerDocsPage() {
  useEffect(() => {
    // When scripts load, SwaggerUIBundle is available on window
    const initSwagger = () => {
      // @ts-expect-error - SwaggerUIBundle is attached to window by the CDN script
      if (typeof window !== "undefined" && window.SwaggerUIBundle) {
        // @ts-expect-error - SwaggerUIBundle is attached to window
        window.SwaggerUIBundle({
          url: "/swagger.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [
            // @ts-expect-error - SwaggerUIBundle presets
            window.SwaggerUIBundle.presets.apis,
            // @ts-expect-error - SwaggerUIStandalonePreset
            window.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
        });
      }
    };

    const interval = setInterval(() => {
      // @ts-expect-error - check SwaggerUIBundle existence
      if (typeof window !== "undefined" && window.SwaggerUIBundle) {
        initSwagger();
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css"
      />
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              OpenAPI 3.0
            </span>
            <h1 className="text-lg font-bold text-white">
              Team Collab SaaS API Reference
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/swagger.json"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              Raw OpenAPI JSON
            </a>
            <Link
              href="/dashboard"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              Go to App
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-xl border border-slate-800 bg-white p-6 shadow-2xl">
          <div id="swagger-ui" />
        </div>
      </main>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
