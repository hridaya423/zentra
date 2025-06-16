'use client';

import { useState } from 'react';
import { BookingLink, BookingLinks } from '@/types/travel';

interface BookingLinksDisplayProps {
  bookingLinks: BookingLinks;
  destination: string;
}

export default function BookingLinksDisplay({ bookingLinks, destination }: BookingLinksDisplayProps) {
  const [expandedSections, setExpandedSections] = useState({
    hotels: false,
    flights: false,
    cars: false,
    activities: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const renderBookingSection = (
    title: string,
    icon: string,
    links: BookingLink[] | undefined,
    sectionKey: string,
    description: string
  ) => {
    if (!links || links.length === 0) return null;

    const isExpanded = expandedSections[sectionKey as keyof typeof expandedSections];

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{icon}</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="px-6 py-4 bg-white">
            <div className="grid gap-4">
              {links.map((link, index) => (
                <div key={index} className="border border-gray-100 rounded-lg p-4 hover:border-teal-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{link.platform}</h4>
                      <p className="text-sm text-gray-600 mb-3">{link.description}</p>
                      
                      {link.features && link.features.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {link.features.map((feature, featureIndex) => (
                              <span
                                key={featureIndex}
                                className="inline-block px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
                    >
                      <span>Visit Site</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!bookingLinks || Object.keys(bookingLinks).length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔗 Real Booking Links {destination && `for ${destination}`}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Click on any platform below to get real-time prices and availability. 
          All links open in new tabs so you can compare options easily.
        </p>
      </div>

      <div className="space-y-4">
        {renderBookingSection(
          'Hotel Bookings',
          '🏨',
          bookingLinks.hotels,
          'hotels',
          'Find and book accommodations for your trip'
        )}
        
        {renderBookingSection(
          'Flight Bookings',
          '✈️',
          bookingLinks.flights,
          'flights',
          'Compare and book flights to your destination'
        )}
        
        {renderBookingSection(
          'Car Rentals',
          '🚗',
          bookingLinks.cars,
          'cars',
          'Rent vehicles for local transportation'
        )}
        
        {renderBookingSection(
          'Activities & Experiences',
          '🎯',
          bookingLinks.activities,
          'activities',
          'Book tours, attractions, and unique experiences'
        )}
      </div>

    </div>
  );
} 