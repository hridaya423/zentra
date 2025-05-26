'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const features = [
    {
      icon: "🎯",
      title: "AI-Powered Personalization",
      description: "Our advanced AI analyzes your preferences to create perfectly tailored itineraries that match your travel style and interests."
    },
    {
      icon: "🏨",
      title: "Luxury Accommodations",
      description: "Handpicked hotels, resorts, and unique stays that offer exceptional comfort and unforgettable experiences."
    },
    {
      icon: "✈️",
      title: "Seamless Transportation",
      description: "Optimized flight routes, ground transportation, and local travel options to make your journey effortless."
    },
    {
      icon: "🗺️",
      title: "Multi-Destination Planning",
      description: "Plan complex multi-city trips with intelligent routing and timing to maximize your travel experience."
    },
    {
      icon: "💎",
      title: "Exclusive Experiences",
      description: "Access to unique activities, private tours, and local experiences that create lasting memories."
    },
    {
      icon: "📱",
      title: "Digital Concierge",
      description: "24/7 support with downloadable itineraries, real-time updates, and instant sharing capabilities."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className={`transition-all duration-700 ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img src="/logo.png" alt="Travel Planner Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Zentra</h1>
                <p className="text-xs text-gray-500 -mt-1">your journey starts here</p>
              </div>
            </div>
          </Link>
          <nav className={`flex space-x-6 transition-all duration-700 delay-300 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
            <Link href="/planner" className="text-gray-700 hover:text-teal-600 font-medium transition-colors duration-300">
              Plan a Trip
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto text-center">
            <div className={`transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900">
                <span className="block">Travel Planning</span>
                <span className="block text-teal-600">Simplified</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8 leading-relaxed">
                Experience the future of travel planning with AI-powered itineraries, 
                luxury accommodations, and seamless experiences tailored just for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/planner"
                  className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Start Your Journey
                </Link>
                <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Why Choose Zentra?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We combine cutting-edge AI technology with luxury travel expertise to create unforgettable experiences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-xl p-8 border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all duration-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center text-2xl mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-teal-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Start Your Adventure?
            </h2>
            <p className="text-xl text-teal-100 mb-8">
                              Join thousands of travelers who trust Zentra for their perfect trips.
            </p>
            <Link
              href="/planner"
              className="inline-block px-8 py-4 bg-white text-teal-600 font-semibold ro unded-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Plan Your Trip Now
            </Link>
          </div>
        </section>
      </main>

      {}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img src="/logo.png" alt="Travel Planner Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Zentra</h3>
                <p className="text-xs text-gray-400 -mt-1">your journey starts here</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Powered by AI to create extraordinary journeys.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
