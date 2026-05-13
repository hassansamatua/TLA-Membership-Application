"use client";

// Force re-render - updated
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiMapPin, FiUsers, FiClock, FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiEye, FiUsers as FiUserList } from 'react-icons/fi';

interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  capacity: number;
  current_attendees: number;
  user_registered: number;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_free: boolean;
  price: number;
}

export default function EventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchEvents();
  }, [user, router]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', {
        credentials: 'include',
      });
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setShowRegistrationModal(false);
        setSelectedEvent(null);
        await fetchEvents(); // Refresh events
      }
    } catch (error) {
      console.error('Error registering for event:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-TZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM format
  };

  const isUpcoming = (event: Event) => {
    return new Date(event.start_time) > new Date();
  };

  const isFullyBooked = (event: Event) => {
    return event.current_attendees >= event.capacity;
  };

  const isUserRegistered = (event: Event) => {
    return event.user_registered > 0;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">TLA Events - UPDATED</h1>
              <p className="text-gray-600">
                Upcoming conferences, workshops, and networking events
              </p>
            </div>
            
            {user?.isAdmin && (
              <button
                onClick={() => router.push('/dashboard/events/create')}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                <FiPlus className="mr-2 h-4 w-4" />
                Create Event
              </button>
            )}
          </div>
        </div>

        {/* Events List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <FiCalendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No events scheduled</p>
              <p className="text-sm">Check back soon for upcoming TLA events</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Event Image - removed since no image_url field */}
                <div className="h-48 bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                  <FiCalendar className="h-16 w-16 text-white" />
                </div>

                {/* Event Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      isUpcoming(event) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isUpcoming(event) ? 'Upcoming' : 'Past Event'}
                    </span>
                    {isFullyBooked(event) && (
                      <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-800">
                        Fully Booked
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FiCalendar className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(event.start_time)}
                    </div>
                    <div className="flex items-center">
                      <FiClock className="h-4 w-4 mr-2 text-gray-400" />
                      {formatTime(event.start_time)}
                    </div>
                    <div className="flex items-center">
                      <FiMapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {event.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FiUsers className="h-4 w-4 mr-2 text-gray-400" />
                        {event.current_attendees} / {event.capacity} attendees
                      </div>
                      <div className="ml-4 px-2 py-1 bg-gray-100 rounded-md text-sm font-medium text-gray-700">
                        {event.is_free ? 'Free' : `TZS ${event.price?.toLocaleString()}`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gray-900">
                        {event.is_free ? 'Free Event' : `TZS ${event.price?.toLocaleString()}`}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        {user?.isAdmin && (
                          <>
                            <button
                              onClick={() => router.push(`/dashboard/events/${event.id}/registrations`)}
                              className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                              title="View Registrations"
                            >
                              Registrations
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                              className="text-emerald-600 hover:text-emerald-800"
                              title="Edit Event"
                            >
                              <FiEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/events/${event.id}/delete`)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Event"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isUpcoming(event) && !isFullyBooked(event) && !isUserRegistered(event) && (
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowRegistrationModal(true);
                        }}
                        className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors"
                      >
                        Register Now
                      </button>
                    )}

                    {isUserRegistered(event) && (
                      <button
                        disabled
                        className="w-full bg-blue-300 text-blue-700 py-2 px-4 rounded-md cursor-not-allowed"
                      >
                        ✓ Registered
                      </button>
                    )}

                    {!isUpcoming(event) && (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md cursor-not-allowed"
                      >
                        Event Ended
                      </button>
                    )}

                    {isFullyBooked(event) && isUpcoming(event) && !isUserRegistered(event) && (
                      <button
                        disabled
                        className="w-full bg-red-300 text-red-500 py-2 px-4 rounded-md cursor-not-allowed"
                      >
                        Fully Booked
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Event Details Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{selectedEvent.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Date & Time</h4>
                      <p className="text-gray-600">{formatDate(selectedEvent.start_time)}</p>
                      <p className="text-gray-600">{formatTime(selectedEvent.start_time)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Location</h4>
                      <p className="text-gray-600">{selectedEvent.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Fee</h4>
                      <p className="text-gray-600">
                        {selectedEvent.is_free ? 'Free' : `TZS ${selectedEvent.price?.toLocaleString()}`}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Availability</h4>
                      <p className="text-gray-600">
                        {selectedEvent.current_attendees} / {selectedEvent.capacity} spots
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                  {isUpcoming(selectedEvent) && !isFullyBooked(selectedEvent) && (
                    <button
                      onClick={() => setShowRegistrationModal(true)}
                      className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700"
                    >
                      Register Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registration Modal */}
        {showRegistrationModal && selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Registration</h3>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">You're registering for:</p>
                <p className="font-medium text-gray-900">{selectedEvent.title}</p>
                <p className="text-sm text-gray-600">{formatDate(selectedEvent.start_time)}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Cost: Free</p>
                <p className="text-sm text-gray-600">
                  Available spots: {selectedEvent.capacity - selectedEvent.current_attendees}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRegistrationModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegister(selectedEvent.id)}
                  className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700"
                >
                  Confirm Registration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
