'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiBook, FiUsers, FiCalendar, FiCheckCircle } from 'react-icons/fi';

interface HomeContent {
  id: number;
  section_key: string;
  section_type: 'heading' | 'subheading' | 'text' | 'list_item' | 'image';
  content: string;
  order_index: number;
  is_active: boolean;
}

export default function HomePage() {
  const [homeContent, setHomeContent] = useState<HomeContent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchHomeContent();
  }, []);

  const fetchHomeContent = async () => {
    try {
      const response = await fetch('/api/home-content');
      if (response.ok) {
        const data = await response.json();
        setHomeContent(data);
      }
    } catch (error) {
      console.error('Error fetching home content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback static content
  const staticContent = {
    mainHeading: "Welcome to Tanzania Library and Information Association",
    mainSubheading: "Empowering Knowledge, Connecting Communities",
    membershipHeading: "Membership Benefits",
    membershipItems: [
      "Access Books - Borrow books online and offline with easy tracking.",
      "Digital Resources - Access e-books, journals, and research materials 24/7.",
      "Community Events - Join workshops, reading clubs, and library events."
    ]
  };

  // Use database content if available, otherwise use static content
  const mainHeading = homeContent.find(item => item.section_key === 'home_main_heading')?.content || staticContent.mainHeading;
  const mainSubheading = homeContent.find(item => item.section_key === 'home_main_subheading')?.content || staticContent.mainSubheading;
  const membershipHeading = homeContent.find(item => item.section_key === 'home_membership_heading')?.content || staticContent.membershipHeading;
  const membershipItems = homeContent.filter(item => 
    item.section_key.startsWith('home_membership_item') && item.is_active
  ).map(item => item.content) || staticContent.membershipItems;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-linear-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">{mainHeading}</h1>
            <p className="text-xl mb-8 text-emerald-100">{mainSubheading}</p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => router.push('/auth/login')}
                className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Join TLA
              </button>
              <button 
                onClick={() => router.push('/about')}
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{membershipHeading}</h2>
            <div className="w-24 h-1 bg-emerald-600 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {membershipItems.map((item, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    {index === 0 && <FiBook className="h-6 w-6 text-emerald-600" />}
                    {index === 1 && <FiBook className="h-6 w-6 text-emerald-600" />}
                    {index === 2 && <FiCalendar className="h-6 w-6 text-emerald-600" />}
                  </div>
                  <h3 className="ml-4 text-xl font-semibold text-gray-900">
                    {item.split(' - ')[0]}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {item.split(' - ')[1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-emerald-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join Tanzania Library Association?
          </h2>
          <p className="text-emerald-100 mb-8 max-w-2xl mx-auto">
            Become part of our professional community and access exclusive resources, networking opportunities, and professional development.
          </p>
          <button 
            onClick={() => router.push('/auth/register')}
            className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Today
          </button>
        </div>
      </section>
    </div>
  );
}
