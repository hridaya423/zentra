'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Plane } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const showPlanningBadge = pathname === '/planner';
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <header className="glass border-b border-white/20 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className={`transition-all duration-500 ease-out ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="Zentra" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-display text-gradient-primary">Zentra</h1>
              <p className="text-sm text-gray-500 font-medium -mt-1">your journey starts here</p>
            </div>
          </div>
        </Link>
        <nav className={`flex space-x-6 transition-all duration-500 ease-out delay-150 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
          {showPlanningBadge ? (
            <div className="flex items-center px-4 py-2 bg-teal-50 rounded-full border border-teal-200">
              <Plane className="w-4 h-4 text-teal-600 mr-2" />
              <span className="text-teal-700 font-medium text-sm">Planning Your Trip</span>
            </div>
          ) : (
            <Link href="/planner" className="btn-primary">
              Start Planning
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
} 