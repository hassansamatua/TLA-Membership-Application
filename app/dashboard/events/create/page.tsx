'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiArrowLeft, FiSave, FiX, FiDollarSign } from 'react-icons/fi';

export default function CreateEventPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    location: '',
    capacity: 50,
    isFree: true,
    price: 0,
    fee: '0'
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user && !user.isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => {
      // If toggling the isFree checkbox
      if (name === 'isFree') {
        const isFree = !prev.isFree;
        return {
          ...prev,
          isFree,
          // If making it free, set price to 0, otherwise keep current price or default to 0
          price: isFree ? 0 : (prev.price || 0)
        };
      }
      
      // For other fields
      return {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate || !formData.startTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Calculate end date (use start date if end date not provided)
    const endDate = formData.endDate || formData.startDate;
    const endTime = formData.endTime || formData.startTime;
    
    // Calculate price (0 if free, otherwise parse the fee input)
    const price = formData.isFree ? 0 : parseFloat(formData.fee) || 0;

    try {
      setIsLoading(true);
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start_date: formData.startDate,
          start_time: formData.startTime,
          end_date: endDate,
          end_time: endTime,
          location: formData.location,
          max_attendees: parseInt(formData.capacity as any),
          is_free: formData.isFree,
          price: price,
          status: 'upcoming'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create event');
      }

      toast.success('Event created successfully!');
      router.push('/dashboard/events');
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error(error.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || (user && !user.isAdmin)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <FiArrowLeft className="mr-2" />
            Back to Events
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Event</h1>
          <p className="text-gray-600">Fill in the details below to create a new event</p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Event Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter event title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Describe your event"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Date */}
                <div className="md:col-span-2">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 md:col-span-2">
                  {/* Start Time */}
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                      From <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                      To <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      min={formData.startTime}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="md:col-span-2">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Event location"
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                    Maximum Attendees
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    name="capacity"
                    min="1"
                    value={formData.capacity}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Fee Input */}
                <div className="md:col-span-2">
                  <label htmlFor="fee" className="block text-sm font-medium text-gray-700">
                    Event Fee (TZS)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">TZS</span>
                    </div>
                    <input
                      type="number"
                      id="fee"
                      name="fee"
                      min="0"
                      step="1000"
                      value={formData.fee}
                      onChange={handleChange}
                      className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-16 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                      placeholder="Enter fee amount"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter 0 for free events
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/events')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <FiX className="-ml-1 mr-2 h-5 w-5" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave className="-ml-1 mr-2 h-5 w-5" />
                {isLoading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
