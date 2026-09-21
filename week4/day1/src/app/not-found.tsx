import Link from "next/link";
import { Layers, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f17]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
          <Layers className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">404 - Page Not Found</h1>
          <p className="text-sm text-slate-400">
            The page or resource you are looking for does not exist or you do not have permission to view it.
          </p>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
