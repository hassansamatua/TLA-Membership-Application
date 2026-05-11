import { useState, useEffect } from 'react';

interface ContactCountEvent {
  type: 'increment' | 'decrement' | 'set';
  count: number;
}

export function useRealTimeContactCount() {
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    // Listen for custom events from contact submissions page
    const handleContactCountUpdate = (event: CustomEvent<ContactCountEvent>) => {
      const { type, count } = event.detail;
      
      switch (type) {
        case 'increment':
          setContactCount(prev => prev + count);
          break;
        case 'decrement':
          setContactCount(prev => Math.max(0, prev - count));
          break;
        case 'set':
          setContactCount(count);
          break;
      }
    };

    // Add event listener
    window.addEventListener('contactCountUpdate', handleContactCountUpdate as EventListener);

    // Initial fetch
    fetchContactCount();

    // Cleanup
    return () => {
      window.removeEventListener('contactCountUpdate', handleContactCountUpdate as EventListener);
    };
  }, []);

  const fetchContactCount = async () => {
    try {
      const response = await fetch('/api/admin/contact-submissions', { credentials: 'include' });
      if (response.ok) {
        const submissions = await response.json();
        const unreadCount = submissions.filter((s: any) => s.read_status === 0).length;
        setContactCount(unreadCount);
      }
    } catch (error) {
      console.error('Error fetching contact count:', error);
    }
  };

  return { contactCount, refetchContactCount: fetchContactCount };
}
