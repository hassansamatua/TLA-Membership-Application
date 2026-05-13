'use client';

import React, { useState, useEffect } from "react";

export function Footer() {
  const [currentYear, setCurrentYear] = useState(2024); // Default fallback year
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-gray-700 text-white py-8" suppressHydrationWarning={true}>
      <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
        {/* About Section */}
        <div>
          <h3 className="text-emerald-400 text-lg font-semibold mb-2">About TLA</h3>
          <p className="text-gray-300 text-sm">
            Tanzania Library Association is dedicated to promoting library services,
            supporting professionals, and advocating for access to knowledge
            throughout Tanzania.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-emerald-400 text-lg font-semibold mb-2">Quick Links</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li><a href="/about-us" className="hover:text-emerald-400 transition">About Us</a></li>
            <li><a href="/contact" className="hover:text-emerald-400 transition">Contact</a></li>
            <li><a href="/membership" className="hover:text-emerald-400 transition">Membership</a></li>
            <li><a href="/events" className="hover:text-emerald-400 transition">Events</a></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-emerald-400 text-lg font-semibold mb-2">Contact</h3>
          <p className="text-gray-300 text-sm mb-1">Email: info@tla.or.tz</p>
          <p className="text-gray-300 text-sm mb-1">Phone: +255 XXX XXX XXX</p>
          <p className="text-gray-300 text-sm">Address: Dar es Salaam, Tanzania</p>
        </div>
      </div>

      <div className="mt-8 border-t border-emerald-700 pt-4 text-center text-gray-400 text-sm">
        &copy; {currentYear} Tanzania Library Association (TLA). All rights reserved.
      </div>
    </footer>
  );
}