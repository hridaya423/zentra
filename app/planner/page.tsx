'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ItineraryDisplay from '@/components/ItineraryDisplay';
import { Destination, TravelFormData, StructuredItinerary } from '@/types/travel';

const TRAVEL_STYLES = [
  { value: 'relaxed', label: 'Relaxed - Plenty of downtime', icon: '🧘', description: 'Slow-paced with time to unwind' },
  { value: 'balanced', label: 'Balanced - Mix of activities and rest', icon: '⚖️', description: 'Perfect blend of adventure and relaxation' },
  { value: 'active', label: 'Active - Packed with activities', icon: '🏃', description: 'Action-packed days with lots to see' },
  { value: 'adventurous', label: 'Adventurous - Seeking thrills', icon: '🧗', description: 'Extreme sports and unique experiences' },
  { value: 'cultural', label: 'Cultural - Focus on culture and history', icon: '🏛️', description: 'Museums, heritage sites, and local traditions' },
  { value: 'foodie', label: 'Foodie - Culinary experiences', icon: '🍜', description: 'Food tours, cooking classes, and fine dining' }
];

const BUDGET_OPTIONS = [
  { value: 'cheapest', label: 'Ultra Budget', icon: '🏕️', description: 'Hostels, street food, walking/public transport', range: '$20-50/day' },
  { value: 'budget', label: 'Budget Explorer', icon: '💰', description: 'Budget hotels, local food, public transport', range: '$50-100/day' },
  { value: 'moderate', label: 'Comfort Traveler', icon: '💳', description: '3-4 star hotels, mix of dining options', range: '$150-300/day' },
  { value: 'luxury', label: 'Luxury Connoisseur', icon: '💎', description: '5-star hotels, fine dining, premium experiences', range: '$500+/day' },
  { value: 'anything', label: 'Money No Object', icon: '💸', description: 'Best of everything, private jets, exclusive experiences', range: 'Unlimited' },
  { value: 'custom', label: 'Custom Budget', icon: '⚙️', description: 'Set your own budget limit', range: 'Your choice' }
];

const ACCOMMODATION_TYPES = [
  { value: 'hotel', label: 'Luxury Hotel', icon: '🏨', description: 'Full-service hotels with amenities' },
  { value: 'resort', label: 'Resort & Spa', icon: '🏖️', description: 'All-inclusive resorts with activities' },
  { value: 'boutique', label: 'Boutique Hotel', icon: '🎭', description: 'Unique, stylish properties' },
  { value: 'airbnb', label: 'Vacation Rental', icon: '🏡', description: 'Private homes and apartments' },
  { value: 'apartment', label: 'Serviced Apartment', icon: '🏢', description: 'Extended stay with kitchen facilities' },
  { value: 'hostel', label: 'Hostel', icon: '🏠', description: 'Budget-friendly shared accommodations' },
  { value: 'guesthouse', label: 'Guesthouse / B&B', icon: '🏘️', description: 'Personal touch with local hosts' },
  { value: 'camping', label: 'Camping / Glamping', icon: '⛺', description: 'Outdoor adventures and unique stays' }
];

const TRANSPORT_OPTIONS = [
  { value: 'any', label: 'Best Options Available', icon: '🚗', description: 'We&apos;ll recommend the optimal transport' },
  { value: 'flights', label: 'Flights Priority', icon: '✈️', description: 'Fastest routes with flight connections' },
  { value: 'train', label: 'Train Travel', icon: '🚄', description: 'Scenic routes and comfortable journeys' },
  { value: 'rental', label: 'Car Rental', icon: '🚙', description: 'Freedom to explore at your own pace' },
  { value: 'public', label: 'Public Transport', icon: '🚌', description: 'Local buses, metros, and trains' },
  { value: 'private', label: 'Private Transport', icon: '🚐', description: 'Chauffeur services and private transfers' },
  { value: 'walking', label: 'Walking Focused', icon: '🚶', description: 'Walkable destinations and short distances' }
];

const INTEREST_OPTIONS = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️', description: 'Culinary adventures' },
  { value: 'museums', label: 'Museums & Culture', icon: '🏛️', description: 'Art and history' },
  { value: 'nature', label: 'Nature & Outdoors', icon: '🌲', description: 'Parks and landscapes' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', description: 'Markets and boutiques' },
  { value: 'history', label: 'History & Architecture', icon: '🏰', description: 'Historic sites' },
  { value: 'beaches', label: 'Beaches & Relaxation', icon: '🏖️', description: 'Coastal experiences' },
  { value: 'nightlife', label: 'Nightlife', icon: '🌃', description: 'Bars and entertainment' },
  { value: 'adventure', label: 'Adventure Sports', icon: '🏔️', description: 'Thrilling activities' },
  { value: 'local', label: 'Local Experiences', icon: '🎭', description: 'Authentic culture' },
  { value: 'art', label: 'Art & Design', icon: '🎨', description: 'Galleries and studios' },
  { value: 'wellness', label: 'Wellness & Spa', icon: '💆', description: 'Health and relaxation' },
  { value: 'photography', label: 'Photography', icon: '📸', description: 'Scenic viewpoints' },
  { value: 'family', label: 'Family-friendly', icon: '👨‍👩‍👧‍👦', description: 'Activities for all ages' },
  { value: 'sports', label: 'Sports', icon: '⚽', description: 'Sporting events and activities' },
  { value: 'wildlife', label: 'Wildlife & Safari', icon: '🦁', description: 'Animal encounters' },
  { value: 'festivals', label: 'Festivals & Events', icon: '🎪', description: 'Local celebrations' }
];

const DIETARY_OPTIONS = [
  { value: 'none', label: 'No restrictions' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'glutenFree', label: 'Gluten Free' },
  { value: 'dairyFree', label: 'Dairy Free' },
  { value: 'nutFree', label: 'Nut Free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'other', label: 'Other (specify in notes)' }
];

const ACCESSIBILITY_OPTIONS = [
  { value: 'none', label: 'No specific needs' },
  { value: 'wheelchair', label: 'Wheelchair accessible' },
  { value: 'limitedMobility', label: 'Limited mobility' },
  { value: 'visualImpairment', label: 'Visual impairment' },
  { value: 'hearingImpairment', label: 'Hearing impairment' },
  { value: 'other', label: 'Other (specify in notes)' }
];

export default function PlannerPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<StructuredItinerary | string | null>(null);
  const [isStructured, setIsStructured] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [showInteractiveQuestions, setShowInteractiveQuestions] = useState(false);
  
  const [formData, setFormData] = useState<TravelFormData>({
    departureLocation: '',
    destinations: [{ name: '', duration: 3 }],
    startDate: '',
    endDate: '',
    travelers: 1,
    budget: 'moderate',
    maxBudget: undefined,
    travelStyle: 'balanced',
    interests: [],
    accommodation: 'hotel',
    transportPreference: 'any',
    dietaryRestrictions: 'none',
    accessibility: 'none',
    additionalNotes: ''
  });

  const [wantsHotelRecommendations, setWantsHotelRecommendations] = useState(true);
  const [wantsFlightBooking, setWantsFlightBooking] = useState(true);
  const [wantsLocalExperiences, setWantsLocalExperiences] = useState(true);
  const [wantsRestaurantReservations, setWantsRestaurantReservations] = useState(false);

  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  const updateFormData = <K extends keyof TravelFormData>(field: K, value: TravelFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDestination = () => {
    setFormData(prev => ({
      ...prev,
      destinations: [...prev.destinations, { name: '', duration: 3 }]
    }));
  };

  const removeDestination = (index: number) => {
    if (formData.destinations.length > 1) {
      setFormData(prev => ({
        ...prev,
        destinations: prev.destinations.filter((_, i) => i !== index)
      }));
    }
  };

  const updateDestination = (index: number, field: keyof Destination, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      destinations: prev.destinations.map((dest, i) => 
        i === index ? { ...dest, [field]: value } : dest
      )
    }));
  };

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      updateFormData('interests', [...formData.interests, interest]);
    } else {
      updateFormData('interests', formData.interests.filter(i => i !== interest));
    }
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    
    if (currentStep === 1) {
      if (!formData.departureLocation.trim()) {
        setError('Please enter your departure location');
        return false;
      }
      
      const emptyDestinations = formData.destinations.filter(dest => !dest.name.trim());
      if (emptyDestinations.length > 0) {
        setError('Please enter names for all destinations');
        return false;
      }
      
      const totalDuration = formData.destinations.reduce((sum, dest) => sum + dest.duration, 0);
      if (totalDuration < 1) {
        setError('Total trip duration must be at least 1 day');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.startDate) {
        setError('Please select a start date');
        return false;
      }
      if (!formData.endDate) {
        setError('Please select an end date');
        return false;
      }
      
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (start < today) {
        setError('Start date cannot be in the past');
        return false;
      }
      
      if (end < start) {
        setError('End date cannot be before start date');
        return false;
      }

      const tripDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const plannedDuration = formData.destinations.reduce((sum, dest) => sum + dest.duration, 0);
      
      if (tripDuration < plannedDuration) {
        setError(`Your planned destinations need ${plannedDuration} days, but your trip is only ${tripDuration} days. Please adjust the dates or destination durations.`);
        return false;
      }

      if (formData.budget === 'custom' && (!formData.maxBudget || formData.maxBudget <= 0)) {
        setError('Please enter a valid budget amount');
        return false;
      }
    } else if (currentStep === 3) {
      if (formData.interests.length === 0) {
        setError('Please select at least one interest to help us personalize your trip');
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 3) {
        setShowInteractiveQuestions(true);
        setTimeout(() => setStep(step + 1), 500);
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError(null);
  };

  const generateItinerary = async () => {
    if (!validateStep(3)) return;

    setIsLoading(true);
    setError(null);

    try {
      const enhancedFormData = {
        ...formData,
        wantsHotelRecommendations,
        wantsFlightBooking,
        wantsLocalExperiences,
        wantsRestaurantReservations,
        additionalNotes: `${formData.additionalNotes}\n\nSpecial Requests:\n- Hotel recommendations: ${wantsHotelRecommendations ? 'Yes' : 'No'}\n- Flight booking assistance: ${wantsFlightBooking ? 'Yes' : 'No'}\n- Local experiences: ${wantsLocalExperiences ? 'Yes' : 'No'}\n- Restaurant reservations: ${wantsRestaurantReservations ? 'Yes' : 'No'}`
      };

      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate itinerary');
      }

      const data = await response.json();
      
      if (typeof data === 'object' && data.overview) {
        setItinerary(data);
        setIsStructured(true);
      } else {
        setItinerary(data);
        setIsStructured(false);
      }
      
      setStep(4);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalDuration = () => {
    return formData.destinations.reduce((sum, dest) => sum + dest.duration, 0);
  };

  const stepTitles = [
    'Where would you like to go?',
    'When are you traveling?',
    'What do you love to do?',
    'Your perfect itinerary awaits!'
  ];

  const stepDescriptions = [
    'Tell us about your dream destinations and how long you\'d like to spend in each place.',
    'Let\'s plan the perfect timing for your adventure with your budget preferences.',
    'Share your interests so we can craft experiences that will create lasting memories.',
    'We\'re creating something amazing just for you!'
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className={`transition-all duration-700 ${isPageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
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
          <nav className={`flex space-x-6 transition-all duration-700 delay-300 ${isPageLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
            <Link href="/planner" className="text-teal-600 font-medium border-b-2 border-teal-600">
              Plan a Trip
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {}
        <div className={`mb-12 text-center transition-all duration-1000 ${isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            {stepTitles[step - 1]}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {stepDescriptions[step - 1]}
          </p>
        </div>

        <div className={`bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-700 ${isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 p-8">
            {}
            <div className="relative mb-12 mx-auto">
              <div className="grid grid-cols-4 gap-0">
                {[1, 2, 3, 4].map((num) => {
                  const isActive = step >= num;
                  const isCompleted = step > num;
                  
                  return (
                    <div key={num} className="flex flex-col items-center relative">
                      {num < 4 && (
                        <div className="absolute top-4 left-[calc(50%+12px)] h-0.5 bg-white/30 z-0" style={{ width: 'calc(100% - 24px)' }}></div>
                      )}
                      {num < 4 && isActive && num < step && (
                        <div className="absolute top-4 left-[calc(50%+12px)] h-0.5 bg-white z-10" style={{ width: 'calc(100% - 24px)' }}></div>
                      )}
                      
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                        border-2 relative z-20 mb-3
                        ${isActive 
                          ? 'bg-white text-teal-600 border-white' 
                          : 'bg-transparent text-white/70 border-white/30'
                        }
                      `}>
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span>{num}</span>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-xs font-medium transition-colors duration-300 ${
                          isActive ? 'text-white' : 'text-white/60'
                        }`}>
                          {num === 1 && 'Destinations'}
                          {num === 2 && 'Details'}
                          {num === 3 && 'Preferences'}
                          {num === 4 && 'Itinerary'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {}
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm mb-4">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-white/90 text-sm font-medium">Step {step} of 4</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {step === 1 && '🗺️ Choose Your Destinations'}
                {step === 2 && '📅 Set Your Details & Budget'}
                {step === 3 && '❤️ Tell Us Your Preferences'}
                {step === 4 && '✨ Your Perfect Itinerary'}
              </h2>
              <p className="text-white/80 text-lg">
                {step === 1 && 'Where would you like to explore?'}
                {step === 2 && 'When are you traveling and what\'s your budget?'}
                {step === 3 && 'What experiences matter most to you?'}
                {step === 4 && 'Your personalized travel plan is ready!'}
              </p>
            </div>
          </div>

          <div className="p-8 md:p-12">
            {error && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl flex items-center">
                <svg className="w-6 h-6 mr-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                                 <div className="bg-teal-50 p-8 rounded-2xl border border-teal-200">
                   <h3 className="text-2xl font-bold text-gray-900 mb-3">🌍 Plan Your Journey</h3>
                   <p className="text-gray-700 text-lg">Whether it&apos;s a single destination or a multi-city adventure, we&apos;ll help you create the perfect itinerary with seamless connections between each place.</p>
                 </div>

                {}
                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 text-white">
                      🛫
                    </span>
                    Where are you starting from?
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      🏠 Your departure city/airport
                    </label>
                    <input
                      type="text"
                      value={formData.departureLocation}
                      onChange={(e) => updateFormData('departureLocation', e.target.value)}
                      className="w-full px-6 py-4 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                      placeholder="e.g., New York City, London, Tokyo"
                    />
                    <p className="mt-2 text-sm text-gray-600">
                      This helps us find the best flights and transportation options for your journey.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Your Destinations</h3>
                    <button
                      onClick={addDestination}
                      className="bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded-xl text-white font-medium flex items-center hover:scale-105 transition-all duration-300"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Destination
                    </button>
                  </div>

                  {formData.destinations.map((destination, index) => (
                    <div key={index} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center">
                          <span className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-sm font-bold mr-3 text-white">
                            {index + 1}
                          </span>
                          Destination {index + 1}
                        </h4>
                        {formData.destinations.length > 1 && (
                          <button
                            onClick={() => removeDestination(index)}
                            className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-3">
                            📍 Where would you like to go?
                          </label>
                          <input
                            type="text"
                            value={destination.name}
                            onChange={(e) => updateDestination(index, 'name', e.target.value)}
                            className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-500"
                            placeholder="e.g., Paris, Tokyo, New York City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-3">
                            ⏰ How many days?
                          </label>
                          <select
                            value={destination.duration}
                            onChange={(e) => updateDestination(index, 'duration', parseInt(e.target.value))}
                            className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-gray-900"
                          >
                            {Array.from({ length: 14 }, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>{num} day{num !== 1 ? 's' : ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-800 font-bold text-lg">
                          Total Adventure: {getTotalDuration()} days
                        </p>
                        <p className="text-green-700">
                          Perfect for an unforgettable journey!
                        </p>
                      </div>
                      <div className="text-4xl">🎯</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-teal-600 hover:bg-teal-700 py-6 px-8 rounded-2xl text-white font-bold text-lg hover:scale-105 transition-all duration-300"
                >
                  Continue to Trip Details →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="bg-teal-50 p-8 rounded-2xl border border-teal-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">📅 Perfect Timing</h3>
                  <p className="text-gray-700 text-lg">Let&apos;s set your travel dates and budget to ensure we find the best deals and experiences for your journey.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <span className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-sm mr-3 text-white">📅</span>
                      Travel Dates
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          🛫 Departure Date
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => updateFormData('startDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          🏠 Return Date
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => updateFormData('endDate', e.target.value)}
                          min={formData.startDate || new Date().toISOString().split('T')[0]}
                          className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        👥 How many travelers?
                      </label>
                      <select
                        value={formData.travelers}
                        onChange={(e) => updateFormData('travelers', parseInt(e.target.value))}
                        className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-gray-900"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'person' : 'people'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-3">
                        🎭 What&apos;s your travel style?
                      </label>
                      <div className="space-y-3">
                        {TRAVEL_STYLES.map(style => (
                          <div 
                            key={style.value}
                            className={`p-4 border rounded-xl cursor-pointer transition-all ${
                              formData.travelStyle === style.value 
                                ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-400/50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            onClick={() => updateFormData('travelStyle', style.value)}
                          >
                            <div className="flex items-center space-x-4">
                              <span className="text-2xl">{style.icon}</span>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{style.label}</h4>
                                <p className="text-sm text-gray-600">{style.description}</p>
                              </div>
                              <input
                                type="radio"
                                name="travelStyle"
                                value={style.value}
                                checked={formData.travelStyle === style.value}
                                onChange={() => {}}
                                className="text-teal-600"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <span className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm mr-3 text-white">💰</span>
                      Budget Preferences
                    </h3>

                    <div className="space-y-4">
                      {BUDGET_OPTIONS.map(option => (
                        <div 
                          key={option.value}
                          className={`p-6 border rounded-xl cursor-pointer transition-all ${
                            formData.budget === option.value 
                              ? 'border-green-400 bg-green-50 ring-2 ring-green-400/50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => updateFormData('budget', option.value)}
                        >
                          <div className="flex items-start space-x-4">
                            <span className="text-3xl">{option.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-lg">{option.label}</h4>
                              <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                              <p className="text-sm text-green-700 font-medium">{option.range}</p>
                            </div>
                            <input
                              type="radio"
                              name="budget"
                              value={option.value}
                              checked={formData.budget === option.value}
                              onChange={() => {}}
                              className="text-green-600 mt-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {formData.budget === 'custom' && (
                      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          💵 Your Budget (USD)
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                            <span className="text-gray-500 text-xl">$</span>
                          </div>
                          <input
                            type="number"
                            value={formData.maxBudget || ''}
                            onChange={(e) => updateFormData('maxBudget', e.target.value ? Number(e.target.value) : undefined)}
                            className="block w-full pl-12 pr-6 py-4 bg-white/90 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            placeholder="5000"
                            min="100"
                          />
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          This includes flights, accommodation, food, activities, and transportation for your entire trip.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="bg-teal-600 hover:bg-teal-700 py-4 px-8 rounded-xl text-white font-bold hover:scale-105 transition-all duration-300"
                  >
                    Continue to Preferences →
                  </button>
                </div>
              </div>
            )}

            {}
            {step === 3 && (
              <div className="space-y-8">
                <div className="bg-green-50 p-8 rounded-2xl border border-green-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">❤️ What Makes You Happy?</h3>
                  <p className="text-gray-700 text-lg">Tell us about your interests and preferences so we can craft experiences that will create lasting memories.</p>
                </div>

                {}
                {showInteractiveQuestions && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">🤔 A few quick questions to personalize your trip:</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-gray-900">🏨 Hotel Recommendations</h4>
                            <p className="text-gray-600 text-sm">Would you like us to suggest the best hotels?</p>
                          </div>
                          <button
                            onClick={() => setWantsHotelRecommendations(!wantsHotelRecommendations)}
                            className={`w-12 h-6 rounded-full transition-all duration-300 ${
                              wantsHotelRecommendations ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                              wantsHotelRecommendations ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-gray-900">✈️ Flight Booking Help</h4>
                            <p className="text-gray-600 text-sm">Want the best flight options and routes?</p>
                          </div>
                          <button
                            onClick={() => setWantsFlightBooking(!wantsFlightBooking)}
                            className={`w-12 h-6 rounded-full transition-all duration-300 ${
                              wantsFlightBooking ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                              wantsFlightBooking ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-gray-900">🎭 Local Experiences</h4>
                            <p className="text-gray-600 text-sm">Include unique local activities and tours?</p>
                          </div>
                          <button
                            onClick={() => setWantsLocalExperiences(!wantsLocalExperiences)}
                            className={`w-12 h-6 rounded-full transition-all duration-300 ${
                              wantsLocalExperiences ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                              wantsLocalExperiences ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-gray-900">🍽️ Restaurant Reservations</h4>
                            <p className="text-gray-600 text-sm">Help with booking top restaurants?</p>
                          </div>
                          <button
                            onClick={() => setWantsRestaurantReservations(!wantsRestaurantReservations)}
                            className={`w-12 h-6 rounded-full transition-all duration-300 ${
                              wantsRestaurantReservations ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                              wantsRestaurantReservations ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-6">
                    🎯 What interests you most? (Select all that apply)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {INTEREST_OPTIONS.map((interest) => (
                      <div 
                        key={interest.value}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          formData.interests.includes(interest.value)
                            ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-400/50 scale-105'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:scale-105'
                        }`}
                        onClick={() => handleInterestChange(interest.value, !formData.interests.includes(interest.value))}
                      >
                                                  <div className="text-center">
                            <div className="text-3xl mb-3">{interest.icon}</div>
                            <div className="text-sm font-bold text-gray-900 mb-1">{interest.label}</div>
                            <div className="text-xs text-gray-600">{interest.description}</div>
                          </div>
                      </div>
                    ))}
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-6">
                      🏨 Where would you like to stay?
                    </label>
                    <div className="space-y-3">
                      {ACCOMMODATION_TYPES.map(type => (
                        <div 
                          key={type.value}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            formData.accommodation === type.value 
                              ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-400/50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => updateFormData('accommodation', type.value)}
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-2xl">{type.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{type.label}</h4>
                              <p className="text-sm text-gray-600">{type.description}</p>
                            </div>
                            <input
                              type="radio"
                              name="accommodation"
                              value={type.value}
                              checked={formData.accommodation === type.value}
                              onChange={() => {}}
                              className="text-purple-600"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-6">
                      🚗 How would you like to get around?
                    </label>
                    <div className="space-y-3">
                      {TRANSPORT_OPTIONS.map(option => (
                        <div 
                          key={option.value}
                          className={`p-4 border rounded-xl cursor-pointer transition-all ${
                            formData.transportPreference === option.value 
                              ? 'border-green-400 bg-green-50 ring-2 ring-green-400/50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => updateFormData('transportPreference', option.value)}
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-2xl">{option.icon}</span>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900">{option.label}</h4>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            <input
                              type="radio"
                              name="transport"
                              value={option.value}
                              checked={formData.transportPreference === option.value}
                              onChange={() => {}}
                              className="text-green-600"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-4">
                      🍽️ Any dietary preferences?
                    </label>
                    <select
                      value={formData.dietaryRestrictions}
                      onChange={(e) => updateFormData('dietaryRestrictions', e.target.value)}
                      className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {DIETARY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-lg font-bold text-gray-900 mb-4">
                      ♿ Any accessibility needs?
                    </label>
                    <select
                      value={formData.accessibility}
                      onChange={(e) => updateFormData('accessibility', e.target.value)}
                      className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {ACCESSIBILITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-4">
                    📝 Anything else we should know?
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                    rows={4}
                    className="w-full px-6 py-4 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder-gray-500"
                    placeholder="Tell us about special occasions, celebrations, specific places you want to visit, or anything else that would help us create your perfect trip..."
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={generateItinerary}
                    disabled={isLoading}
                    className="bg-teal-600 hover:bg-teal-700 py-4 px-8 rounded-xl text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:scale-105 transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <div className="border-3 border-white/30 rounded-full border-t-current w-6 h-6 animate-spin mr-3"></div>
                        Creating Your Perfect Trip...
                      </>
                    ) : (
                      <>
                        ✨ Generate My Dream Itinerary
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {}
            {step === 4 && (
              <div className="space-y-8">
                {isLoading ? (
                  <div className="text-center py-16">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                      <div className="border-3 border-white/30 rounded-full border-t-current w-6 h-6 animate-spin"></div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">✨ Crafting Your Perfect Journey</h3>
                    <p className="text-gray-700 text-lg mb-8 max-w-2xl mx-auto">
                      Our AI travel expert is analyzing your preferences and creating a personalized itinerary with the best hotels, flights, activities, and local experiences...
                    </p>
                    <div className="max-w-lg mx-auto bg-gray-100 rounded-xl h-6 mb-8 shadow-lg overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-xl" style={{ width: '75%' }}></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-sm">
                      <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:scale-105 transition-all duration-300">
                        <div className="flex gap-1.5 items-center justify-center text-emerald-400">
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-300"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-500"></div>
                        </div>
                        <span className="text-white font-medium">Finding flights</span>
                      </div>
                      <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:scale-105 transition-all duration-300">
                        <div className="flex gap-1.5 items-center justify-center text-cyan-400">
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-300"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-500"></div>
                        </div>
                        <span className="text-white font-medium">Selecting hotels</span>
                      </div>
                      <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:scale-105 transition-all duration-300">
                        <div className="flex gap-1.5 items-center justify-center text-violet-400">
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-300"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-500"></div>
                        </div>
                        <span className="text-white font-medium">Planning activities</span>
                      </div>
                      <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:scale-105 transition-all duration-300">
                        <div className="flex gap-1.5 items-center justify-center text-rose-400">
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-300"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-current shadow animate-pulse delay-500"></div>
                        </div>
                        <span className="text-white font-medium">Local recommendations</span>
                      </div>
                    </div>
                  </div>
                ) : itinerary ? (
                  <div className="space-y-8">
                    <div className="text-center py-8 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl border border-green-400/30">
                      <div className="text-6xl mb-4">🎉</div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-3">Your Dream Itinerary is Ready!</h3>
                      <p className="text-gray-700 text-lg">Get ready for an unforgettable adventure crafted just for you</p>
                    </div>
                    
                    <ItineraryDisplay
                      itinerary={itinerary}
                      destination={formData.destinations.map(d => d.name).join(', ')}
                      startDate={formData.startDate}
                      endDate={formData.endDate}
                      isStructured={isStructured}
                    />
                    
                    <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <button
                        onClick={handleBack}
                        className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                      >
                        ← Modify Preferences
                      </button>
                      <button
                        onClick={() => {
                          setStep(1);
                          setItinerary(null);
                          setShowInteractiveQuestions(false);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 py-4 px-8 rounded-xl text-white font-bold hover:scale-105 transition-all duration-300"
                      >
                        🆕 Plan Another Adventure
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">😔</div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h3>
                    <p className="text-gray-700 text-lg mb-8 max-w-md mx-auto">
                      We couldn&apos;t generate your itinerary right now. Don&apos;t worry, let&apos;s try again!
                    </p>
                    <button
                      onClick={handleBack}
                      className="bg-teal-600 hover:bg-teal-700 py-4 px-8 rounded-xl text-white font-bold hover:scale-105 transition-all duration-300"
                    >
                      ← Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-12 mt-16">
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