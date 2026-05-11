"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiMessageSquare, FiSend, FiInbox, FiArrowLeft, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  subject: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_name: string;
  receiver_name: string;
  sender_email: string;
  receiver_email: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMessages();
  }, [user, router]);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages', {
        credentials: 'include',
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (messageId: number) => {
    if (!replyContent.trim()) return;

    setReplyLoading(true);
    try {
      const response = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messageId: messageId,
          content: replyContent,
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setShowReplyBox(false);
        setSelectedMessage(null);
        await fetchMessages(); // Refresh messages
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      await fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleDelete = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-TZ', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isUnread = (message: Message) => !message.read_at;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">
            Communication with TLA administration and members
          </p>
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <p className="text-sm text-gray-600">
              {messages.filter(m => !m.read_at).length} unread messages
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiInbox className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isUnread(message) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isUnread(message) ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <FiMessageSquare className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="font-medium text-gray-900">{message.sender_name}</p>
                          <p className="text-sm text-gray-600">{message.sender_email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatTime(message.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-900 mb-2">
                        <p className="font-medium">{message.subject}</p>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {message.content}
                      </div>
                      
                      {selectedMessage?.id === message.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <button
                              onClick={() => handleMarkAsRead(message.id)}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            >
                              Mark as Read
                            </button>
                            <button
                              onClick={() => setShowReplyBox(true)}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              Reply
                            </button>
                            <button
                              onClick={() => handleDelete(message.id)}
                              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                          
                          {showReplyBox && (
                            <div className="mt-3">
                              <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="Type your reply..."
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <button
                                  onClick={() => setShowReplyBox(false)}
                                  className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReply(message.id)}
                                  disabled={replyLoading || !replyContent.trim()}
                                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {replyLoading ? 'Sending...' : 'Send Reply'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
