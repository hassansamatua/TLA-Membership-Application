'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiClock,
  FiX,
  FiCheck,
} from 'react-icons/fi';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  start_time: string;
  end_time: string;
  location: string;
  maxAttendees: number;
  currentAttendees: number;
  fee: number;
  isFree: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  // For backward compatibility
  price?: number;
}

export default function AdminEventsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxAttendees: 50,
    fee: 0,
    isFree: true
  });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchEvents();
  }, [isAuthLoading, isAuthenticated, user]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/events', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing ? `/api/admin/events/${selectedEvent?.id}` : '/api/admin/events';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} event`);

      toast.success(`Event ${isEditing ? 'updated' : 'created'} successfully`);
      setShowEventModal(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} event`);
    }
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    
    // Parse the date and time from the event's start_time if available
    let eventDate = '';
    let eventTime = '';
    
    if (event.start_time) {
      const startDate = new Date(event.start_time);
      eventDate = startDate.toISOString().split('T')[0];
      eventTime = startDate.toTimeString().slice(0, 5); // Gets HH:MM format
    }
    
    setFormData({
      title: event.title || '',
      description: event.description || '',
      date: eventDate || event.date || '',
      time: eventTime || event.time || '',
      location: event.location || '',
      maxAttendees: parseInt(String(event.maxAttendees)) || 50,
      fee: parseFloat(String(event.fee)) || 0,
      isFree: event.isFree || false
    });
    
    setIsEditing(true);
    setShowEventModal(true);
  };

  const handleDelete = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete event');
      setEvents(events.filter(e => e.id !== eventId));
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleCancel = async (eventId: number) => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to cancel event');
      setEvents(events.map(e => 
        e.id === eventId ? { ...e, status: 'cancelled' } : e
      ));
      toast.success('Event cancelled successfully');
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast.error('Failed to cancel event');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      maxAttendees: 50,
      fee: 0,
      isFree: true
    });
    setSelectedEvent(null);
    setIsEditing(false);
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-emerald-100 text-emerald-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
          <p className="text-gray-600">Create and manage library events</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowEventModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <FiPlus className="mr-2 h-4 w-4" />
          Create Event
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by title or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No events found' : 'No events yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first event'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowEventModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Create Event
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2 h-4 w-4" />
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </div>
                  <div className="flex items-center">
                    <FiMapPin className="mr-2 h-4 w-4" />
                    {event.location}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <FiUsers className="mr-2 h-4 w-4" />
                      <span className="font-medium">Registrations</span>
                    </div>
                    <div className="ml-6 text-gray-600">
                      {event.currentAttendees} Total registered
                      {event.maxAttendees > 0 && ` (max ${event.maxAttendees})`}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FiClock className="mr-2 h-4 w-4" />
                    {event.isFree ? 'Free' : `TZS ${event.fee?.toLocaleString()}`}
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/admin/events/${event.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <FiEye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(event)}
                      className="text-emerald-600 hover:text-emerald-900"
                      title="Edit Event"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    {event.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancel(event.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Cancel Event"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Event"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Describe your event"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Event location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Attendees
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.maxAttendees || ''}
                    onChange={(e) => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Fee
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-emerald-600"
                        checked={formData.isFree}
                        onChange={() => setFormData({ ...formData, isFree: true, fee: 0 })}
                      />
                      <span className="ml-2 text-gray-700">Free</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-emerald-600"
                        checked={!formData.isFree}
                        onChange={() => setFormData({ ...formData, isFree: false })}
                      />
                      <span className="ml-2 text-gray-700">Paid</span>
                    </label>
                    {!formData.isFree && (
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">TZS</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-12 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                          value={formData.fee}
                          onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  >
                    {isEditing ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
