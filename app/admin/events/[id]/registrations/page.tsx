"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiUsers, FiCalendar, FiMapPin, FiCheck, FiX, FiClock, FiLoader } from 'react-icons/fi';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
}

interface Registration {
  registration_id: number;
  user_id: number;
  name: string;
  email: string;
  membership_number: string;
  phone: string;
  registered_at: string;
  status: string;
}

interface Statistics {
  total_registered: number;
  confirmed: number;
  cancelled: number;
  attended: number;
}

export default function AdminEventRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = useState<string>('');
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params;
      setEventId(resolvedParams.id);
    };
    initParams();
  }, [params]);

  useEffect(() => {
    if (eventId) {
      fetchRegistrations();
    }
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/registrations`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }

      const data = await response.json();
      setEvent(data.event);
      setRegistrations(data.registrations);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (registrationId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchRegistrations(); // Refresh the data
      }
    } catch (error) {
      console.error('Error updating registration status:', error);
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      registered: { color: 'bg-blue-100 text-blue-800', icon: FiClock, label: 'Registered' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: FiX, label: 'Cancelled' },
      attended: { color: 'bg-green-100 text-green-800', icon: FiCheck, label: 'Attended' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.registered;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <FiLoader className="animate-spin h-8 w-8 text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/events')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back to Events
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Registrations</h1>
            
            {event && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <FiCalendar className="h-4 w-4 mr-1" />
                    {formatDate(event.date)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FiMapPin className="h-4 w-4 mr-1" />
                    {event.location}
                  </div>
                </div>
                
                {statistics && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{statistics.total_registered}</div>
                      <div className="text-sm text-gray-600">Total Registered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{statistics.confirmed}</div>
                      <div className="text-sm text-gray-600">Confirmed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{statistics.attended}</div>
                      <div className="text-sm text-gray-600">Attended</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Registered Participants</h2>
          </div>
          
          {registrations.length === 0 ? (
            <div className="text-center py-12">
              <FiUsers className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No registrations yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membership
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registrations.map((registration) => (
                    <tr key={registration.registration_id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{registration.name}</div>
                        <div className="text-sm text-gray-500">ID: {registration.user_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{registration.email}</div>
                        <div className="text-sm text-gray-500">{registration.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{registration.membership_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(registration.registered_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(registration.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {registration.status === 'registered' && (
                            <>
                              <button
                                onClick={() => updateRegistrationStatus(registration.registration_id, 'attended')}
                                className="text-green-600 hover:text-green-900"
                                title="Mark as Attended"
                              >
                                <FiCheck className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateRegistrationStatus(registration.registration_id, 'cancelled')}
                                className="text-red-600 hover:text-red-900"
                                title="Cancel Registration"
                              >
                                <FiX className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {registration.status === 'cancelled' && (
                            <button
                              onClick={() => updateRegistrationStatus(registration.registration_id, 'registered')}
                              className="text-blue-600 hover:text-blue-900"
                              title="Restore Registration"
                            >
                              <FiClock className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
