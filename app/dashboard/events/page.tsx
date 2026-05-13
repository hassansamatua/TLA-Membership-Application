"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FiCalendar,
  FiMapPin,
  FiUsers,
  FiClock,
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiX,
} from 'react-icons/fi';
import { Surface, PageHeader, StatusBadge, EmptyState } from '@/components/ui';

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
      const response = await fetch('/api/events', { credentials: 'include' });
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
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error registering for event:', error);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-TZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatShortDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-TZ', {
      month: 'short',
      day: 'numeric',
    });

  const formatTime = (timeString: string) => {
    const d = new Date(timeString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });
    }
    return timeString.slice(0, 5);
  };

  const isUpcoming = (event: Event) => new Date(event.start_time) > new Date();
  const isFullyBooked = (event: Event) => event.current_attendees >= event.capacity;
  const isUserRegistered = (event: Event) => event.user_registered > 0;

  if (!user || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const upcomingCount = events.filter(isUpcoming).length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-300"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </button>

        <PageHeader
          eyebrow="Events"
          title="TLA Events"
          description={
            upcomingCount > 0
              ? `${upcomingCount} upcoming event${upcomingCount === 1 ? '' : 's'} — register now to secure your seat.`
              : 'Conferences, workshops, and networking events for members.'
          }
          icon={<FiCalendar className="h-5 w-5" />}
          actions={
            user?.isAdmin && (
              <button
                onClick={() => router.push('/dashboard/events/create')}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                <FiPlus className="h-4 w-4" />
                Create event
              </button>
            )
          }
        />

        {/* Event grid */}
        {events.length === 0 ? (
          <Surface padding="lg">
            <EmptyState
              icon={<FiCalendar className="h-7 w-7" />}
              title="No events scheduled"
              description="Check back soon — we publish new events here whenever they're announced."
            />
          </Surface>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const upcoming = isUpcoming(event);
              const fullyBooked = isFullyBooked(event);
              const registered = isUserRegistered(event);
              return (
                <article
                  key={event.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-white/10 dark:bg-gray-900/60 dark:hover:border-emerald-500/30"
                >
                  {/* Hero with date pill */}
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 90%, rgba(0,0,0,0.25) 0%, transparent 60%)',
                      }}
                    />
                    <FiCalendar className="absolute right-4 top-4 h-7 w-7 text-white/40" />

                    {/* Date pill */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-gray-900/80">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-emerald-50 text-center text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <span className="text-[9px] font-semibold uppercase leading-none">
                          {new Date(event.start_time).toLocaleDateString('en-TZ', { month: 'short' })}
                        </span>
                        <span className="text-base font-bold leading-none">
                          {new Date(event.start_time).getDate()}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {new Date(event.start_time).toLocaleDateString('en-TZ', { weekday: 'long' })}
                        </p>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {formatTime(event.start_time)}
                        </p>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="absolute right-4 bottom-4 flex flex-col items-end gap-1.5">
                      {upcoming ? (
                        <StatusBadge tone="emerald">Upcoming</StatusBadge>
                      ) : (
                        <StatusBadge tone="gray">Past Event</StatusBadge>
                      )}
                      {fullyBooked && upcoming && (
                        <StatusBadge tone="red">Fully booked</StatusBadge>
                      )}
                      {registered && (
                        <StatusBadge tone="blue" icon={<FiCheckCircle className="h-3 w-3" />}>
                          Registered
                        </StatusBadge>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                        {event.description}
                      </p>
                    )}

                    <ul className="mt-4 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <FiMapPin className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="truncate">{event.location || '—'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FiUsers className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                        {event.current_attendees} / {event.capacity} attendees
                      </li>
                    </ul>

                    <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4 dark:border-white/5">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          Fee
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {event.is_free ? 'Free' : `TZS ${event.price?.toLocaleString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                      >
                        <FiEye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </div>

                    {/* Primary action */}
                    <div className="mt-3">
                      {upcoming && !fullyBooked && !registered && (
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowRegistrationModal(true);
                          }}
                          className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                        >
                          Register now
                        </button>
                      )}
                      {registered && (
                        <button
                          disabled
                          className="w-full rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30"
                        >
                          ✓ You're registered
                        </button>
                      )}
                      {!upcoming && (
                        <button
                          disabled
                          className="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400 dark:bg-white/5 dark:text-gray-500"
                        >
                          Event ended
                        </button>
                      )}
                      {fullyBooked && upcoming && !registered && (
                        <button
                          disabled
                          className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
                        >
                          Fully booked
                        </button>
                      )}
                    </div>

                    {/* Admin row */}
                    {user?.isAdmin && (
                      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/events/${event.id}/registrations`)
                          }
                          className="flex-1 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
                        >
                          Registrations
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-emerald-700 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-emerald-300"
                          title="Edit event"
                          aria-label="Edit event"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/events/${event.id}/delete`)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          title="Delete event"
                          aria-label="Delete event"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Event Details Modal */}
        {selectedEvent && !showRegistrationModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-32 overflow-hidden rounded-t-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35) 0%, transparent 60%)',
                  }}
                />
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 transition-colors hover:bg-white dark:bg-gray-900/80 dark:text-gray-300"
                  aria-label="Close"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {selectedEvent.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isUpcoming(selectedEvent) ? (
                    <StatusBadge tone="emerald">Upcoming</StatusBadge>
                  ) : (
                    <StatusBadge tone="gray">Past Event</StatusBadge>
                  )}
                  {isFullyBooked(selectedEvent) && (
                    <StatusBadge tone="red">Fully booked</StatusBadge>
                  )}
                  {isUserRegistered(selectedEvent) && (
                    <StatusBadge tone="blue" icon={<FiCheckCircle className="h-3 w-3" />}>
                      You're registered
                    </StatusBadge>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Description
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                    <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <FiCalendar className="h-3.5 w-3.5" />
                      Date &amp; time
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(selectedEvent.start_time)}
                    </dd>
                    <dd className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(selectedEvent.start_time)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                    <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <FiMapPin className="h-3.5 w-3.5" />
                      Location
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedEvent.location || '—'}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Fee
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {selectedEvent.is_free
                        ? 'Free'
                        : `TZS ${selectedEvent.price?.toLocaleString()}`}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-white/5 dark:bg-white/[0.03]">
                    <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <FiUsers className="h-3.5 w-3.5" />
                      Availability
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedEvent.current_attendees} / {selectedEvent.capacity} spots taken
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                  >
                    Close
                  </button>
                  {isUpcoming(selectedEvent) &&
                    !isFullyBooked(selectedEvent) &&
                    !isUserRegistered(selectedEvent) && (
                      <button
                        onClick={() => setShowRegistrationModal(true)}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                      >
                        Register now
                      </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registration Modal */}
        {showRegistrationModal && selectedEvent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
            onClick={() => setShowRegistrationModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Confirm registration
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                You're about to register for the event below.
              </p>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedEvent.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(selectedEvent.start_time)} · {formatTime(selectedEvent.start_time)}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Cost</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                    {selectedEvent.is_free
                      ? 'Free'
                      : `TZS ${selectedEvent.price?.toLocaleString()}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Spots available</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedEvent.capacity - selectedEvent.current_attendees}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowRegistrationModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegister(selectedEvent.id)}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
