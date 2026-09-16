import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[var(--bg-canvas)] text-[var(--text-on-dark)] transition-colors duration-200">
      <main className="w-full flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
}
