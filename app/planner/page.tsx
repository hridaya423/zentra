'use client';

import { useState, useEffect } from 'react';
import { Plane, MapPin, Calendar, Heart, ArrowRight, Sparkles, Check, Globe, Settings, ChevronDown, Plus, ChevronUp } from 'lucide-react';
import ItineraryDisplay from '@/components/ItineraryDisplay';
import TravelAssistantChat from '@/components/TravelAssistantChat';
import { Destination, TravelFormData, StructuredItinerary } from '@/types/travel';
import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

const TRAVEL_STYLES = [
  { value: 'relaxed', label: 'Relaxed - Plenty of downtime', icon: '🧘', description: 'Slow-paced with time to unwind' },
  { value: 'balanced', label: 'Balanced - Mix of activities and rest', icon: '⚖️', description: 'Perfect blend of adventure and relaxation' },
  { value: 'active', label: 'Active - Packed with activities', icon: '🏃', description: 'Action-packed days with lots to see' },
  { value: 'adventurous', label: 'Adventurous - Seeking thrills', icon: '🧗', description: 'Extreme sports and unique experiences' },
  { value: 'cultural', label: 'Cultural - Focus on culture and history', icon: '🏛️', description: 'Museums, heritage sites, and local traditions' },
  { value: 'foodie', label: 'Foodie - Culinary experiences', icon: '🍜', description: 'Food tours, cooking classes, and fine dining' }
];

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Low Budget', icon: '💰', description: 'Affordable accommodations, local dining, public transport' },
  { value: 'moderate', label: 'Comfort Budget', icon: '💳', description: 'Mid-range hotels, good dining options, flexible transport' },
  { value: 'luxury', label: 'Luxury Budget', icon: '💎', description: 'Premium hotels, fine dining, private experiences' },
  { value: 'custom', label: 'Custom Budget', icon: '⚙️', description: 'Set your own spending limit' }
];

const ACCOMMODATION_TYPES = [
  { value: 'best', label: 'Best Options Available', icon: '✨', description: 'We will find the perfect accommodation for your style and budget' },
  { value: 'hotel', label: 'Hotels', icon: '🏨', description: 'Traditional hotels with amenities' },
  { value: 'unique', label: 'Unique Stays', icon: '🏡', description: 'Boutique hotels, B&Bs, and local properties' },
  { value: 'budget', label: 'Budget-Friendly', icon: '💰', description: 'Hostels, guesthouses, and affordable options' }
];

const TRANSPORT_OPTIONS = [
  { value: 'best', label: 'Best Options Available', icon: '✨', description: 'We will recommend the optimal transport for your route' },
  { value: 'fast', label: 'Fastest Routes', icon: '✈️', description: 'Prioritize speed and convenience' },
  { value: 'scenic', label: 'Scenic Routes', icon: '🚄', description: 'Enjoy the journey with beautiful views' },
  { value: 'budget', label: 'Budget-Friendly', icon: '🚌', description: 'Most affordable transport options' },
  { value: 'flexible', label: 'Maximum Flexibility', icon: '🚙', description: 'Freedom to explore at your own pace' }
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


interface WeatherForecast {
  date: string;
  temperature: { min: number; max: number };
  description: string;
}

interface PlaceData {
  name: string;
  rating?: number;
  category?: string;
}

interface ActivityData {
  name: string;
  duration?: string;
}

function PlannerPageClient() {
  'use client';

  const searchParams = useSearchParams();
  const destinationParam = searchParams.get('destination');
  
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<StructuredItinerary | string | null>(null);
  const [isStructured, setIsStructured] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  
  const [tripDescription, setTripDescription] = useState('');
  const [suggestedLocations, setSuggestedLocations] = useState<Array<{name: string, country: string, reason: string, duration: number}>>([]);
  const [selectedLocations, setSelectedLocations] = useState<Array<{name: string, country: string, duration: number}>>([]);
  const [quickDates, setQuickDates] = useState({ startDate: '', endDate: '' });
  const [quickTravelers, setQuickTravelers] = useState(1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  
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
    accommodation: 'best',
    transportPreference: 'best',
    dietaryRestrictions: 'none',
    accessibility: 'none',
    additionalNotes: ''
  });

  
  useEffect(() => {
    if (destinationParam) {
      try {
        const destinationData = JSON.parse(decodeURIComponent(destinationParam));
        
        
        if (destinationData.description) {
          setTripDescription(`I want to visit ${destinationData.name}. ${destinationData.description}`);
          
          
          setTimeout(() => {
            generateLocationSuggestions();
          }, 500);
        }
        
        
        if (destinationData.name) {
          setFormData(prev => ({
            ...prev,
            destinations: [{ name: destinationData.name, duration: 3 }]
          }));
        }
      } catch (error) {
        console.error('Error parsing destination parameter:', error);
      }
    }
  }, [destinationParam]);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [departureCity, setDepartureCity] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [wantsHotelRecommendations, setWantsHotelRecommendations] = useState(true);
  const [wantsFlightBooking, setWantsFlightBooking] = useState(true);
  const [wantsLocalExperiences, setWantsLocalExperiences] = useState(true);
  const [detectedInterests, setDetectedInterests] = useState<string[]>(['sightseeing', 'local culture', 'food experiences']);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['sightseeing', 'local culture', 'food experiences']);
  const [customInterest, setCustomInterest] = useState('');
  
  
  useEffect(() => {
    const detectUserLocation = async () => {
      setIsLoadingLocation(true);
      try {
        
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (!geoResponse.ok) throw new Error('Failed to fetch location data');
        
        const geoData = await geoResponse.json();
        
        if (geoData.city) {
          
          setDepartureCity(geoData.city);
        } else {
          
          setDepartureCity('New York');
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        setDepartureCity('New York'); 
      } finally {
        setIsLoadingLocation(false);
      }
    };

    detectUserLocation();
  }, []);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<StructuredItinerary | null>(null);

  
  const handleItineraryUpdate = (updatedItinerary: StructuredItinerary) => {
    setItinerary(updatedItinerary);
    setCurrentItinerary(updatedItinerary);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  
  const [aiSuggestions, setAiSuggestions] = useState<Array<{name: string, description: string, icon: string, category: string}>>([]);
  const [customInterests, setCustomInterests] = useState('');

  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  
  useEffect(() => {
    if (step === 3 && formData.destinations.length > 0 && formData.destinations[0].name.trim()) {
      const timer = setTimeout(() => {
        loadAiSuggestions();
      }, 500); 
      
      return () => clearTimeout(timer);
    }
  }, [step, formData.destinations.map(d => d.name).join(','), formData.travelStyle]);

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

  
  const loadAiSuggestions = async () => {
    if (formData.destinations.length === 0 || !formData.destinations[0].name.trim()) {
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: formData.destinations,
          travelStyle: formData.travelStyle
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCustomInterestsSubmit = () => {
    if (customInterests.trim()) {
      const newInterests = customInterests.split(',').map(i => i.trim()).filter(i => i);
      const allInterests = [...new Set([...formData.interests, ...newInterests])];
      updateFormData('interests', allInterests);
      setCustomInterests('');
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
      setStep(step + 1);
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
        wantsLocalExperiences: true, 
        additionalNotes: `${formData.additionalNotes}\n\nSpecial Requests:\n- Hotel recommendations: ${wantsHotelRecommendations ? 'Yes' : 'No'}\n- Flight booking assistance: ${wantsFlightBooking ? 'Yes' : 'No'}\n- Local experiences: Yes`
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
        setCurrentItinerary(data as StructuredItinerary);
      } else {
        setItinerary(data);
        setIsStructured(false);
        setCurrentItinerary(null);
      }
      
      setStep(4);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  
  const generateLocationSuggestions = async () => {
    if (!tripDescription.trim()) {
      setError('Please describe your ideal trip');
      return;
    }

    setLoadingSuggestions(true);
    setError(null);
    
    try {
      const response = await fetch('/api/quick-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: tripDescription })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }
      
      const data = await response.json();
      setSuggestedLocations(data.locations || []);
      setShowAllSuggestions(false); 
      setStep(0.5); 
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setError('Failed to get location suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getMoreSuggestions = async () => {
    if (!tripDescription.trim()) return;

    setLoadingSuggestions(true);
    
    try {
      const response = await fetch('/api/quick-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: tripDescription + " Please suggest some alternative and more unique destinations, including hidden gems and off-the-beaten-path locations."
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get more suggestions');
      }
      
      const data = await response.json();
      
      const newLocations = data.locations || [];
      const existingNames = suggestedLocations.map(loc => loc.name);
      const uniqueNewLocations = newLocations.filter((loc: {name: string, country: string, reason: string, duration: number}) => 
        !existingNames.includes(loc.name)
      );
      
      setSuggestedLocations(prev => [...prev, ...uniqueNewLocations]);
    } catch (error) {
      console.error('Error getting more suggestions:', error);
      setError('Failed to get more suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const generateQuickItinerary = async () => {
    if (selectedLocations.length === 0) {
      setError('Please select at least one location');
      return;
    }
    
    if (!quickDates.startDate || !quickDates.endDate) {
      setError('Please select your travel dates');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      
      const analyzeTripDescription = async () => {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'deepseek-r1-distill-llama-70b',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert travel analyst. Analyze trip descriptions to extract detailed travel preferences. Return ONLY valid JSON with no explanations.'
                },
                {
                  role: 'user',
                  content: `Analyze this trip description and extract detailed preferences: "${tripDescription}"
                  
                  Return JSON in this format:
                  {
                    "budget": "budget|moderate|premium",
                    "travelStyle": "relaxed|balanced|active|adventurous|cultural|foodie",
                    "interests": ["array", "of", "specific", "interests"],
                    "accommodation": "budget|best|premium",
                    "transportPreference": "budget|best|premium",
                    "dietaryRestrictions": "none|vegetarian|vegan|halal|kosher|gluten-free|other",
                    "groupType": "solo|couple|family|friends",
                    "specialNeeds": "accessibility or other special requirements"
                  }`
                }
              ],
              max_tokens: 500,
              temperature: 0.3
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            if (content) {
              try {
                const parsed = JSON.parse(content);
                if (parsed.interests && Array.isArray(parsed.interests) && parsed.interests.length > 0) {
                  setDetectedInterests(parsed.interests);
                  setSelectedInterests(parsed.interests);
                }
                return parsed;
              } catch (e) {
                console.error('Failed to parse preferences:', e);
              }
            }
          }
        } catch (error) {
          console.error('Error analyzing trip description:', error);
        }
        
        
        return {
         budget: 'moderate',
         travelStyle: 'balanced',
          interests: ['sightseeing', 'local culture', 'food experiences'],
         accommodation: 'best',
         transportPreference: 'best',
         dietaryRestrictions: 'none',
          groupType: 'couple',
          specialNeeds: null
        };
      };

      
      const enhancedPreferences = await analyzeTripDescription();

      
      const gatherComprehensiveData = async () => {
        const dataPromises = selectedLocations.map(async (location) => {
          const destName = `${location.name}, ${location.country}`;
          
          try {
            
            const [weatherData, placesData, uniqueActivities, aiSuggestions] = await Promise.all([
              
              fetch('/api/weather', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination: location.name })
              }).then(res => res.ok ? res.json() : null).catch(() => null),

              
              fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  destination: location.name, 
                  interests: enhancedPreferences.interests 
                })
              }).then(res => res.ok ? res.json() : null).catch(() => null),

              
              fetch('/api/discover-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  destination: location.name,
                  interests: enhancedPreferences.interests,
                  travelStyle: enhancedPreferences.travelStyle
                })
              }).then(res => res.ok ? res.json() : null).catch(() => null),

              
              fetch('/api/local-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  destination: location.name,
                  interests: enhancedPreferences.interests,
                  travelStyle: enhancedPreferences.travelStyle,
                  budget: enhancedPreferences.budget,
                  dates: `${quickDates.startDate} to ${quickDates.endDate}`,
                  duration: location.duration
                })
              }).then(res => res.ok ? res.json() : null).catch(() => null)
            ]);

            return {
              destination: destName,
              location,
              weatherData,
              placesData,
              uniqueActivities: uniqueActivities?.activities || [],
              aiSuggestions
            };
          } catch (error) {
            console.error(`Error gathering data for ${destName}:`, error);
            return {
              destination: destName,
              location,
              weatherData: null,
              placesData: null,
              uniqueActivities: [],
              aiSuggestions: null
            };
          }
        });

        return Promise.all(dataPromises);
      };

      const comprehensiveData = await gatherComprehensiveData();

      
      const quickFormData = {
        departureLocation: departureCity || 'Auto-detecting your location...',
        destinations: selectedLocations.map(loc => ({ name: `${loc.name}, ${loc.country}`, duration: loc.duration })),
        startDate: quickDates.startDate,
        endDate: quickDates.endDate,
        travelers: quickTravelers,
        budget: enhancedPreferences.budget,
        maxBudget: enhancedPreferences.budget === 'premium' ? 5000 : enhancedPreferences.budget === 'moderate' ? 2000 : 1000,
        travelStyle: enhancedPreferences.travelStyle,
        interests: selectedInterests.length > 0 ? selectedInterests : enhancedPreferences.interests,
        accommodation: enhancedPreferences.accommodation,
        transportPreference: enhancedPreferences.transportPreference,
        dietaryRestrictions: enhancedPreferences.dietaryRestrictions,
        accessibility: enhancedPreferences.specialNeeds?.includes('accessibility') ? 'wheelchair' : 'none',
        additionalNotes: `Enhanced Quick Mode Analysis:

ORIGINAL TRIP DESCRIPTION: ${tripDescription}

COMPREHENSIVE DATA GATHERED:
${comprehensiveData.map(dest => `
${dest.destination}:
 - Weather: ${dest.weatherData ? `${dest.weatherData.current?.temperature}°C, ${dest.weatherData.current?.description}. Forecast: ${dest.weatherData.forecast?.slice(0,3).map((f: WeatherForecast) => `${f.date}: ${f.temperature.min}-${f.temperature.max}°C`).join(', ')}` : 'Data unavailable'}
 - Top Attractions: ${dest.placesData?.categories?.attractions?.slice(0,3).map((p: PlaceData) => `${p.name} (${p.rating || 'No rating'})`).join(', ') || 'Standard attractions'}
 - Unique Activities: ${dest.uniqueActivities.slice(0,3).map((a: ActivityData) => `${a.name} (${a.duration || '2-3 hours'})`).join(', ') || 'Standard activities'}
 - Best Dining: ${dest.placesData?.categories?.dining?.slice(0,2).map((p: PlaceData) => `${p.name} (${p.category})`).join(', ') || 'Local restaurants'}
 - Local Insights: ${dest.aiSuggestions ? `Hidden gems: ${dest.aiSuggestions.hiddenGems?.slice(0,2).join(', ') || 'Local favorites'} | Cultural tips: ${dest.aiSuggestions.culturalTips?.slice(0,1).join(', ') || 'Respect local customs'} | Food highlights: ${dest.aiSuggestions.foodRecommendations?.slice(0,1).join(', ') || 'Try local cuisine'}` : 'Standard local recommendations'}
`).join('')}

ENHANCED PREFERENCES DETECTED:
- Travel Style: ${enhancedPreferences.travelStyle}
- Budget Level: ${enhancedPreferences.budget}
- Key Interests: ${selectedInterests.length > 0 ? selectedInterests.join(', ') : enhancedPreferences.interests.join(', ')}
- Group Type: ${enhancedPreferences.groupType}
- Accommodation Preference: ${enhancedPreferences.accommodation}

REAL-TIME INTELLIGENCE:
- Weather conditions and packing recommendations included
- Current local events and seasonal considerations
- Verified attraction ratings and locations
- Unique activity recommendations with booking guidance
- Local dining scene with authentic options
- Transport and logistics insights

This quick mode now includes the same comprehensive data gathering as detailed mode, with real-time weather, places discovery, unique activity research, and enhanced preference analysis.`,
        
        wantsHotelRecommendations: wantsHotelRecommendations,
        wantsFlightBooking: wantsFlightBooking,
        wantsLocalExperiences: wantsLocalExperiences,
        
        comprehensiveData: comprehensiveData
      };


      const response = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickFormData),
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
      console.error('Error generating enhanced quick itinerary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = [
    'How would you like to plan your trip?',
    'Where would you like to go?',
    'When are you traveling?',
    'What experiences inspire you?',
    'Your perfect itinerary awaits!'
  ];

  const stepDescriptions = [
    'Choose your preferred planning experience - quick AI magic or detailed customization.',
    'Tell us about your dream destinations and how long you\'d like to spend in each place.',
    'Let\'s plan the perfect timing for your adventure with your budget preferences.',
    'Share your interests so we can craft experiences that will create lasting memories.',
    'We\'re creating something amazing just for you!'
  ];

  const stepIcons = [
    <Sparkles key="sparkles" className="w-6 h-6" />,
    <Globe key="globe" className="w-6 h-6" />,
    <Calendar key="calendar" className="w-6 h-6" />,
    <Heart key="heart" className="w-6 h-6" />,
    <Sparkles key="sparkles2" className="w-6 h-6" />
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {step !== 0 && (
          <div className={`mb-12 text-center transition-all duration-1000 ease-out ${isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-6 border border-white/40">
              {stepIcons[step]}
              <span className="text-gray-700 font-medium ml-3">
                {step === 0.5 ? 'Quick Planning' : `Step ${step} of 4`}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-display mb-4 text-gray-900 leading-tight">
              {step === 0.5 ? 'Perfect! Here are some amazing destinations for you' : stepTitles[step]}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-body leading-relaxed">
              {step === 0.5 ? 'Based on your description, we found these incredible places. Select the ones that excite you most!' : stepDescriptions[step]}
            </p>
          </div>
        )}

        
        <div className={`card-elevated overflow-hidden transition-all duration-700 ease-out ${isPageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          {step > 0 && step !== 0.5 && (
            <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-8 relative overflow-hidden">
              
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="step-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="1" fill="white" opacity="0.3"/>
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#step-pattern)" />
                </svg>
              </div>

              
              <div className="relative mb-8 mx-auto max-w-2xl">
                <div className="grid grid-cols-4 gap-0">
                  {[1, 2, 3, 4].map((num) => {
                    const isActive = step >= num;
                    const isCompleted = step > num;
                    const isCurrent = step === num;
                    
                    return (
                      <div key={num} className="flex flex-col items-center relative">
                        
                        {num < 4 && (
                          <div className="absolute top-5 left-[calc(50%+16px)] h-0.5 bg-white/20 z-0" style={{ width: 'calc(100% - 32px)' }}></div>
                        )}
                        {num < 4 && isActive && num < step && (
                          <div className="absolute top-5 left-[calc(50%+16px)] h-0.5 bg-white progress-glow z-10" style={{ width: 'calc(100% - 32px)' }}></div>
                        )}
                        
                        
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                          border-2 relative z-20 mb-4 transition-all duration-300
                          ${isCurrent 
                            ? 'step-active scale-110' 
                            : isCompleted 
                              ? 'step-completed' 
                              : 'step-inactive'
                          }
                        `}>
                          {isCompleted ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <span>{num}</span>
                          )}
                        </div>
                        
                        
                        <div className="text-center">
                          <div className={`text-sm font-medium transition-colors duration-300 ${
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
              
              
              <div className="text-center relative z-10">
                <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full mb-6">
                  <div className="w-3 h-3 bg-white rounded-full mr-3 animate-pulse"></div>
                  <span className="text-white font-medium">Step {step} of 4</span>
                </div>
                <h2 className="text-3xl font-display text-white mb-3">
                  {step === 1 && 'Choose Your Destinations'}
                  {step === 2 && 'Set Your Details & Budget'}
                  {step === 3 && 'Share Your Preferences'}
                  {step === 4 && 'Your Perfect Itinerary'}
                </h2>
                <p className="text-white/90 text-lg font-body">
                  {step === 1 && 'Where would you like to explore on your journey?'}
                  {step === 2 && 'When are you traveling and what is your budget?'}
                  {step === 3 && 'What experiences matter most to you?'}
                  {step === 4 && 'Your personalized travel plan is ready!'}
                </p>
              </div>
            </div>
          )}

          
          <div className="p-8 md:p-12">
            {error && (
              <div className="mb-8 p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            
            {step === 0 && (
              <div className="max-w-5xl mx-auto">
                
                <div className="text-center mb-12">
                  <h1 className="text-4xl md:text-5xl font-display mb-4 text-gray-900 leading-tight">
                    Plan Your Perfect Trip
                  </h1>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Start by describing your dream trip or use our detailed form for full customization
                  </p>
                </div>

                <div className="space-y-12">
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-display text-gray-900">Describe your dream trip</h2>
                        <p className="text-gray-600">Let AI craft the perfect itinerary with comprehensive real-time data</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🌤️ Live Weather
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🏛️ Real Attractions
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🎯 Unique Activities
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            💡 Local Insights
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <textarea
                      value={tripDescription}
                      onChange={(e) => setTripDescription(e.target.value)}
                      rows={6}
                      className="w-full p-6 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-300 resize-none placeholder-gray-400"
                      placeholder="Tell us about your ideal trip... 

For example: I want a romantic 7-day trip to Europe with beautiful architecture, great food, and cozy cafes. Budget around $4000 for 2 people. We love history, wine tasting, and taking scenic walks..."
                    />
                    
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          generateLocationSuggestions();
                        }}
                        disabled={loadingSuggestions || !tripDescription.trim()}
                        className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 px-8 rounded-2xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-teal-700 hover:to-cyan-700 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {loadingSuggestions ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                            Finding Perfect Destinations...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-6 h-6 mr-3" />
                            Get AI Suggestions
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  
                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-8 py-2 text-2xl font-semibold text-gray-500 border-2 border-gray-200 rounded-full">OR</span>
                    </div>
                  </div>

                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-display text-gray-900">Use detailed form</h2>
                        <p className="text-gray-600">
                          <span className="font-semibold text-purple-600">Recommended for more detailed itineraries.</span> Full control over every aspect of your journey.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
                        <Globe className="w-8 h-8 text-purple-500 mb-3" />
                        <span className="font-medium text-gray-900">Choose Destinations</span>
                        <span className="text-sm text-gray-600 text-center mt-1">Pick cities and duration</span>
                      </div>
                      <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
                        <Calendar className="w-8 h-8 text-purple-500 mb-3" />
                        <span className="font-medium text-gray-900">Set Dates & Budget</span>
                        <span className="text-sm text-gray-600 text-center mt-1">Travel dates and spending</span>
                      </div>
                      <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
                        <Heart className="w-8 h-8 text-purple-500 mb-3" />
                        <span className="font-medium text-gray-900">Share Preferences</span>
                        <span className="text-sm text-gray-600 text-center mt-1">Interests and style</span>
                      </div>
                      <div className="flex flex-col items-center p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors">
                        <Plane className="w-8 h-8 text-purple-500 mb-3" />
                        <span className="font-medium text-gray-900">Get Itinerary</span>
                        <span className="text-sm text-gray-600 text-center mt-1">Personalized plan</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setStep(1);
                      }}
                      className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-8 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <ArrowRight className="w-6 h-6 mr-3" />
                      Start Detailed Planning
                    </button>
                  </div>
                </div>
              </div>
            )}

            
            {step === 0.5 && (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-200">
                  <div className="flex items-center mb-4">
                    <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                      <h3 className="text-2xl font-display text-gray-900 mb-2">AI-Suggested Destinations</h3>
                                             <p className="text-gray-700">Based on: <em>{tripDescription}</em></p>
                      
                    </div>
                  </div>
                </div>

                {suggestedLocations.length > 0 && (
                  <div className="space-y-8">
                    
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-display text-gray-900">Choose Your Destinations</h4>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">
                            {selectedLocations.length} destination{selectedLocations.length !== 1 ? 's' : ''} selected
                          </span>
                          <button
                            onClick={getMoreSuggestions}
                            disabled={loadingSuggestions}
                            className="text-sm bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                          >
                            {loadingSuggestions ? (
                              <div className="flex items-center">
                                <div className="w-3 h-3 border border-purple-700 border-t-transparent rounded-full animate-spin mr-2"></div>
                                Loading...
                              </div>
                            ) : (
                              'Get More Options'
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {selectedLocations.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Selected destinations:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedLocations.map((location, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm"
                              >
                                {location.name}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLocations(selectedLocations.filter(sel => sel.name !== location.name));
                                  }}
                                  className="ml-2 text-teal-600 hover:text-teal-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(showAllSuggestions ? suggestedLocations : suggestedLocations.slice(0, 6)).map((location, index) => {
                        const isSelected = selectedLocations.some(sel => sel.name === location.name);
                        return (
                        <div 
                          key={index}
                            className={`relative group cursor-pointer transition-all duration-300 ${
                              isSelected
                                ? 'transform scale-105' 
                                : 'hover:scale-102'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedLocations(selectedLocations.filter(sel => sel.name !== location.name));
                            } else {
                              setSelectedLocations([...selectedLocations, location]);
                            }
                          }}
                        >
                            <div className={`card-elevated p-6 h-full transition-all duration-300 ${
                              isSelected
                                ? 'ring-4 ring-teal-400 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200' 
                                : 'hover:shadow-lg border-gray-200'
                            }`}>
                              
                              <div className={`absolute top-4 right-4 w-6 h-6 rounded-full transition-all duration-300 ${
                                isSelected
                                  ? 'bg-teal-500 ring-2 ring-white'
                                  : 'bg-gray-200 group-hover:bg-gray-300'
                              }`}>
                                {isSelected && (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                            </div>
                                )}
                            </div>

                              
                              <div className="absolute top-4 left-4">
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  isSelected
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {location.duration} day{location.duration !== 1 ? 's' : ''}
                                </span>
                          </div>

                              <div className="mt-8 mb-4">
                                <h5 className={`text-xl font-display mb-1 ${
                                  isSelected ? 'text-teal-900' : 'text-gray-900'
                                }`}>
                                  {location.name}
                                </h5>
                                <p className={`text-sm font-medium ${
                                  isSelected ? 'text-teal-700' : 'text-gray-600'
                                }`}>
                                  {location.country}
                                </p>
                        </div>

                              <p className={`text-sm leading-relaxed ${
                                isSelected ? 'text-teal-800' : 'text-gray-700'
                              }`}>
                                {location.reason}
                              </p>

                              
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <span className={`text-sm font-medium ${
                                  isSelected ? 'text-teal-700' : 'text-gray-500'
                                }`}>
                                  {isSelected ? '✓ Selected' : 'Click to select'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    
                    {suggestedLocations.length > 6 && !showAllSuggestions && (
                      <div className="text-center">
                        <button
                          onClick={() => setShowAllSuggestions(true)}
                          className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Show {suggestedLocations.length - 6} More Options
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    )}

                    {selectedLocations.length > 0 && (
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                          <h4 className="text-lg font-display text-gray-900 mb-4">Quick Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
                              <input
                                type="date"
                                value={quickDates.startDate}
                                onChange={(e) => setQuickDates(prev => ({ ...prev, startDate: e.target.value }))}
                                min={new Date().toISOString().split('T')[0]}
                                className="form-input w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                              <input
                                type="date"
                                value={quickDates.endDate}
                                onChange={(e) => setQuickDates(prev => ({ ...prev, endDate: e.target.value }))}
                                min={quickDates.startDate || new Date().toISOString().split('T')[0]}
                                className="form-input w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-2">Travelers</label>
                              <select
                                value={quickTravelers}
                                onChange={(e) => setQuickTravelers(parseInt(e.target.value))}
                                className="form-input w-full"
                              >
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                                  <option key={num} value={num}>
                                    {num} {num === 1 ? 'person' : 'people'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-md font-semibold text-gray-900">Advanced Settings</h5>
                              <button 
                                type="button"
                                onClick={() => setShowAdvancedSettings(prev => !prev)}
                                className="text-sm text-teal-600 hover:text-teal-800 flex items-center"
                              >
                                {showAdvancedSettings ? (
                                  <>Hide <ChevronUp className="w-4 h-4 ml-1" /></>
                                ) : (
                                  <>Show <ChevronDown className="w-4 h-4 ml-1" /></>
                                )}
                              </button>
                            </div>
                            
                            {showAdvancedSettings && (
                              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-2">Departure City</label>
                                  <input
                                    type="text"
                                    value={departureCity}
                                    onChange={(e) => setDepartureCity(e.target.value)}
                                    placeholder={isLoadingLocation ? "Detecting your location..." : "Enter your departure city"}
                                    className="form-input w-full"
                                  />
                                  <p className="mt-1 text-xs text-gray-500">
                                    {isLoadingLocation ? "Detecting your location..." : "We've automatically detected your location. You can change it if needed."}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h6 className="text-sm font-semibold text-gray-900 mb-2">Booking Preferences</h6>
                                    <div className="space-y-2">
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={wantsHotelRecommendations}
                                          onChange={(e) => setWantsHotelRecommendations(e.target.checked)}
                                          className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Include hotel recommendations</span>
                                      </label>
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={wantsFlightBooking}
                                          onChange={(e) => setWantsFlightBooking(e.target.checked)}
                                          className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Include flight recommendations</span>
                                      </label>
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={wantsLocalExperiences}
                                          onChange={(e) => setWantsLocalExperiences(e.target.checked)}
                                          className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">Include local experiences</span>
                                      </label>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h6 className="text-sm font-semibold text-gray-900 mb-2">Detected Interests</h6>
                                    <div className="flex flex-wrap gap-2">
                                      {detectedInterests.map((interest, index) => (
                                        <span 
                                          key={index}
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                                            selectedInterests.includes(interest) 
                                              ? 'bg-teal-100 text-teal-800' 
                                              : 'bg-gray-100 text-gray-700'
                                          } cursor-pointer`}
                                          onClick={() => toggleInterest(interest)}
                                        >
                                          {interest}
                                          {selectedInterests.includes(interest) ? (
                                            <Check className="w-3 h-3 ml-1" />
                                          ) : (
                                            <Plus className="w-3 h-3 ml-1" />
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    <div className="mt-3">
                                      <input
                                        type="text"
                                        value={customInterest}
                                        onChange={(e) => setCustomInterest(e.target.value)}
                                        placeholder="Add custom interest"
                                        className="form-input w-full text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && customInterest.trim()) {
                                            e.preventDefault();
                                            if (!detectedInterests.includes(customInterest.trim())) {
                                              setDetectedInterests(prev => [...prev, customInterest.trim()]);
                                            }
                                            setSelectedInterests(prev => [...prev, customInterest.trim()]);
                                            setCustomInterest('');
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <button
                            onClick={() => {
                              setStep(0);
                              setSuggestedLocations([]);
                              setSelectedLocations([]);
                            }}
                            className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                          >
                            ← Back to Options
                          </button>
                          <button
                            onClick={generateQuickItinerary}
                            disabled={isLoading}
                            className="btn-primary flex items-center"
                          >
                            {isLoading ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                Gathering Comprehensive Data & Creating Your Trip...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate My Itinerary
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            
            {step >= 1 && step <= 4 && (
              <>
                {step === 1 && (
                  <div className="space-y-8">
                    
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-200">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-display text-gray-900 mb-3">Plan Your Dream Journey</h3>
                          <p className="text-gray-700 text-lg font-body leading-relaxed">Whether it is a single destination or a multi-city adventure, we will help you create the perfect itinerary with seamless connections between each place.</p>
                        </div>
                      </div>
                    </div>

                    
                    <div className="card-elevated p-8">
                      <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                          <Plane className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-display text-gray-900">Where are you starting from?</h3>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Your departure city or airport
                        </label>
                        <input
                          type="text"
                          value={formData.departureLocation}
                          onChange={(e) => updateFormData('departureLocation', e.target.value)}
                          className="form-input w-full"
                          placeholder="e.g., New York City, London, Tokyo"
                        />
                        <p className="mt-3 text-sm text-gray-600 font-body">
                          This helps us find the best flights and transportation options for your journey.
                        </p>
                      </div>
                    </div>

                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-display text-gray-900">Your Destinations</h3>
                        <button
                          onClick={addDestination}
                          className="btn-primary flex items-center"
                        >
                          <MapPin className="w-5 h-5 mr-2" />
                          Add Destination
                        </button>
                      </div>

                      {formData.destinations.map((destination, index) => (
                        <div key={index} className="card-elevated p-8 group">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                                <span className="text-white font-bold">{index + 1}</span>
                              </div>
                              <h4 className="text-lg font-display text-gray-900">Destination {index + 1}</h4>
                            </div>
                            {formData.destinations.length > 1 && (
                              <button
                                onClick={() => removeDestination(index)}
                                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-gray-900 mb-3">
                                City or Country
                              </label>
                              <input
                                type="text"
                                value={destination.name}
                                onChange={(e) => updateDestination(index, 'name', e.target.value)}
                                className="form-input w-full"
                                placeholder="e.g., Paris, Bali, Morocco"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-3">
                                Duration (days)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={destination.duration}
                                onChange={(e) => updateDestination(index, 'duration', parseInt(e.target.value) || 1)}
                                className="form-input w-full"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    
                    <div className="flex justify-between pt-6">
                      <button
                        onClick={() => {
                          setStep(0);
                        }}
                        className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                      >
                        ← Back to Options
                      </button>
                      <button
                        onClick={handleNext}
                        className="btn-primary flex items-center"
                      >
                        Continue
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8">
                    <div className="bg-teal-50 p-8 rounded-2xl border border-teal-200">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">📅 Perfect Timing</h3>
                      <p className="text-gray-700 text-lg">Let us set your travel dates and budget to ensure we find the best deals and experiences for your journey.</p>
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
                            🎭 What is your travel style?
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

                {step === 3 && (
                  <div className="space-y-8">
                    <div className="bg-green-50 p-8 rounded-2xl border border-green-200">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">❤️ What Makes You Happy?</h3>
                      <p className="text-gray-700 text-lg">Tell us about your interests and preferences so we can craft experiences that will create lasting memories.</p>
                    </div>

                    
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6">Assistance Preferences:</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-gray-900">🏨 Hotel Search</h4>
                              <p className="text-gray-600 text-sm">Want AI to search and recommend hotels for you?</p>
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
                              <h4 className="font-bold text-gray-900">✈️ Flight Search</h4>
                              <p className="text-gray-600 text-sm">Want AI to find the best flight options for you?</p>
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
                      </div>
                      
                    </div>

                    <div>
                      <div className="mb-6">
                        <label className="block text-lg font-bold text-gray-900">
                          🎯 What interests you most?
                        </label>
                        {loadingSuggestions && (
                          <div className="flex items-center text-blue-600 mt-2">
                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                            <span className="text-sm">Loading personalized suggestions for {formData.destinations.map(d => d.name).join(', ')}...</span>
                          </div>
                        )}
                      </div>

                      
                      {aiSuggestions.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                            <span className="mr-2">🤖</span>
                            AI Suggestions for {formData.destinations.map(d => d.name).join(', ')}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {aiSuggestions.map((suggestion, index) => (
                              <div 
                                key={index}
                                className={`p-3 border rounded-lg cursor-pointer transition-all text-sm ${
                                  formData.interests.includes(suggestion.name)
                                    ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-400/50'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => handleInterestChange(suggestion.name, !formData.interests.includes(suggestion.name))}
                              >
                                <div className="text-center">
                                  <div className="text-2xl mb-2">{suggestion.icon}</div>
                                  <div className="font-semibold text-gray-900 mb-1">{suggestion.name}</div>
                                  <div className="text-xs text-gray-600">{suggestion.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      
                      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">
                          💭 Add Your Own Interests
                        </h4>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={customInterests}
                            onChange={(e) => setCustomInterests(e.target.value)}
                            placeholder="e.g., conferences, photography, wine tasting, hiking..."
                            className="flex-1 px-4 py-3 bg-white rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900"
                            onKeyPress={(e) => e.key === 'Enter' && handleCustomInterestsSubmit()}
                          />
                          <button
                            onClick={handleCustomInterestsSubmit}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Separate multiple interests with commas. Example: business conferences, local markets, rooftop bars
                        </p>
                      </div>

                      
                      {formData.interests.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold text-gray-800 mb-3">
                            ✅ Your Selected Interests
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {formData.interests.map((interest, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
                              >
                                {interest}
                                <button
                                  onClick={() => handleInterestChange(interest, false)}
                                  className="ml-2 text-teal-600 hover:text-teal-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`grid grid-cols-1 ${wantsHotelRecommendations ? 'lg:grid-cols-2' : ''} gap-8`}>
                      {wantsHotelRecommendations && (
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
                      )}

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
                          startDate={quickDates.startDate || formData.startDate}
                          endDate={quickDates.endDate || formData.endDate}
                          isStructured={isStructured}
                          wantsHotelRecommendations={wantsHotelRecommendations}
                          wantsFlightBooking={wantsFlightBooking}
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
                              setStep(0);
                              setItinerary(null);
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
                          We could not generate your itinerary right now. Do not worry, let us try again!
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
              </>
            )}
          </div>
        </div>

        
        {currentItinerary && (
          <TravelAssistantChat
            itinerary={currentItinerary}
            onItineraryUpdate={handleItineraryUpdate}
            userPreferences={{
              budget: formData.budget,
              travelStyle: formData.travelStyle,
              interests: formData.interests,
              travelers: formData.travelers
            }}
            isOpen={isChatOpen}
            onToggle={toggleChat}
          />
        )}

        
        <TravelAssistantChat
          itinerary={currentItinerary || {
            overview: "No itinerary yet. Use this chat to get help planning your trip.",
            tripHighlights: [],
            culturalTips: { etiquette: [], customs: [], language: [], safety: [] },
            destinations: formData.destinations.map(d => ({ 
              name: d.name || "Your destination", 
              country: "Unknown",
              description: "",
              duration: d.duration,
              bestTimeToVisit: "",
              localCurrency: "",
              languages: "",
              activities: []
            })),
            transport: {
              betweenDestinations: [],
              gettingThere: { flights: [] },
              localTransport: []
            },
            accommodation: { recommendations: [] },
            itinerary: { days: [] },
            budget: {
              total: "",
              breakdown: { accommodation: "", food: "", activities: "", transport: "", extras: "" },
              dailyAverage: "",
              savingTips: []
            },
            packingTips: { essentials: [], seasonal: "", luxury: "", cultural: "" },
            localTips: { cultural: [], practical: [], safety: [], etiquette: [] },
            emergencyInfo: { destinations: [] },
            bookingChecklist: []
          }}
          onItineraryUpdate={handleItineraryUpdate}
          userPreferences={{
            budget: formData.budget,
            travelStyle: formData.travelStyle,
            interests: formData.interests,
            travelers: formData.travelers
          }}
          isOpen={isChatOpen}
          onToggle={toggleChat}
        />
    </div>
  );
} 

export default function PlannerPage() {
  return (
    <Suspense fallback={<div>Loading planner...</div>}>
      <PlannerPageClient />
    </Suspense>
  );
}