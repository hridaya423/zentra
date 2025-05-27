'use client';

import { useState } from 'react';
import { BookingLink, BookingLinks } from '@/types/travel';
import { ExternalLink, Hotel, Plane, Car, MapPin, Utensils, ChevronDown, ChevronUp } from 'lucide-react';

interface BookingLinksDisplayProps {
  bookingLinks: BookingLinks;
  destination?: string;
}

export default function BookingLinksDisplay({ bookingLinks, destination }: BookingLinksDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hotels: true,
    flights: false,
    cars: false,
    activities: false,
    restaurants: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderBookingSection = (
    title: string,
    icon: React.ReactNode,
    links: BookingLink[] | undefined,
    sectionKey: string,
    description: string
  ) => {
    if (!links || links.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="text-blue-600">{icon}</div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <div className="text-gray-400">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {isExpanded && (
          <div className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {links.map((link, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{link.platform}</h4>
                    <ExternalLink size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{link.description}</p>
                  
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Key Features:</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {link.features.slice(0, 3).map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <span className="text-green-500 mr-1">•</span>
                          {feature}
                        </li>
                      ))}
                      {link.features.length > 3 && (
                        <li className="text-gray-500 italic">+{link.features.length - 3} more features</li>
                      )}
                    </ul>
                  </div>
                  
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Book on {link.platform}
                    <ExternalLink size={14} className="ml-2" />
                  </a>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Booking Tips</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Compare prices across multiple platforms before booking</li>
                <li>• Check cancellation policies and travel insurance options</li>
                <li>• Look for package deals that combine multiple services</li>
                <li>• Read recent reviews and check ratings before finalizing</li>
                <li>• Book directly with providers for potential upgrades and better support</li>
              </ul>
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
          'Hotels & Accommodation',
          <Hotel size={24} />,
          bookingLinks.hotels,
          'hotels',
          'Find and book the perfect place to stay'
        )}

        {renderBookingSection(
          'Flights',
          <Plane size={24} />,
          bookingLinks.flights,
          'flights',
          'Compare flight prices and book your journey'
        )}

        {renderBookingSection(
          'Car Rentals',
          <Car size={24} />,
          bookingLinks.cars,
          'cars',
          'Rent a car for flexible transportation'
        )}

        {renderBookingSection(
          'Activities & Tours',
          <MapPin size={24} />,
          bookingLinks.activities,
          'activities',
          'Book tours, attractions, and unique experiences'
        )}

        {renderBookingSection(
          'Restaurant Reservations',
          <Utensils size={24} />,
          bookingLinks.restaurants,
          'restaurants',
          'Reserve tables at recommended restaurants'
        )}
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Smart Booking Strategy</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">Best Times to Book:</h4>
            <ul className="space-y-1">
              <li>• Flights: 6-8 weeks in advance</li>
              <li>• Hotels: 2-4 weeks in advance</li>
              <li>• Activities: 1-2 weeks in advance</li>
              <li>• Restaurants: As soon as dates are confirmed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Money-Saving Tips:</h4>
            <ul className="space-y-1">
              <li>• Use incognito mode when searching</li>
              <li>• Set price alerts for flights and hotels</li>
              <li>• Consider package deals for better rates</li>
              <li>• Check for loyalty program benefits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 