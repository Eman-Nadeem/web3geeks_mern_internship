import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <header className="border-b border-slate-800 pb-8 mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider">
            Day 2 Backend Skeleton Ready
          </span>
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-full uppercase tracking-wider">
            Next.js 14 App Router
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          Multi-Tenant Project Management System
        </h1>
        <p className="mt-3 text-lg text-slate-400 max-w-3xl">
          Technical foundation, database connection engine, Mongoose schemas, tenant isolation layer (<code className="text-blue-300">orgId</code> discriminator), and seed runners are initialized and active.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">System Diagnostics</h3>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-sm text-slate-300 mb-6">
            Test the live server readiness and MongoDB database connection state.
          </p>
          <Link
            href="/api/health"
            target="_blank"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
          >
            <span>Run Health Check (/api/health)</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Tenant Isolation Layer</h3>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded font-mono font-medium">withTenant</span>
          </div>
          <p className="text-sm text-slate-300">
            Discriminator column strategy enforces indexed <code className="text-blue-300">orgId</code> on all database queries via <code className="text-slate-200">lib/tenantScoping.ts</code>.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Mongoose Schemas</h3>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded font-mono font-medium">7 Collections</span>
          </div>
          <p className="text-sm text-slate-300">
            Schemas defined for Organizations, Users, Projects, Tasks, Teams, Notifications, and Audit Logs.
          </p>
        </div>
      </div>

      <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Core Architectural Stack Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-xs font-semibold mb-1">DATABASE ENGINE</div>
            <div className="text-white font-medium">MongoDB Atlas (Mongoose)</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-xs font-semibold mb-1">DATA ISOLATION</div>
            <div className="text-white font-medium">orgId Discriminator Column</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-xs font-semibold mb-1">MIDDLEWARE</div>
            <div className="text-white font-medium">Edge Tenant Context Stub</div>
          </div>
          <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-xs font-semibold mb-1">SEED RUNNER</div>
            <div className="text-white font-medium">npm run seed</div>
          </div>
        </div>
      </section>
    </main>
  );
}
