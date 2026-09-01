import './globals.css';

export const metadata = {
  title: 'Multi-Tenant Project Management System',
  description: 'SaaS Multi-Tenant Project Management Platform built with Next.js & MongoDB',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-slate-100 bg-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
