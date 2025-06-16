'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Globe, Sparkles, ArrowLeft, Loader } from 'lucide-react';
import { getDestImageWFallback } from '@/lib/utils/unsplash';

interface Destination {
  name: string;
  country: string;
  description: string;
  mainAttraction: string;
  weather: string;
  imageKeywords: string;
  imageUrl?: string;
}

export default function ExplorePage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [season, setSeason] = useState('');
  const [month, setMonth] = useState('');
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    const fetchInitialDestinations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/trending-destinations');
        const data = await response.json();
        
        setSeason(data.season);
        setMonth(data.month);
        
        
        const destinationsWithImages = await addImageUrlsToDestinations(data.destinations);
        setDestinations(destinationsWithImages);
      } catch (error) {
        console.error('Error fetching destinations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialDestinations();
  }, []);

  const fetchMoreDestinations = async () => {
    if (isLoading || loadingImages) return;
    
    setLoadingImages(true);
    try {
      const nextPage = currentPage + 1;
      const response = await fetch(`/api/trending-destinations?page=${nextPage}&count=8`);
      const data = await response.json();
      
      if (data.destinations && data.destinations.length > 0) {
        
        const newDestinationsWithImages = await addImageUrlsToDestinations(data.destinations);
        
        setDestinations(prev => [...prev, ...newDestinationsWithImages]);
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching more destinations:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const addImageUrlsToDestinations = async (destinationsToProcess: Destination[]) => {
    const destinationsWithImages = await Promise.all(
      destinationsToProcess.map(async (destination) => {
        try {
          
          const imageUrl = await getDestImageWFallback({
            name: destination.name,
            country: destination.country,
            imageKeywords: destination.imageKeywords
          });
          
          return { ...destination, imageUrl };
        } catch (error) {
          console.error(`Error fetching image for ${destination.name}:`, error);
          return destination;
        }
      })
    );
    
    return destinationsWithImages;
  };

  
  const encodeDestination = (destination: Destination) => {
    return encodeURIComponent(JSON.stringify({
      name: `${destination.name}, ${destination.country}`,
      description: destination.description
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-teal-50">
      
      <header className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <Link href="/" className="flex items-center text-white hover:text-teal-100 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to Home</span>
            </Link>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-display mb-4">Explore Trending Destinations</h1>
          <p className="text-xl text-teal-100 max-w-3xl">
            Discover the perfect places to visit this {season}, with ideal weather conditions and unique seasonal experiences.
          </p>
        </div>
      </header>

      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <div className="inline-flex items-center px-6 py-3 bg-blue-50 rounded-full mb-6">
                <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-700 font-semibold">Hot Destinations for {month}</span>
              </div>
              <h2 className="text-4xl font-display text-gray-900 mb-6">
                Where Will You Go This {season}?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Browse these trending destinations and start planning your perfect getaway.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {destinations.map((destination, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                >
                  <div className="h-48 relative overflow-hidden">
                    {destination.imageUrl ? (
                      <img
                        src={destination.imageUrl}
                        alt={destination.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-teal-400 animate-pulse" />
                    )}
                    
                    <div className="absolute inset-0 bg-opacity-30 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold drop-shadow-lg">{destination.name}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-display text-gray-900 mb-2">{destination.name}, {destination.country}</h3>
                    <p className="text-gray-600 text-sm mb-4">{destination.description}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-teal-600 mt-1 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{destination.mainAttraction}</span>
                      </div>
                      <div className="flex items-start">
                        <Globe className="w-4 h-4 text-blue-600 mt-1 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{destination.weather}</span>
                      </div>
                    </div>
                    <Link
                      href={`/planner?destination=${encodeDestination(destination)}`}
                      className="block w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white text-center rounded-xl font-medium hover:from-teal-600 hover:to-blue-600 transition-colors"
                    >
                      Plan Trip to {destination.name}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={fetchMoreDestinations}
                  disabled={loadingImages}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loadingImages ? (
                    <>
                      <Loader className="w-5 h-5 mr-3 animate-spin" />
                      Loading More Destinations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-3" />
                      Discover More Destinations
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
} 