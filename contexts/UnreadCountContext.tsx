'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UnreadCountContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
}

interface NewsCountEvent {
  type: 'increment' | 'decrement' | 'set';
  count: number;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(undefined);

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const response = await fetch('/api/news?limit=1', { 
        credentials: 'include',
        cache: 'no-store' 
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  };

  // Listen for real-time updates from news page
  useEffect(() => {
    const handleNewsCountUpdate = (event: CustomEvent<NewsCountEvent>) => {
      const { type, count } = event.detail;
      
      switch (type) {
        case 'increment':
          setUnreadCount(prev => prev + count);
          break;
        case 'decrement':
          setUnreadCount(prev => Math.max(0, prev - count));
          break;
        case 'set':
          setUnreadCount(count);
          break;
      }
    };

    // Add event listener
    window.addEventListener('newsCountUpdate', handleNewsCountUpdate as EventListener);

    // Initial load
    refreshUnreadCount();

    // Cleanup
    return () => {
      window.removeEventListener('newsCountUpdate', handleNewsCountUpdate as EventListener);
    };
  }, []);

  return (
    <UnreadCountContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error('useUnreadCount must be used within an UnreadCountProvider');
  }
  return context;
}
