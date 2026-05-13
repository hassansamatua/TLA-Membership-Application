'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/contexts/UnreadCountContext';
import { toast } from 'react-toastify';
import { 
  FiBell, 
  FiCalendar,
  FiUser,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiInfo,
  FiMessageSquare,
  FiSend,
  FiRefreshCw,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';

interface News {
  id: number;
  title: string;
  message: string;
  type: 'news' | 'notification' | 'announcement' | 'urgent';
  sender_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentAt: string;
  is_read: boolean;
}

export default function NewsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const { unreadCount, setUnreadCount, refreshUnreadCount } = useUnreadCount();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const currentPageRef = useRef(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated) {
      fetchNews(1, false);
      setIsAutoRefreshing(true); // Set to true when auto-refresh starts
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchNewsWithAutoRefresh(currentPageRef.current, true); // Silent refresh with current page
      }, 30000);
      
      return () => {
        clearInterval(interval);
        setIsAutoRefreshing(false); // Set to false when component unmounts
      };
    }
  }, [isAuthenticated, authLoading, router]);

  // Update the ref when pagination changes
  useEffect(() => {
    currentPageRef.current = pagination.page;
  }, [pagination.page]);

  // Listen for real-time news updates from other tabs
  useEffect(() => {
    const handleNewsUpdate = (event: CustomEvent) => {
      console.log('📡 Real-time news update received:', event.detail);
      fetchNewsWithAutoRefresh(currentPageRef.current, true); // Refresh news when updates occur
    };

    window.addEventListener('newsUpdate', handleNewsUpdate as EventListener);
    return () => window.removeEventListener('newsUpdate', handleNewsUpdate as EventListener);
  }, []);

  const fetchNews = async (page = 1, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`/api/news?page=${page}&limit=${pagination.limit}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
        setPagination(data.pagination);
        // The unread count is now managed by the context
        await refreshUnreadCount();
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchNewsWithAutoRefresh = async (page = 1, silent = false) => {
    if (silent && isAutoRefreshing) {
      // Show brief indicator when auto-refreshing
      setIsAutoRefreshing(false);
      await fetchNews(page, silent);
      setTimeout(() => setIsAutoRefreshing(true), 500);
    } else {
      await fetchNews(page, silent);
    }
  };

  const toggleReadStatus = async (id: number) => {
    try {
      console.log('🔄 Toggling news item read status:', id);
      
      // Find the news item to check current status
      const newsItem = news.find(item => item.id === id);
      if (!newsItem) {
        console.error('❌ News item not found:', id);
        return;
      }
      
      const wasRead = newsItem.is_read;
      const newStatus = !wasRead;
      
      // Optimistic UI update - update local state immediately
      setNews(prev => prev.map(item => 
        item.id === id 
          ? { ...item, is_read: newStatus }
          : item
      ));
      
      // Show brief loading state on the button
      const buttonElement = document.getElementById(`toggle-btn-${id}`);
      if (buttonElement) {
        buttonElement.classList.add('opacity-50', 'cursor-not-allowed');
      }
      
      try {
        // Call API to update database
        const response = await fetch(`/api/news/${id}/${newStatus ? 'read' : 'unread'}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`✅ News item marked as ${newStatus ? 'read' : 'unread'} successfully`, result);
        
        // Emit appropriate events for real-time updates
        if (wasRead && !newStatus) {
          // Changed from read to unread
          window.dispatchEvent(new CustomEvent('newsCountUpdate', {
            detail: { type: 'increment', count: 1 }
          }));
          
          window.dispatchEvent(new CustomEvent('newsUpdate', {
            detail: { action: 'marked_as_unread', newsId: id }
          }));
        } else if (!wasRead && newStatus) {
          // Changed from unread to read
          window.dispatchEvent(new CustomEvent('newsCountUpdate', {
            detail: { type: 'decrement', count: 1 }
          }));
          
          window.dispatchEvent(new CustomEvent('newsUpdate', {
            detail: { action: 'marked_as_read', newsId: id }
          }));
        }

        // Refresh unread count to ensure consistency
        await refreshUnreadCount();
        
      } catch (apiError) {
        console.error('❌ API Error:', apiError);
        
        // Revert local state if API call fails
        setNews(prev => prev.map(item => 
          item.id === id 
            ? { ...item, is_read: wasRead }
            : item
        ));
        
        // Show user-friendly error message
        const errorMessage = apiError instanceof Error 
          ? apiError.message 
          : `Failed to mark as ${newStatus ? 'read' : 'unread'}`;
        
        // Show error toast
        toast.error(errorMessage, {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        console.error('❌ Operation failed:', errorMessage);
        throw apiError;
      } finally {
        // Remove loading state from button
        if (buttonElement) {
          buttonElement.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
      
    } catch (error) {
      console.error(`❌ Error toggling read status for item ${id}:`, error);
      // Re-throw to allow calling code to handle if needed
    }
  };

  const markAsRead = async (id: number) => {
    // Keep for backward compatibility, but use toggle
    await toggleReadStatus(id);
  };

  const markAllAsRead = async () => {
    const unreadNews = news.filter(item => !item.is_read);
    if (unreadNews.length === 0) {
      console.log('ℹ️ No unread news to mark as read');
      return;
    }

    setIsBulkUpdating(true);
    try {
      console.log(`🔄 Marking ${unreadNews.length} items as read`);
      
      // Optimistic UI update - mark all as read immediately
      setNews(prev => prev.map(item => ({ ...item, is_read: true })));
      
      // Track successful and failed operations
      let successCount = 0;
      let failedCount = 0;
      const failedIds: number[] = [];
      
      // Process in parallel with error handling
      await Promise.allSettled(
        unreadNews.map(async (item) => {
          try {
            const response = await fetch(`/api/news/${item.id}/read`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              successCount++;
              // Emit event for each successful read
              window.dispatchEvent(new CustomEvent('newsCountUpdate', {
                detail: { type: 'decrement', count: 1 }
              }));
            } else {
              throw new Error(`HTTP ${response.status}`);
            }
          } catch (error) {
            failedCount++;
            failedIds.push(item.id);
            console.error(`❌ Failed to mark item ${item.id} as read:`, error);
          }
        })
      );
      
      // Refresh unread count to ensure consistency
      await refreshUnreadCount();
      
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} out of ${unreadNews.length} items failed to mark as read`);
        // Optionally revert failed items to unread state
        setNews(prev => prev.map(item => 
          failedIds.includes(item.id) ? { ...item, is_read: false } : item
        ));
        
        // Show partial success toast
        toast.warning(`Marked ${successCount} of ${unreadNews.length} items as read. ${failedCount} failed.`, {
          position: 'top-right',
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        console.log(`✅ Successfully marked all ${successCount} items as read`);
        
        // Show success toast
        toast.success(`Successfully marked all ${successCount} items as read`, {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      
    } catch (error) {
      console.error('❌ Error in markAllAsRead:', error);
      // Revert all changes on major error
      setNews(prev => prev.map(item => 
        unreadNews.find(unreadItem => unreadItem.id === item.id) 
          ? { ...item, is_read: false } 
          : item
      ));
      
      // Show error toast
      toast.error('Failed to mark all items as read. Please try again.', {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const markAllAsUnread = async () => {
    const readNews = news.filter(item => item.is_read);
    if (readNews.length === 0) {
      console.log('ℹ️ No read news to mark as unread');
      return;
    }

    setIsBulkUpdating(true);
    try {
      console.log(`🔄 Marking ${readNews.length} items as unread`);
      
      // Optimistic UI update - mark all as unread immediately
      setNews(prev => prev.map(item => ({ ...item, is_read: false })));
      
      // Track successful and failed operations
      let successCount = 0;
      let failedCount = 0;
      const failedIds: number[] = [];
      
      // Process in parallel with error handling
      await Promise.allSettled(
        readNews.map(async (item) => {
          try {
            const response = await fetch(`/api/news/${item.id}/unread`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              successCount++;
              // Emit event for each successful unread
              window.dispatchEvent(new CustomEvent('newsCountUpdate', {
                detail: { type: 'increment', count: 1 }
              }));
            } else {
              throw new Error(`HTTP ${response.status}`);
            }
          } catch (error) {
            failedCount++;
            failedIds.push(item.id);
            console.error(`❌ Failed to mark item ${item.id} as unread:`, error);
          }
        })
      );
      
      // Refresh unread count to ensure consistency
      await refreshUnreadCount();
      
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} out of ${readNews.length} items failed to mark as unread`);
        // Optionally revert failed items to read state
        setNews(prev => prev.map(item => 
          failedIds.includes(item.id) ? { ...item, is_read: true } : item
        ));
        
        // Show partial success toast
        toast.warning(`Marked ${successCount} of ${readNews.length} items as unread. ${failedCount} failed.`, {
          position: 'top-right',
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        console.log(`✅ Successfully marked all ${successCount} items as unread`);
        
        // Show success toast
        toast.success(`Successfully marked all ${successCount} items as unread`, {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      
    } catch (error) {
      console.error('❌ Error in markAllAsUnread:', error);
      // Revert all changes on major error
      setNews(prev => prev.map(item => 
        readNews.find(readItem => readItem.id === item.id) 
          ? { ...item, is_read: true } 
          : item
      ));
      
      // Show error toast
      toast.error('Failed to mark all items as unread. Please try again.', {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <FiAlertTriangle className="h-5 w-5" />;
      case 'announcement': return <FiSend className="h-5 w-5" />;
      case 'notification': return <FiBell className="h-5 w-5" />;
      default: return <FiMessageSquare className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'announcement': return 'text-purple-600 bg-purple-100';
      case 'notification': return 'text-blue-600 bg-blue-100';
      default: return 'text-emerald-600 bg-emerald-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'low': return 'border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/[0.03]';
      default: return 'border-yellow-500 bg-yellow-50';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-100"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">News & Notifications</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isBulkUpdating}
                  className={`text-sm font-medium transition-all duration-200 ${
                    isBulkUpdating 
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 hover:underline'
                  }`}
                >
                  {isBulkUpdating ? 'Processing...' : 'Mark all as read'}
                </button>
              )}
              {unreadCount < news.length && news.length > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={markAllAsUnread}
                    disabled={isBulkUpdating}
                    className={`text-sm font-medium transition-all duration-200 ${
                      isBulkUpdating 
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                        : 'text-blue-600 hover:text-blue-700 hover:underline'
                    }`}
                  >
                    {isBulkUpdating ? 'Processing...' : 'Mark all as unread'}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchNews(pagination.page)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-200 transition-colors"
                title="Refresh news"
              >
                <FiRefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="relative">
                <FiBell className="h-6 w-6 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {isAutoRefreshing ? (
                  <>
                    <FiWifi className="h-3 w-3 text-emerald-500" />
                    <span className="ml-1">Live</span>
                  </>
                ) : (
                  <>
                    <FiWifiOff className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    <span className="ml-1">Offline</span>
                  </>
                )}
              </div>
            </div>
            {lastUpdated && (
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Unread Count Banner */}
        {unreadCount > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r">
            <div className="flex items-center">
              <FiInfo className="h-5 w-5 text-blue-400 mr-2" />
              <p className="text-sm text-blue-700">
                You have {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </p>
            </div>
          </div>
        )}

        {/* News List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
            </div>
          ) : news.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
              <FiBell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No news yet</h3>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Check back later for updates and announcements</p>
            </div>
          ) : (
            news.map((newsItem, index) => (
              <div
                key={`${newsItem.id}-${newsItem.sentAt}-${index}`}
                className={`bg-white dark:bg-gray-900 rounded-lg shadow border-l-4 ${getPriorityColor(newsItem.priority)} ${
                  !newsItem.is_read ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${getTypeColor(newsItem.type)}`}>
                        {getTypeIcon(newsItem.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className={`text-lg font-medium ${!newsItem.is_read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 dark:text-gray-500'}`}>
                            {newsItem.title}
                          </h3>
                          {!newsItem.is_read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(newsItem.type)}`}>
                            {newsItem.type}
                          </span>
                        </div>
                        <p className={`${!newsItem.is_read ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 dark:text-gray-500'} mb-3`}>
                          {newsItem.message}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <div className="flex items-center">
                            <FiUser className="h-4 w-4 mr-1" />
                            {newsItem.sender_name}
                          </div>
                          <div className="flex items-center">
                            <FiCalendar className="h-4 w-4 mr-1" />
                            {new Date(newsItem.sentAt).toLocaleDateString()} at {new Date(newsItem.sentAt).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center">
                            Priority: <span className="ml-1 font-medium capitalize">{newsItem.priority}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
                              {newsItem.is_read ? (
                                <>
                                  <FiCheck className="h-3 w-3 mr-1 text-emerald-500" />
                                  <span className="text-emerald-600">Read</span>
                                </>
                              ) : (
                                <>
                                  <div className="h-2 w-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                                  <span className="text-blue-600">Unread</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        id={`toggle-btn-${newsItem.id}`}
                        onClick={() => toggleReadStatus(newsItem.id)}
                        className={`p-2 rounded-md transition-all duration-200 transform hover:scale-105 ${
                          newsItem.is_read 
                            ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700' 
                            : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-300'
                        }`}
                        title={newsItem.is_read ? "Mark as unread" : "Mark as read"}
                      >
                        {newsItem.is_read ? (
                          <FiX className="h-4 w-4" />
                        ) : (
                          <FiCheck className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} news
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchNews(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 dark:border-white/15 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-white/[0.03]"
              >
                Previous
              </button>
              <button
                onClick={() => fetchNews(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-white/15 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-white/[0.03]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for Quick Refresh */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => fetchNews(pagination.page)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
          title="Refresh news"
        >
          <FiRefreshCw className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
