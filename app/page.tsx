'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plane, MapPin, Heart, Shield, Star, Users, Sparkles, Globe } from 'lucide-react';
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

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [trendingDestinations, setTrendingDestinations] = useState<Destination[]>([]);
  const [season, setSeason] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchTrendingDestinations = async () => {
      setIsLoadingDestinations(true);
      try {
        const response = await fetch('/api/trending-destinations');
        const data = await response.json();
        
        
        const destinationsWithImages = await Promise.all(
          data.destinations.map(async (destination: Destination) => {
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
        
        setTrendingDestinations(destinationsWithImages);
        setSeason(data.season);
        setMonth(data.month);
      } catch (error) {
        console.error('Error fetching trending destinations:', error);
      } finally {
        setIsLoadingDestinations(false);
      }
    };

    fetchTrendingDestinations();
  }, []);

  const features = [
    {
      icon: <Plane className="w-8 h-8" />,
      title: "AI-Powered Personalization",
      description: "Our advanced AI analyzes your preferences to create perfectly tailored itineraries that match your travel style and interests.",
      color: "from-teal-500 to-cyan-500"
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Smart Route Planning",
      description: "Optimized multi-destination planning with intelligent routing and timing to maximize your travel experience.",
      color: "from-blue-500 to-teal-500"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Curated Experiences",
      description: "Access to unique activities, private tours, and local experiences that create lasting memories.",
      color: "from-cyan-500 to-blue-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Seamless Support",
      description: "24/7 digital concierge with downloadable itineraries, real-time updates, and instant sharing capabilities.",
      color: "from-teal-600 to-cyan-600"
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Premium Accommodations",
      description: "Handpicked hotels, resorts, and unique stays that offer exceptional comfort and unforgettable experiences.",
      color: "from-blue-600 to-teal-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Group-Friendly Planning",
      description: "Perfect for solo adventures, romantic getaways, family trips, or group expeditions of any size.",
      color: "from-cyan-600 to-blue-600"
    }
  ];

  
  const encodeDestination = (destination: Destination) => {
    return encodeURIComponent(JSON.stringify({
      name: `${destination.name}, ${destination.country}`,
      description: destination.description
    }));
  };

  return (
    <>
      
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 hero-gradient overflow-hidden">
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-teal-400/10 to-cyan-400/10 rounded-full blur-3xl float-gentle"></div>
            <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-teal-400/10 rounded-full blur-3xl float-gentle" style={{animationDelay: '2s'}}></div>
          </div>

          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className={`transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-8 border border-white/40">
                <Plane className="w-5 h-5 text-teal-600 mr-3" />
                <span className="text-gray-700 font-medium">Ready for your next Adventure?</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-display mb-8 text-gray-900 leading-tight">
                <span className="block">Travel Planning</span>
                <span className="block text-gradient-primary">Reimagined</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed font-body">
                Experience the future of travel with AI-powered itineraries that understand your dreams, 
                preferences, and budget to create journeys as unique as you are.
              </p>
              
              <div className="flex justify-center items-center">
                <Link
                  href="/planner"
                  className="group relative overflow-hidden px-10 py-5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-700 to-cyan-700 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative flex items-center">
                    <Plane className="w-5 h-5 mr-3" />
                    Start Your Journey
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-teal-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-6 py-3 bg-blue-50 rounded-full mb-6">
                <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-700 font-semibold">Hot Destinations for {month}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display text-gray-900 mb-6">
                Trending Places to Visit
                <span className="text-gradient-secondary block">This {season}</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto font-body">
                Discover the perfect destinations for this time of year, with ideal weather conditions and unique seasonal experiences.
              </p>
            </div>

            {isLoadingDestinations ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {trendingDestinations.map((destination, index) => (
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

                <div className="text-center mt-12">
                  <Link
                    href="/explore"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Explore More Destinations
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <div className="inline-flex items-center px-6 py-3 bg-teal-50 rounded-full mb-6">
                <Star className="w-5 h-5 text-teal-600 mr-2" />
                <span className="text-teal-700 font-semibold">Why Choose Zentra</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-display text-gray-900 mb-8">
                Travel Planning
                <span className="text-gradient-primary block">Made Simple</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto font-body">
                We combine cutting-edge AI technology with travel expertise to create experiences that exceed your expectations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`card-elevated p-8 group cursor-pointer transition-all duration-700 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 ease-out`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-display text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-body">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 relative overflow-hidden">
          
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="plane-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M10 2L18 10L10 18L2 10Z" fill="white" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#plane-pattern)" />
            </svg>
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
          
            <h2 className="text-5xl font-display text-white mb-8">
              Your Dream Trip
              <span className="block">Starts Here</span>
            </h2>
            
            <p className="text-xl text-teal-100 mb-10 max-w-2xl mx-auto font-body">
            Your next unforgettable journey starts here.  
            Zentra creates personalized trip itineraries in just a few clicks.
            </p>
            
            <Link
              href="/planner"
              className="group inline-flex items-center px-10 py-5 bg-white text-teal-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-2xl"
            >
              <Plane className="w-6 h-6 mr-3 group-hover:translate-x-1 transition-transform duration-300" />
              Plan Your Trip Now
            </Link>
          </div>
        </section>
    </>
  );
}