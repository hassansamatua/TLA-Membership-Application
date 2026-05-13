'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiClock,
  FiDollarSign,
  FiImage,
  FiCheck,
  FiX,
  FiEye,
} from 'react-icons/fi';

interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  created_by_email?: string;
}

interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  name: string;
  email: string;
  phone: string | null;
  registered_at: string;
  status: 'registered' | 'cancelled' | 'attended';
}

export default function EventDetailPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (eventId) {
      fetchEventDetails();
      fetchRegistrations();
    }
  }, [isAuthLoading, isAuthenticated, user, eventId, router]);

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Event not found');
          router.push('/admin/events');
          return;
        }
        throw new Error('Failed to fetch event details');
      }
      const data = await response.json();
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/registrations`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete event');

      toast.success('Event deleted successfully');
      router.push('/admin/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: Event['status']) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to update event status');

      setEvent(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Event marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating event status:', error);
      toast.error('Failed to update event status');
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  if (!event) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/admin/events')}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-emerald-100 text-emerald-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/events')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-gray-600">Event Details and Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push(`/admin/events/${eventId}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <FiEdit2 className="mr-2 h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <FiTrash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Image section removed as it's not in the database schema */}

          {/* Event Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <FiCalendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Date & Time</p>
                  <p className="text-gray-600">
                    {new Date(event.start_time).toLocaleDateString()} at {new Date(event.start_time).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    to {new Date(event.end_time).toLocaleDateString()} at {new Date(event.end_time).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <FiMapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Location</p>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>

              <div className="flex items-start">
                <FiUsers className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Capacity</p>
                  <p className="text-gray-600">
                    Up to {event.capacity} attendees
                  </p>
                </div>
              </div>

              {/* Price section removed as it's not in the database schema */}

              <div>
                <p className="font-medium text-gray-900 mb-2">Description</p>
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Status</h3>
            <div className="space-y-3">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(event.status)}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
              
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600 mb-3">Update Status:</p>
                <div className="space-y-2">
                  {event.status !== 'upcoming' && (
                    <button
                      onClick={() => handleStatusUpdate('upcoming')}
                      className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Mark as Upcoming
                    </button>
                  )}
                  {event.status !== 'ongoing' && (
                    <button
                      onClick={() => handleStatusUpdate('ongoing')}
                      className="w-full text-left px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100"
                    >
                      Mark as Ongoing
                    </button>
                  )}
                  {event.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {event.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusUpdate('cancelled')}
                      className="w-full text-left px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                    >
                      Cancel Event
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Registrations Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Registrations</h3>
              <button
                onClick={() => setShowRegistrations(!showRegistrations)}
                className="text-emerald-600 hover:text-emerald-700"
              >
                <FiEye className="h-5 w-5" />
              </button>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {registrations.length}
            </p>
            <p className="text-sm text-gray-600">Total registered</p>
            
            {showRegistrations && (
              <div className="mt-4 pt-4 border-t">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {registrations.map((reg) => (
                    <div key={reg.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{reg.name}</p>
                        <p className="text-gray-600">{reg.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        reg.status === 'registered' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : reg.status === 'attended'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reg.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meta Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meta Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Event ID:</span>
                <span className="font-medium">#{event.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">
                  {new Date(event.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
