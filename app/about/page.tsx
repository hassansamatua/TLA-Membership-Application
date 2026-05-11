'use client';

import { useState, useEffect } from 'react';
import { FiTarget, FiEye, FiHeart } from 'react-icons/fi';

interface AboutContent {
  id: number;
  section_key: string;
  section_type: 'heading' | 'subheading' | 'text' | 'list_item' | 'image' | 'mission' | 'vision' | 'values';
  content: string;
  order_index: number;
  is_active: boolean;
}

export default function AboutPage() {
  const [aboutContent, setAboutContent] = useState<AboutContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      const response = await fetch('/api/about-content');
      if (response.ok) {
        const data = await response.json();
        setAboutContent(data);
      }
    } catch (error) {
      console.error('Error fetching about content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback static content
  const staticContent = {
    mainHeading: "About Tanzania Library Association",
    description: "The Tanzania Library Association (TLA) is the leading professional organization dedicated to advancing library and information services throughout Tanzania.",
    mission: "To promote library development, support information professionals, and advocate for access to knowledge for all Tanzanians.",
    vision: "To be the catalyst for a knowledge-driven society where every Tanzanian has access to quality information services.",
    values: [
      "Professional Excellence - Maintaining high standards in library and information services.",
      "Community Service - Serving communities through knowledge and information access.",
      "Innovation - Embracing technology and new approaches to information delivery."
    ]
  };

  // Use database content if available, otherwise use static content
  const mainHeading = aboutContent.find(item => item.section_key === 'about_main_heading')?.content || staticContent.mainHeading;
  const description = aboutContent.find(item => item.section_key === 'about_description')?.content || staticContent.description;
  const mission = aboutContent.find(item => item.section_key === 'about_mission')?.content || staticContent.mission;
  const vision = aboutContent.find(item => item.section_key === 'about_vision')?.content || staticContent.vision;
  const values = aboutContent.filter(item => 
    item.section_key.startsWith('about_values') && item.is_active
  ).map(item => item.content) || staticContent.values;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">{mainHeading}</h1>
            <p className="text-xl mb-8 text-green-100 max-w-3xl mx-auto">{description}</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-8">
              <div className="bg-green-100 p-4 rounded-full">
                <FiTarget className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="ml-4 text-3xl font-bold text-gray-900">Our Mission</h2>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed text-center">
              {mission}
            </p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-8">
              <div className="bg-green-100 p-4 rounded-full">
                <FiEye className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="ml-4 text-3xl font-bold text-gray-900">Our Vision</h2>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed text-center">
              {vision}
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <FiHeart className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="ml-4 text-3xl font-bold text-gray-900">Our Values</h2>
            </div>
            <div className="w-24 h-1 bg-green-600 mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((item, index) => (
              <div key={index} className="text-center">
                <div className="bg-green-50 p-6 rounded-xl">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.split(' - ')[0]}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.split(' - ')[1]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-green-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Us in Our Mission
          </h2>
          <p className="text-green-100 mb-8 max-w-2xl mx-auto">
            Become part of Tanzania's leading library association and help us promote library services and information access throughout the country.
          </p>
          <button className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Join TLA Today
          </button>
        </div>
      </section>
    </div>
  );
}
