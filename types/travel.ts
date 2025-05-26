export interface Destination {
  name: string;
  duration: number;
}

export interface TravelFormData {
  departureLocation: string;
  destinations: Destination[];
  startDate: string;
  endDate: string;
  travelers: number;
  budget: string;
  maxBudget?: number;
  travelStyle: string;
  interests: string[];
  accommodation: string;
  transportPreference: string;
  dietaryRestrictions: string;
  accessibility: string;
  additionalNotes: string;
}

export interface StructuredItinerary {
  overview: string;
  destinations: Array<{
    name: string;
    description: string;
    duration: number;
    bestTimeToVisit: string;
    localCurrency: string;
    languages: string;
    timeZone?: string;
    activities: Array<{
      name: string;
      description: string;
      duration: string;
      cost: string;
      category: string;
      bookingRequired?: boolean;
      tips?: string;
    }>;
  }>;
  transport: {
    betweenDestinations: Array<{
      from: string;
      to: string;
      options: Array<{
        type: string;
        duration: string;
        cost: string;
        description: string;
        bookingInfo?: string;
        pros?: string[];
        cons?: string[];
      }>;
    }>;
    gettingThere: {
      flights: Array<{
        from: string;
        to: string;
        airlines: string[];
        options?: Array<{
          class: string;
          estimatedCost: string;
          duration: string;
          pros: string[];
          cons: string[];
        }>;
        bookingTips?: string;
        seasonalPricing?: string;
        estimatedCost?: string;
        duration?: string;
        classOptions?: string[];
      }>;
      alternativeTransport?: Array<{
        type: string;
        cost: string;
        duration: string;
        pros: string[];
        cons: string[];
        bookingInfo: string;
      }>;
      otherOptions?: Array<{
        type: string;
        description: string;
        cost: string;
        duration: string;
      }>;
    };
    localTransport: Array<{
      destination: string;
      options: Array<{
        type: string;
        cost: string;
        description: string;
        apps?: string;
      }>;
    }>;
  };
  accommodation: {
    recommendations: Array<{
      destination: string;
      options?: Array<{
        name: string;
        type: string;
        priceRange: string;
        location: string;
        highlights: string[];
        rating?: string;
        pros: string[];
        cons: string[];
        bestFor: string;
      }>;
      bookingTips?: string;
      generalTips?: string;
      name?: string;
      type?: string;
      priceRange?: string;
      location?: string;
      highlights?: string[];
      suitableFor?: string;
      amenities?: string[];
      rating?: string;
      pros?: string[];
      cons?: string[];
    }>;
  };
  restaurants?: {
    recommendations: Array<{
      destination: string;
      name: string;
      cuisine: string;
      priceRange: string;
      specialties: string[];
      reservationRequired: boolean;
      reservationInfo?: string;
      dressCode?: string;
      dietaryOptions?: string;
    }>;
  };
  localExperiences?: {
    unique: Array<{
      name: string;
      description: string;
      duration: string;
      cost: string;
      bookingRequired: boolean;
      culturalSignificance?: string;
      tips?: string;
    }>;
  };
  itinerary: {
    days: Array<{
      day: number;
      date: string;
      destination: string;
      title: string;
      theme?: string;
      activities: Array<{
        time: string;
        name: string;
        description: string;
        location: string;
        duration: string;
        cost: string;
        tips?: string;
        bookingRequired?: boolean;
        category?: string;
      }>;
      meals?: Array<{
        time: string;
        type: string;
        restaurant: string;
        cuisine: string;
        cost: string;
        reservationNeeded?: boolean;
      }>;
      transport?: string;
      accommodation?: string;
    }>;
  };
  budget: {
    total: string;
    breakdown: {
      accommodation: string;
      food: string;
      activities: string;
      transport: string;
      extras: string;
    };
    dailyAverage: string;
    savingTips: string[];
    splurgeRecommendations?: string[];
    budgetAlternatives?: {
      cheaper: string;
      upgrade: string;
    };
  };
  packingTips: {
    essentials: string[];
    seasonal: string;
    luxury: string;
    cultural: string;
  };
  localTips: {
    cultural: string[];
    practical: string[];
    safety: string[];
    etiquette: string[];
  };
  emergencyInfo: {
    destinations: Array<{
      name: string;
      emergencyNumber: string;
      nearestHospital: string;
      embassyInfo: string;
      importantNumbers?: {
        police: string;
        medical: string;
        tourist: string;
      };
    }>;
  };
  bookingChecklist: Array<{
    item: string;
    timeframe: string;
    priority: string;
    notes: string;
  }>;
} 