import React from 'react';

interface SharedLayoutProps {
  children: React.ReactNode;
}

export default function SharedLayout({ children }: SharedLayoutProps) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
