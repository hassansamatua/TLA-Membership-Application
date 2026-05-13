'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './web/navbar';
import { Footer } from './web/footer';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

// Only the auth pages render a true full-page shell with no global chrome.
// Dashboard / admin keep the public navbar at the top (it carries the
// theme toggle + user identity + global navigation) alongside their own
// sidebar — that's the intended app pattern.
const APP_SHELL_PREFIXES = ['/auth'];

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname() || '/';
  const isAppShell = APP_SHELL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isAppShell) {
    // Let the route's own layout (e.g. app/dashboard/layout.tsx,
    // app/admin/layout.tsx) own the chrome end-to-end.
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
