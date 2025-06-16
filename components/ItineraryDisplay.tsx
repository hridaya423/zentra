'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { StructuredItinerary } from '@/types/travel';
import { getDestinationHeroImage, getActivityThumbnails, optimizeImageUrl, UnsplashImage } from '@/lib/utils/unsplash';
import { Clock, MapPin, Wallet, Star, Camera, Navigation, Users, Calendar, FileText, Plane } from 'lucide-react';
import BookingLinksDisplay from './BookingLinksDisplay';
import jsPDF from 'jspdf';

interface ItineraryDisplayProps {
  itinerary: StructuredItinerary | string;
  destination: string;
  startDate: string;
  endDate: string;
  isStructured: boolean;
  wantsHotelRecommendations?: boolean;
  wantsFlightBooking?: boolean;
  showActivityImages?: boolean;
}

interface DestinationImages {
  [key: string]: {
    heroImage: UnsplashImage;
    activityImages: { [activityName: string]: UnsplashImage | null };
  };
}

export default function ItineraryDisplay({ 
  itinerary, 
  destination, 
  startDate, 
  endDate,
  isStructured,
  wantsHotelRecommendations = true,
  wantsFlightBooking = true,
  showActivityImages = true  
}: ItineraryDisplayProps) {
  
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [images, setImages] = useState<DestinationImages>({});
  const [loadingImages, setLoadingImages] = useState(true);

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

  
  useEffect(() => {
    if (data) {
      
      const sortedData = JSON.parse(JSON.stringify(data)) as StructuredItinerary;

      
      sortedData.itinerary.days.forEach(day => {
        day.activities.sort((a, b) => {
          
          const getTimeValue = (timeStr: string) => {
            
            const timeMatch = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
            
            if (timeMatch) {
              let hours = parseInt(timeMatch[1], 10);
              const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
              const period = timeMatch[3]?.toUpperCase();
              
              
              if (period === 'PM' && hours < 12) {
                hours += 12;
              } else if (period === 'AM' && hours === 12) {
                hours = 0;
              }
              
              return hours * 60 + minutes; 
            }
            
            return 0; 
          };
          
          return getTimeValue(a.time) - getTimeValue(b.time);
        });
      });
      
      
      if (typeof itinerary !== 'string') {
        
        (itinerary as StructuredItinerary).itinerary.days = sortedData.itinerary.days;
      }
    }
  }, [data, itinerary]);

  
  useEffect(() => {
    async function loadImages() {
      if (!data) return;
      
      setLoadingImages(true);
      const newImages: DestinationImages = {};
      
      
      const destinationActivities = new Map<string, string[]>();
      
      
      data.itinerary.days.forEach(day => {
        if (!destinationActivities.has(day.destination)) {
          destinationActivities.set(day.destination, []);
        }
        const activities = destinationActivities.get(day.destination)!;
        day.activities.forEach(activity => {
          if (!activities.includes(activity.name)) {
            activities.push(activity.name);
          }
        });
      });
      
      
      data.destinations.forEach(dest => {
        if (!destinationActivities.has(dest.name)) {
          destinationActivities.set(dest.name, []);
        }
        const activities = destinationActivities.get(dest.name)!;
        dest.activities?.forEach(activity => {
          if (!activities.includes(activity.name)) {
            activities.push(activity.name);
          }
        });
      });
      
      
      for (const [destName, activityNames] of destinationActivities) {
          console.log(`Loading individual images for ${destName} with ${activityNames.length} activities:`, activityNames);
          
          
          const heroImage = await getDestinationHeroImage(destName);
          
          newImages[destName] = {
            heroImage: heroImage,
            activityImages: {}
          };
          
        
          const activityImagePromises = activityNames.map(async (activityName) => {
            if (!showActivityImages) {
              return { activityName, image: null };
            }
            console.log(`Fetching image for activity: ${activityName}`);
            const activityImage = await getActivityThumbnails(activityName, destName);
            return { activityName, image: activityImage };
          });
            
        const activityImageResults = await Promise.all(activityImagePromises);
            
        
        activityImageResults.forEach(({ activityName, image }) => {
              newImages[destName].activityImages[activityName] = image;
            });
      }
      
      console.log('Loaded images for destinations:', Object.keys(newImages));
      Object.entries(newImages).forEach(([dest, imgs]) => {
        console.log(`${dest}: ${Object.keys(imgs.activityImages).length} activity images`);
      });
      
      setImages(newImages);
      setLoadingImages(false);
    }
    
    loadImages();
  }, [data]);

  const availableTabs = [
    'overview',
    'daily-plan',
    ...(wantsFlightBooking ? ['transport'] : []),
    ...(wantsHotelRecommendations ? ['accommodation'] : []),
    'budget',
    'booking'
  ];

  if (!availableTabs.includes(activeTab)) {
    setActiveTab(availableTabs[0]);
  }

  const downloadItinerary = async () => {
    downloadPDFItinerary();
  };
  
  const downloadPDFItinerary = async () => {
    setIsDownloading(true);
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      
      pdf.setFillColor(59, 130, 246); 
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 25, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text(`Travel Itinerary: ${destination}`, 10, 10);
      pdf.setFontSize(11);
      pdf.text(`${formatDate(startDate)} to ${formatDate(endDate)}`, 10, 18);
      
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.text('Trip Overview', 10, 35);
      pdf.setFontSize(10);
      
      if (data) {
        const splitOverview = pdf.splitTextToSize(data.overview, pdf.internal.pageSize.getWidth() - 20);
        pdf.text(splitOverview, 10, 45);
        
        let yPosition = 45 + (splitOverview.length * 5);
        
        
        pdf.setFontSize(14);
        pdf.text('Destinations', 10, yPosition + 10);
        yPosition += 15;
        
        data.destinations.forEach((dest, index) => {
          if (yPosition > pdf.internal.pageSize.getHeight() - 30) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(12);
          pdf.text(`${index + 1}. ${dest.name} (${dest.duration} days)`, 10, yPosition);
          yPosition += 5;
          
          pdf.setFontSize(10);
          const splitDesc = pdf.splitTextToSize(dest.description, pdf.internal.pageSize.getWidth() - 20);
          pdf.text(splitDesc, 10, yPosition);
          yPosition += (splitDesc.length * 5) + 5;
          
          pdf.text(`Best Time to Visit: ${dest.bestTimeToVisit}`, 10, yPosition);
          yPosition += 5;
          pdf.text(`Currency: ${dest.localCurrency}`, 10, yPosition);
          yPosition += 5;
          pdf.text(`Languages: ${dest.languages}`, 10, yPosition);
          yPosition += 10;
        });
        
        
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(14);
        pdf.text('Daily Itinerary', 10, yPosition);
        yPosition += 10;
        
        data.itinerary.days.forEach(day => {
          if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(12);
          pdf.text(`Day ${day.day}: ${day.title}`, 10, yPosition);
          yPosition += 5;
          
          pdf.setFontSize(10);
          pdf.text(`Date: ${day.date} | Location: ${day.destination}`, 10, yPosition);
          yPosition += 10;
          
          day.activities.forEach(activity => {
            if (yPosition > pdf.internal.pageSize.getHeight() - 50) {
              pdf.addPage();
              yPosition = 20;
            }
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${activity.time} - ${activity.name}`, 10, yPosition);
            yPosition += 5;
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            const splitDesc = pdf.splitTextToSize(activity.description, pdf.internal.pageSize.getWidth() - 20);
            pdf.text(splitDesc, 10, yPosition);
            yPosition += (splitDesc.length * 5);
            
            pdf.text(`Location: ${activity.location} | Duration: ${activity.duration} | Cost: ${activity.cost}`, 10, yPosition);
            yPosition += 5;
            
            if (activity.tips) {
              const splitTips = pdf.splitTextToSize(`Tip: ${activity.tips}`, pdf.internal.pageSize.getWidth() - 20);
              pdf.text(splitTips, 10, yPosition);
              yPosition += (splitTips.length * 5);
            }
            
            yPosition += 5;
          });
          
          yPosition += 5;
        });
        
        
        if (yPosition > pdf.internal.pageSize.getHeight() - 80) {
          pdf.addPage();
          yPosition = 20;
        } else {
          yPosition += 10;
        }
        
        pdf.setFontSize(14);
        pdf.text('Budget Summary', 10, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(11);
        pdf.text(`Total Estimated Cost: ${data.budget.total}`, 10, yPosition);
        yPosition += 5;
        pdf.text(`Daily Average: ${data.budget.dailyAverage}`, 10, yPosition);
        yPosition += 10;
        
        pdf.text('Breakdown:', 10, yPosition);
        yPosition += 5;
        
        pdf.setFontSize(10);
        pdf.text(`• Accommodation: ${data.budget.breakdown.accommodation}`, 15, yPosition);
        yPosition += 5;
        pdf.text(`• Food: ${data.budget.breakdown.food}`, 15, yPosition);
        yPosition += 5;
        pdf.text(`• Activities: ${data.budget.breakdown.activities}`, 15, yPosition);
        yPosition += 5;
        pdf.text(`• Transport: ${data.budget.breakdown.transport}`, 15, yPosition);
        yPosition += 5;
        pdf.text(`• Extras: ${data.budget.breakdown.extras}`, 15, yPosition);
        
      } else if (typeof itinerary === 'string') {
        const splitContent = pdf.splitTextToSize(itinerary, pdf.internal.pageSize.getWidth() - 20);
        pdf.text(splitContent, 10, 45);
      }
      
      
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${destination} Travel Itinerary - Page ${i} of ${totalPages}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
      
      pdf.save(`${destination.replace(/\s+/g, '-').toLowerCase()}-itinerary.pdf`);
    } catch (error) {
      console.error('Error generating PDF itinerary:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
      setIsGeneratingPDF(false);
    }
  };

  const getTabStyle = (tabName: string) => 
    `px-8 py-4 text-sm font-medium transition-all duration-200 relative flex items-center whitespace-nowrap ${
      activeTab === tabName 
        ? 'bg-white text-blue-600 border-b-2 border-blue-600 -mb-px z-10 shadow-sm' 
        : 'bg-gray-50 text-gray-600 hover:text-gray-800 hover:bg-gray-100 border-b border-gray-200'
    }`;

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold flex items-center">
            <Plane className="w-6 h-6 mr-3" />
            {destination}
          </h2>
          <p className="text-blue-100 mt-1">
            {formatDate(startDate)} - {formatDate(endDate)}
          </p>
        </div>
        <div className="p-6">
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown>{typeof itinerary === 'string' ? itinerary : ''}</ReactMarkdown>
          </div>
              </div>
    </div>
  );
}

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      
      <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
        {data.destinations[0] && images[data.destinations[0].name]?.heroImage && !loadingImages && (
          <>
            <div className="absolute inset-0">
              <img
                src={optimizeImageUrl(images[data.destinations[0].name].heroImage, 1200, 300)}
                alt={data.destinations[0].name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-purple-900/30"></div>
          </>
        )}
        <div className="relative z-10 p-6 text-white h-full flex flex-col justify-end">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center">
                <Plane className="w-8 h-8 mr-3" />
                {destination}
              </h2>
              <p className="text-white/90 text-lg mb-2">
                {formatDate(startDate)} - {formatDate(endDate)}
              </p>
              <div className="flex items-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {data.itinerary.days.length} days
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {data.destinations.length} destinations
                </span>
              </div>
            </div>
            <div>
              <div className="relative">
                <button
                  onClick={downloadItinerary}
                  disabled={isDownloading}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center text-sm font-medium disabled:opacity-50 backdrop-blur-sm"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full"></div>
                      {isGeneratingPDF ? 'Generating PDF...' : 'Downloading...'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex overflow-x-auto px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'overview', label: 'Trip Overview', icon: Star },
            { id: 'daily-plan', label: 'Daily Plan', icon: Calendar },
            ...(wantsFlightBooking ? [{ id: 'transport', label: 'Getting There', icon: Navigation }] : []),
            ...(wantsHotelRecommendations ? [{ id: 'accommodation', label: 'Where to Stay', icon: Users }] : []),
            { id: 'budget', label: 'Budget', icon: Wallet },
            { id: 'booking', label: 'Book Now', icon: Camera }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={getTabStyle(tab.id)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Your Journey Awaits</h3>
              <p className="text-gray-700 text-lg leading-relaxed">{data.overview}</p>
            </div>

            
            {data.tripHighlights && data.tripHighlights.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Trip Highlights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {data.tripHighlights.map((highlight, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">{highlight.name}</h4>
                      <p className="text-gray-600">{highlight.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {data.culturalTips && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-2xl mr-2">🌍</span>
                  Cultural Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">🤝</span>
                      Etiquette & Customs
                    </h4>
                    <ul className="space-y-2">
                      {[...data.culturalTips.etiquette, ...data.culturalTips.customs].map((tip, i) => (
                        <li key={i} className="text-gray-600 text-sm flex items-start">
                          <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">🛡️</span>
                      Language & Safety
                    </h4>
                    <ul className="space-y-2">
                      {[...data.culturalTips.language, ...data.culturalTips.safety].map((tip, i) => (
                        <li key={i} className="text-gray-600 text-sm flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-red-500" />
                Your Destinations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.destinations.map((dest, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {images[dest.name]?.heroImage && !loadingImages && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={optimizeImageUrl(images[dest.name].heroImage, 600, 200)}
                          alt={dest.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{dest.name}</h4>
                      <p className="text-gray-600 mb-4">{dest.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'daily-plan' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Daily Itinerary</h2>
              
              
              <div className="flex space-x-1 overflow-x-auto bg-gray-100 rounded-lg p-1">
                {data.itinerary.days.map((day) => (
                  <button
                    key={day.day}
                    onClick={() => setActiveDay(day.day)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      activeDay === day.day
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    Day {day.day}
                  </button>
                ))}
              </div>
            </div>

            
            {data.itinerary.days
              .filter(day => day.day === activeDay)
              .map((day) => (
                <div key={day.day} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                    <h3 className="text-2xl font-bold">Day {day.day}: {day.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-blue-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {day.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {day.destination}
                      </span>
                    </div>
                  </div>
                  
                  
                  <div className="p-6">
                    <div className="relative">
                      
                      <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-purple-300"></div>
                      
                      <div className="space-y-6">
                        {day.activities.map((activity, index) => (
                          <div key={index} className="relative flex items-start space-x-6">
                            
                            <div className="flex-shrink-0 relative z-10">
                              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
                                {activity.time}
                              </div>
                              
                              <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>
                            </div>
                            
                            
                            <div className="flex-1 bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-gray-900 mb-1">{activity.name}</h4>
                                  {activity.location && (
                                    <p className="text-sm text-gray-600 flex items-center mb-2">
                                      <MapPin className="w-4 h-4 mr-1" />
                                      {activity.location}
                                    </p>
                                  )}
                                </div>
                                {images[day.destination]?.activityImages[activity.name] && !loadingImages && (
                                  <div className="w-20 h-20 rounded-lg overflow-hidden ml-4">
                                    <img
                                      src={optimizeImageUrl(images[day.destination].activityImages[activity.name]!, 160, 160)}
                                      alt={activity.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-700 mb-4">{activity.description}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {activity.duration}
                                </div>
                                <div className="flex items-center">
                                  <Wallet className="w-4 h-4 mr-1" />
                                  {activity.cost}
                                </div>
                                {activity.bookingRequired && (
                                  <div className="flex items-center">
                                    <Camera className="w-4 h-4 mr-1" />
                                    Booking Required
                                  </div>
                                )}
                              </div>
                              
                              {activity.tips && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r">
                                  <p className="text-yellow-800 text-sm">
                                    <span className="font-semibold">💡 Tip:</span> {activity.tips}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        
        {activeTab === 'transport' && wantsFlightBooking && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Navigation className="w-6 h-6 mr-3 text-blue-600" />
              Getting There & Around
            </h2>
            
            
            {data.transport.gettingThere.flights.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
                  <Plane className="w-5 h-5 mr-2" />
                  Flight Options
                </h3>
                <div className="space-y-4">
                  {data.transport.gettingThere.flights.map((flight, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900">{flight.from} → {flight.to}</h4>
                          <p className="text-sm text-gray-600">Airlines: {flight.airlines.join(', ')}</p>
                        </div>
                        {flight.estimatedCost && (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {flight.estimatedCost}
                          </span>
                        )}
                      </div>
                      
                      {flight.options && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {flight.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="bg-gray-50 rounded-lg p-4">
                              <h5 className="font-semibold text-gray-900 mb-2">{option.class}</h5>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>Cost:</span>
                                  <span className="font-medium">{option.estimatedCost}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Duration:</span>
                                  <span>{option.duration}</span>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="text-xs text-green-600 mb-1">Pros:</div>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {option.pros.map((pro, proIndex) => (
                                    <li key={proIndex} className="flex items-start">
                                      <span className="text-green-500 mr-1">•</span>
                                      {pro}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {flight.bookingTips && (
                        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r">
                          <p className="text-yellow-800 text-sm">
                            <span className="font-semibold">✈️ Booking Tips:</span> {flight.bookingTips}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {data.transport.localTransport.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4">
                  🚌 Local Transportation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.transport.localTransport.map((transport, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-green-100">
                      <h4 className="font-bold text-gray-900 mb-3">{transport.destination}</h4>
                      <div className="space-y-3">
                        {transport.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">{option.type}</span>
                              <span className="text-green-600 font-medium">{option.cost}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                            {option.apps && (
                              <p className="text-xs text-blue-600">
                                📱 Recommended app: {option.apps}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        
        {activeTab === 'accommodation' && wantsHotelRecommendations && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-3 text-purple-600" />
              Where to Stay
            </h2>
            
            <div className="space-y-6">
              {data.accommodation.recommendations.map((rec, index) => (
                <div key={index} className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-4">{rec.destination}</h3>
                  
                  {rec.options ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rec.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="bg-white border border-purple-100 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900">{option.name}</h4>
                            {option.rating && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                ⭐ {option.rating}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">{option.type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Price:</span>
                              <span className="font-medium text-green-600">{option.priceRange}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Location:</span>
                              <span className="font-medium">{option.location}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Highlights:</div>
                              <div className="flex flex-wrap gap-1">
                                {option.highlights.slice(0, 3).map((highlight, hIndex) => (
                                  <span key={hIndex} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs text-green-600 mb-1">Pros:</div>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {option.pros.slice(0, 2).map((pro, proIndex) => (
                                  <li key={proIndex} className="flex items-start">
                                    <span className="text-green-500 mr-1">•</span>
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-purple-100 rounded-lg p-4">
                      <h4 className="font-bold text-gray-900 mb-2">{rec.name}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{rec.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-medium text-green-600">{rec.priceRange}</span>
                        </div>
                      </div>
                      {rec.highlights && (
                        <div className="flex flex-wrap gap-1">
                          {rec.highlights.map((highlight, hIndex) => (
                            <span key={hIndex} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                              {highlight}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {rec.bookingTips && (
                    <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r">
                      <p className="text-blue-800 text-sm">
                        <span className="font-semibold">🏨 Booking Tips:</span> {rec.bookingTips}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Wallet className="w-6 h-6 mr-3 text-green-600" />
              Budget Breakdown
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4">Total Budget</h3>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-green-600 mb-2">{data.budget.total}</div>
                  <div className="text-green-700">Daily Average: {data.budget.dailyAverage}</div>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(data.budget.breakdown).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 capitalize">{category}:</span>
                      <span className="text-green-600 font-semibold">{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">💰 Money-Saving Tips</h3>
                <ul className="space-y-3">
                  {data.budget.savingTips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></span>
                      <span className="text-blue-800 text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            
            {data.budget.splurgeRecommendations && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-4">✨ Worth the Splurge</h3>
                <ul className="space-y-3">
                  {data.budget.splurgeRecommendations.map((splurge, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-3 mt-2"></span>
                      <span className="text-purple-800 text-sm">{splurge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 