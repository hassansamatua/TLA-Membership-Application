'use client';

import { useState, useEffect } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ContactContent {
  id: number;
  section_key: string;
  section_type: 'heading' | 'text' | 'email' | 'phone' | 'address' | 'map_url' | 'social_link';
  content: string;
  order_index: number;
  is_active: boolean;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [contactContent, setContactContent] = useState<ContactContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchContactContent();
  }, []);

  const fetchContactContent = async () => {
    try {
      const response = await fetch('/api/contact-content');
      if (response.ok) {
        const data = await response.json();
        setContactContent(data);
      }
    } catch (error) {
      console.error('Error fetching contact content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'Message sent successfully!');
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        toast.error(result.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback static content
  const staticContent = {
    mainHeading: "Contact Us",
    description: "Get in touch with us for any inquiries about membership, services, or partnerships.",
    email: "info@tla.or.tz",
    phone: "+255 22 211 1234",
    address: "Dar es Salaam, Tanzania"
  };

  // Use database content if available, otherwise use static content
  const mainHeading = contactContent.find(item => item.section_key === 'contact_main_heading')?.content || staticContent.mainHeading;
  const description = contactContent.find(item => item.section_key === 'contact_description')?.content || staticContent.description;
  const email = contactContent.find(item => item.section_key === 'contact_email')?.content || staticContent.email;
  const phone = contactContent.find(item => item.section_key === 'contact_phone')?.content || staticContent.phone;
  const address = contactContent.find(item => item.section_key === 'contact_address')?.content || staticContent.address;
  const mapUrl = contactContent.find(item => item.section_key === 'contact_map_url')?.content || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">{mainHeading}</h1>
            <p className="text-xl mb-8 text-emerald-100 max-w-3xl mx-auto">{description}</p>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
                <FiMail className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">{email}</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
                <FiPhone className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">{phone}</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="bg-emerald-100 p-4 rounded-full inline-block mb-4">
                <FiMapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600">{address}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Send Us a Message
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Your Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="How can we help?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>
              
              <div className="text-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FiSend className="mr-2 h-5 w-5" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Find Us</h2>
            <div className="w-24 h-1 bg-emerald-600 mx-auto"></div>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              {/* Interactive Map */}
              <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                {mapUrl ? (
                  // Custom map URL from database
                  <iframe
                    src={mapUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Tanzania Library Association Location"
                  />
                ) : (
                  // Default OpenStreetMap for Dar es Salaam
                  <iframe
                    src="https://www.openstreetmap.org/export/embed.html?bbox=39.2080%2C-6.8220%2C39.2280%2C-6.8020&layer=mapnik&marker=39.2180%2C-6.8120"
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Tanzania Library Association Location - Dar es Salaam"
                  />
                )}
              </div>
              
              {/* Map Controls */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=Tanzania+Library+Association+Dar+es+Salaam`, '_blank')}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center"
                >
                  <FiMapPin className="mr-2 h-5 w-5" />
                  Open in Google Maps
                </button>
                
                <button
                  onClick={() => window.open(`https://www.openstreetmap.org/search?query=Tanzania%20Library%20Association%20Dar%20es%20Salaam`, '_blank')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <FiMapPin className="mr-2 h-5 w-5" />
                  Open in OpenStreetMap
                </button>
                
                {mapUrl && (
                  <button
                    onClick={() => window.open(mapUrl, '_blank')}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors inline-flex items-center"
                  >
                    <FiMapPin className="mr-2 h-5 w-5" />
                    View Full Map
                  </button>
                )}
              </div>
              
              {/* Address Information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <FiMapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Visit Us</h4>
                    <p className="text-gray-600">{address}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Located in Dar es Salaam, Tanzania
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
