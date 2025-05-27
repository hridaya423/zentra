'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { StructuredItinerary } from '@/types/travel';
import BookingLinksDisplay from './BookingLinksDisplay';

interface ItineraryDisplayProps {
  itinerary: StructuredItinerary | string;
  destination: string;
  startDate: string;
  endDate: string;
  isStructured: boolean;
}

export default function ItineraryDisplay({ 
  itinerary, 
  destination, 
  startDate, 
  endDate,
  isStructured
}: ItineraryDisplayProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [activeDestination, setActiveDestination] = useState<string>('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const data = isStructured && typeof itinerary !== 'string' 
    ? itinerary as StructuredItinerary
    : null;

  if (data && !activeDestination && data.destinations.length > 0) {
    setActiveDestination(data.destinations[0].name);
  }

  const downloadItinerary = () => {
    setIsDownloading(true);
    
    try {
      let fileContent: string;
      
      if (data) {
        fileContent = `# Travel Itinerary: ${destination}\n\n`;
        fileContent += `**Trip Duration:** ${formatDate(startDate)} to ${formatDate(endDate)}\n\n`;
        fileContent += `## Overview\n\n${data.overview}\n\n`;
      
        fileContent += `## Destinations\n\n`;
        data.destinations.forEach((dest, index) => {
          fileContent += `### ${index + 1}. ${dest.name} (${dest.duration} days)\n\n`;
          fileContent += `${dest.description}\n\n`;
          fileContent += `**Best Time to Visit:** ${dest.bestTimeToVisit}\n`;
          fileContent += `**Currency:** ${dest.localCurrency}\n`;
          fileContent += `**Languages:** ${dest.languages}\n\n`;
        });
        
        fileContent += `## Daily Itinerary\n\n`;
        data.itinerary.days.forEach(day => {
          fileContent += `### Day ${day.day}: ${day.title}\n`;
          fileContent += `**Date:** ${day.date} | **Location:** ${day.destination}\n\n`;
          
          day.activities.forEach(activity => {
            fileContent += `**${activity.time} - ${activity.name}**\n`;
            fileContent += `${activity.description}\n`;
            fileContent += `*Location:* ${activity.location} | *Duration:* ${activity.duration} | *Cost:* ${activity.cost}\n`;
            if (activity.tips) fileContent += `*Tips:* ${activity.tips}\n`;
            fileContent += '\n';
          });
        });
        
        fileContent += `## Budget Summary\n\n`;
        fileContent += `**Total Estimated Cost:** ${data.budget.total}\n`;
        fileContent += `**Daily Average:** ${data.budget.dailyAverage}\n\n`;
        fileContent += `**Breakdown:**\n`;
        fileContent += `- Accommodation: ${data.budget.breakdown.accommodation}\n`;
        fileContent += `- Food: ${data.budget.breakdown.food}\n`;
        fileContent += `- Activities: ${data.budget.breakdown.activities}\n`;
        fileContent += `- Transport: ${data.budget.breakdown.transport}\n`;
        fileContent += `- Extras: ${data.budget.breakdown.extras}\n\n`;
      } else {
        fileContent = `# Travel Itinerary: ${destination}\n\n${formatDate(startDate)} to ${formatDate(endDate)}\n\n${itinerary}`;
      }
      
      const blob = new Blob([fileContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `${destination.replace(/\s+/g, '-').toLowerCase()}-itinerary.md`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading itinerary:', error);
      alert('Failed to download itinerary. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPdf = async () => {
    setIsPdfDownloading(true);
    
    try {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Could not open print window. Please check your popup settings.');
      }
      
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Travel Itinerary: ${destination}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            h2 { color: #1d4ed8; margin-top: 30px; }
            .day-header { background-color: #eff6ff; padding: 10px; border-radius: 5px; margin-top: 20px; }
            .activity { margin-bottom: 15px; padding-left: 15px; border-left: 3px solid #dbeafe; }
            @media print { body { padding: 0; margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Travel Itinerary: ${destination}</h1>
          <p><strong>From:</strong> ${formatDate(startDate)} <strong>To:</strong> ${formatDate(endDate)}</p>
          ${data ? 
            `<h2>Overview</h2><p>${data.overview}</p>` + 
            data.itinerary.days.map(day => `
              <div class="day-header">
                <h3>Day ${day.day}: ${day.title}</h3>
                <p><strong>Date:</strong> ${day.date} | <strong>Location:</strong> ${day.destination}</p>
              </div>
              ${day.activities.map(activity => `
                <div class="activity">
                  <h4>${activity.time} - ${activity.name}</h4>
                  <p>${activity.description}</p>
                  <p><strong>Location:</strong> ${activity.location} | <strong>Duration:</strong> ${activity.duration} | <strong>Cost:</strong> ${activity.cost}</p>
                  ${activity.tips ? `<p><strong>Tips:</strong> ${activity.tips}</p>` : ''}
                </div>
              `).join('')}
            `).join('')
            : `<pre>${typeof itinerary === 'string' ? itinerary : ''}</pre>`
          }
        </body>
        </html>
      `;
      
      printWindow.document.write(content);
      printWindow.document.close();
      
      printWindow.onload = function() {
        printWindow.print();
        printWindow.onafterprint = function() {
          printWindow.close();
        };
      };
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Failed to create PDF. Please try again.');
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const shareItinerary = () => {
    if (navigator.share) {
      navigator.share({
        title: `Travel Itinerary: ${destination}`,
        text: `Check out my travel itinerary for ${destination}!`,
        url: window.location.href,
      })
      .catch((error) => console.error('Error sharing:', error));
    } else {
      alert('Sharing is not supported in your browser. You can copy the URL manually.');
    }
  };

  const isTabActive = (tabName: string) => activeTab === tabName;
  const getTabStyle = (tabName: string) => `px-6 py-3 text-sm font-medium rounded-t-lg transition-all ${isTabActive(tabName) 
                    ? 'bg-teal-600 text-white border-b-2 border-teal-600' 
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-b-2 border-transparent'}`;

  const renderStructuredItinerary = () => {
    if (!data) {
      return (
        <div className="prose prose-blue max-w-none">
          <ReactMarkdown>{typeof itinerary === 'string' ? itinerary : ''}</ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: '🌟' },
              { id: 'destinations', label: 'Destinations', icon: '📍' },
              { id: 'transport', label: 'Transport', icon: '🚗' },
              { id: 'accommodation', label: 'Stay', icon: '🏨' },
              { id: 'itinerary', label: 'Daily Plan', icon: '📅' },
              { id: 'budget', label: 'Budget', icon: '💰' },
              { id: 'booking', label: 'Book Now', icon: '🔗' },
              { id: 'tips', label: 'Tips', icon: '💡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabStyle(tab.id)}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="bg-white rounded-lg p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip Overview</h2>
                <p className="text-gray-700 text-lg leading-relaxed">{data.overview}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.destinations.map((dest, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{dest.name}</h3>
                    <p className="text-gray-600 mb-4">{dest.description}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Duration:</span>
                        <span>{dest.duration} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Best Time:</span>
                        <span>{dest.bestTimeToVisit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Currency:</span>
                        <span>{dest.localCurrency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Languages:</span>
                        <span>{dest.languages}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-red-900 mb-4">🚨 Emergency Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.emergencyInfo.destinations.map((emergency, index) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-medium text-red-800">{emergency.name}</h4>
                      <div className="text-sm space-y-1">
                        <div><strong>Emergency:</strong> {emergency.emergencyNumber}</div>
                        <div><strong>Hospital:</strong> {emergency.nearestHospital}</div>
                        <div><strong>Embassy:</strong> {emergency.embassyInfo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'destinations' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Destination Activities</h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {data.destinations.map((dest) => (
                  <button
                    key={dest.name}
                    onClick={() => setActiveDestination(dest.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeDestination === dest.name
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {dest.name}
                  </button>
                ))}
              </div>

              {data.destinations
                .filter(dest => dest.name === activeDestination)
                .map((dest) => (
                  <div key={dest.name} className="space-y-4">
                    <div className="bg-teal-50 p-6 rounded-xl">
                      <h3 className="text-xl font-bold text-teal-900 mb-2">{dest.name}</h3>
                      <p className="text-teal-800">{dest.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dest.activities.map((activity, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">{activity.name}</h4>
                            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">{activity.category}</span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{activity.description}</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">⏱️ {activity.duration}</span>
                            <span className="font-medium text-green-600">{activity.cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {data.bookingLinks?.activities && (
                      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-6">
                        <h4 className="text-lg font-bold text-orange-900 mb-4">🎯 Book Activities in {dest.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {data.bookingLinks.activities.slice(0, 6).map((link, index) => (
                            <div key={index} className="bg-white border border-orange-100 rounded-lg p-4">
                              <h5 className="font-semibold text-gray-900 text-sm mb-2">{link.platform}</h5>
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{link.description}</p>
                              <div className="mb-3">
                                <div className="text-xs text-gray-600 mb-1">Key Features:</div>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {link.features.slice(0, 2).map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-start">
                                      <span className="text-orange-500 mr-1">•</span>
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-full px-3 py-2 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700 transition-colors"
                              >
                                Book on {link.platform}
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'itinerary' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Daily Itinerary</h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {data.itinerary.days.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => setActiveDay(day.day)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeDay === day.day
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Day {day.day}
                  </button>
                ))}
              </div>

              {data.itinerary.days
                .filter(day => day.day === activeDay)
                .map((day) => (
                  <div key={day.day} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-teal-600 p-6 text-white">
                      <h3 className="text-2xl font-bold">Day {day.day}: {day.title}</h3>
                      <p className="text-teal-100">{day.date} • {day.destination}</p>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {day.activities.map((activity, index) => (
                        <div key={index} className="flex space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className="bg-teal-600 text-white px-2 py-1 rounded text-sm font-medium">
                              {activity.time}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{activity.name}</h4>
                            <p className="text-gray-600 mb-3">{activity.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500 mb-2">
                              <div>📍 {activity.location}</div>
                              <div>⏱️ {activity.duration}</div>
                              <div>💰 {activity.cost}</div>
                            </div>
                            {activity.tips && (
                              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                <p className="text-yellow-800 text-sm"><strong>💡 Tip:</strong> {activity.tips}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Budget Summary</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-4">Total Cost</h3>
                  <div className="text-3xl font-bold text-green-700 mb-2">{data.budget.total}</div>
                  <div className="text-sm text-green-600">Average: {data.budget.dailyAverage}/day</div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900">Breakdown</h3>
                  {Object.entries(data.budget.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                      <span className="capitalize font-medium">{key}:</span>
                      <span className="font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-yellow-900 mb-4">💡 Money-Saving Tips</h3>
                <ul className="space-y-2">
                  {data.budget.savingTips.map((tip, index) => (
                    <li key={index} className="text-yellow-800">• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'transport' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Transportation Guide</h2>
              
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-teal-900 mb-4">✈️ Getting There</h3>
                <div className="space-y-4">
                  {data.transport.gettingThere.flights.map((flight, index) => (
                                          <div key={index} className="bg-white rounded-lg p-4 border border-teal-100">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900">{flight.from} → {flight.to}</h4>
                        <span className="text-lg font-bold text-green-600">{flight.estimatedCost}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Duration:</strong> {flight.duration}</p>
                          <p><strong>Airlines:</strong> {flight.airlines.join(', ')}</p>
                        </div>
                        <div>
                          <p><strong>Class Options:</strong> {flight.classOptions?.join(', ')}</p>
                          <p><strong>Seasonal Pricing:</strong> {flight.seasonalPricing}</p>
                        </div>
                      </div>
                      {flight.bookingTips && (
                        <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <p className="text-yellow-800 text-sm"><strong>💡 Booking Tips:</strong> {flight.bookingTips}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {data.transport.betweenDestinations.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-4">🚗 Between Destinations</h3>
                  <div className="space-y-4">
                    {data.transport.betweenDestinations.map((route, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-green-100">
                        <h4 className="font-bold text-gray-900 mb-3">{route.from} → {route.to}</h4>
                        <div className="space-y-3">
                          {route.options.map((option, optIndex) => (
                            <div key={optIndex} className="border-l-4 border-green-400 pl-4">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-gray-900">{option.type}</h5>
                                <span className="font-bold text-green-600">{option.cost}</span>
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{option.description}</p>
                              <div className="text-xs text-gray-500">
                                <span className="mr-4">⏱️ {option.duration}</span>
                                {option.bookingInfo && <span>📋 {option.bookingInfo}</span>}
                              </div>
                              {option.pros && option.cons && (
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <strong className="text-green-700">Pros:</strong>
                                    <ul className="list-disc list-inside text-green-600">
                                      {option.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <strong className="text-red-700">Cons:</strong>
                                    <ul className="list-disc list-inside text-red-600">
                                      {option.cons.map((con, i) => <li key={i}>{con}</li>)}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4">🚌 Local Transportation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.transport.localTransport.map((local, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                      <h4 className="font-bold text-gray-900 mb-3">{local.destination}</h4>
                      <div className="space-y-2">
                        {local.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                            <div>
                              <span className="font-medium text-gray-900">{option.type}</span>
                              <p className="text-xs text-gray-600">{option.description}</p>
                              {option.apps && <p className="text-xs text-purple-600">📱 {option.apps}</p>}
                            </div>
                            <span className="font-bold text-purple-600">{option.cost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.bookingLinks?.flights && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-4">✈️ Book Your Flights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.bookingLinks.flights.slice(0, 6).map((link, index) => (
                      <div key={index} className="bg-white border border-green-100 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 text-sm mb-2">{link.platform}</h5>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{link.description}</p>
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">Key Features:</div>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {link.features.slice(0, 2).map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-start">
                                <span className="text-green-500 mr-1">•</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                          Book on {link.platform}
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.bookingLinks?.cars && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-purple-900 mb-4">🚗 Rent a Car</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.bookingLinks.cars.slice(0, 6).map((link, index) => (
                      <div key={index} className="bg-white border border-purple-100 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 text-sm mb-2">{link.platform}</h5>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{link.description}</p>
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">Key Features:</div>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {link.features.slice(0, 2).map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-start">
                                <span className="text-purple-500 mr-1">•</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
                        >
                          Book on {link.platform}
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accommodation' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Where to Stay</h2>
              
              {data.accommodation.recommendations.map((destination, destIndex) => (
                <div key={destIndex} className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2">
                    🏙️ {destination.destination}
                  </h3>
                  
                  {destination.options ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {destination.options.map((hotel, hotelIndex) => (
                          <div key={hotelIndex} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="text-lg font-bold text-gray-900">{hotel.name}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  hotel.bestFor?.includes('Budget') ? 'bg-green-100 text-green-800' :
                                  hotel.bestFor?.includes('Luxury') ? 'bg-purple-100 text-purple-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {hotel.bestFor}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm">{hotel.type}</p>
                              <div className="flex items-center mt-1">
                                <span className="text-yellow-500">{'★'.repeat(parseInt(hotel.rating?.charAt(0) || '3'))}</span>
                                <span className="ml-2 text-sm text-gray-500">{hotel.rating}</span>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <div className="text-lg font-bold text-green-600 mb-1">{hotel.priceRange}</div>
                              <p className="text-gray-600 text-sm">📍 {hotel.location}</p>
                            </div>

                            <div className="mb-4">
                              <h5 className="font-medium text-gray-900 mb-2">✨ Highlights</h5>
                              <div className="flex flex-wrap gap-1">
                                {hotel.highlights.map((highlight, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
                              <div>
                                <h6 className="font-medium text-green-700 mb-1">👍 Pros</h6>
                                <ul className="list-disc list-inside text-green-600 space-y-1">
                                  {hotel.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                                </ul>
                              </div>
                              <div>
                                <h6 className="font-medium text-red-700 mb-1">👎 Cons</h6>
                                <ul className="list-disc list-inside text-red-600 space-y-1">
                                  {hotel.cons.map((con, i) => <li key={i}>{con}</li>)}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {destination.bookingTips && (
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <p className="text-yellow-800 text-sm"><strong>💡 Booking Tips:</strong> {destination.bookingTips}</p>
                        </div>
                      )}
                      
                      {destination.generalTips && (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <p className="text-blue-800 text-sm"><strong>🎯 How to Choose:</strong> {destination.generalTips}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">{destination.name}</h4>
                          <p className="text-gray-600">{destination.destination}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{destination.priceRange}</div>
                          <div className="text-xs text-gray-500">{destination.type}</div>
                        </div>
                      </div>
                      
                      {destination.highlights && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">✨ Highlights</h5>
                          <div className="flex flex-wrap gap-2">
                            {destination.highlights.map((highlight, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {highlight}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {destination.bookingTips && (
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <p className="text-yellow-800 text-sm"><strong>💡 Booking Tips:</strong> {destination.bookingTips}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {data.bookingLinks?.hotels && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-blue-900 mb-4">🔗 Book Hotels in {destination.destination}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.bookingLinks.hotels.slice(0, 6).map((link, index) => (
                          <div key={index} className="bg-white border border-blue-100 rounded-lg p-4">
                            <h5 className="font-semibold text-gray-900 text-sm mb-2">{link.platform}</h5>
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{link.description}</p>
                            <div className="mb-3">
                              <div className="text-xs text-gray-600 mb-1">Key Features:</div>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {link.features.slice(0, 2).map((feature, featureIndex) => (
                                  <li key={featureIndex} className="flex items-start">
                                    <span className="text-green-500 mr-1">•</span>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Book on {link.platform}
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                              </svg>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'booking' && (
            <div className="space-y-6">
              {data.bookingLinks ? (
                <BookingLinksDisplay 
                  bookingLinks={data.bookingLinks} 
                  destination={destination}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔗</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Links Coming Soon</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    We&apos;re generating personalized booking links for your trip. 
                    This may take a moment to load.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Travel Tips & Essentials</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4">🎒 Packing Essentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Essential Items</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {data.packingTips.essentials.map((item, i) => (
                        <li key={i} className="flex items-center">
                          <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Luxury Travel Items</h4>
                    <p className="text-sm text-gray-700">{data.packingTips.luxury}</p>
                    <h4 className="font-medium text-gray-900 mb-2 mt-4">Cultural Considerations</h4>
                    <p className="text-sm text-gray-700">{data.packingTips.cultural}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded">
                  <h4 className="font-medium text-blue-900 mb-1">Seasonal Packing</h4>
                  <p className="text-sm text-blue-800">{data.packingTips.seasonal}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-900 mb-4">🌍 Local Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🎭 Cultural Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {data.localTips.cultural.map((tip, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 mt-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🛡️ Safety Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {data.localTips.safety.map((tip, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 mt-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">💡 Practical Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {data.localTips.practical.map((tip, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 mt-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🤝 Etiquette</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {data.localTips.etiquette.map((tip, i) => (
                        <li key={i} className="flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 mt-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4">📋 Booking Checklist</h3>
                <div className="space-y-4">
                  {data.bookingChecklist.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-purple-100">
                      <div className={`w-3 h-3 rounded-full mt-1 ${
                        item.priority === 'High' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{item.item}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.priority === 'High' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.priority} Priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">⏰ {item.timeframe}</p>
                        <p className="text-sm text-gray-700">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      <div className="bg-blue-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">✈️ {destination}</h2>
            <p className="text-blue-100 mt-1">
              {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={downloadItinerary}
              disabled={isDownloading}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center text-sm font-medium disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download
                </>
              )}
            </button>
            
            <button
              onClick={downloadPdf}
              disabled={isPdfDownloading}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center text-sm font-medium disabled:opacity-50"
            >
              {isPdfDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating PDF...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  PDF
                </>
              )}
            </button>
            
            <button
              onClick={shareItinerary}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {isStructured ? renderStructuredItinerary() : (
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown>{typeof itinerary === 'string' ? itinerary : ''}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
} 