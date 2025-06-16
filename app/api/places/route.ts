import { NextRequest, NextResponse } from 'next/server';

const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
const FOURSQUARE_BASE_URL = 'https://api.foursquare.com/v3/places';

interface PlaceData {
  id: string;
  name: string;
  category: string;
  address: string;
  rating?: number;
  price?: number;
  hours?: string;
  website?: string;
  phone?: string;
  description?: string;
  photos?: string[];
  tips?: string[];
}

interface PlacesResponse {
  destination: string;
  places: PlaceData[];
  categories: {
    attractions: PlaceData[];
    dining: PlaceData[];
    shopping: PlaceData[];
    entertainment: PlaceData[];
    outdoor: PlaceData[];
  };
}

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  categories?: Array<{ name: string }>;
  location?: {
    address?: string;
    locality?: string;
    region?: string;
  };
  rating?: number;
  price?: number;
  hours?: { display?: string };
  website?: string;
  tel?: string;
  description?: string;
  photos?: Array<{ prefix: string; suffix: string }>;
  tips?: Array<{ text: string }>;
}

interface FoursquareSearchResponse {
  results: FoursquarePlace[];
}

async function searchPlaces(query: string, location: string, categories?: string): Promise<FoursquarePlace[]> {
  if (!FOURSQUARE_API_KEY) {
    console.log('Foursquare API key not available');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      near: location,
      limit: '20',
      sort: 'RATING'
    });

    if (categories) {
      params.append('categories', categories);
    }

    const response = await fetch(
      `${FOURSQUARE_BASE_URL}/search?${params}`,
      {
        headers: {
          'Authorization': FOURSQUARE_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Foursquare API error:', response.status, response.statusText);
      return [];
    }

    const data: FoursquareSearchResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

function formatPlace(place: FoursquarePlace): PlaceData {
  const category = place.categories?.[0];
  const location = place.location;
  
  return {
    id: place.fsq_id,
    name: place.name,
    category: category?.name || 'General',
    address: location ? `${location.address || ''} ${location.locality || ''} ${location.region || ''}`.trim() : '',
    rating: place.rating ? Math.round(place.rating * 10) / 10 : undefined,
    price: place.price,
    hours: place.hours?.display || undefined,
    website: place.website,
    phone: place.tel,
    description: place.description,
    photos: place.photos?.map((photo) => `${photo.prefix}300x300${photo.suffix}`) || [],
    tips: place.tips?.map((tip) => tip.text) || []
  };
}

function categorizePlaces(places: PlaceData[]): PlacesResponse['categories'] {
  const categories = {
    attractions: [] as PlaceData[],
    dining: [] as PlaceData[],
    shopping: [] as PlaceData[],
    entertainment: [] as PlaceData[],
    outdoor: [] as PlaceData[]
  };

  places.forEach(place => {
    const category = place.category.toLowerCase();
    
    if (category.includes('museum') || category.includes('monument') || 
        category.includes('landmark') || category.includes('historic') ||
        category.includes('gallery') || category.includes('attraction')) {
      categories.attractions.push(place);
    } else if (category.includes('restaurant') || category.includes('café') || 
               category.includes('bar') || category.includes('food') ||
               category.includes('dining') || category.includes('bakery')) {
      categories.dining.push(place);
    } else if (category.includes('shop') || category.includes('store') || 
               category.includes('market') || category.includes('mall') ||
               category.includes('boutique')) {
      categories.shopping.push(place);
    } else if (category.includes('theater') || category.includes('cinema') || 
               category.includes('club') || category.includes('music') ||
               category.includes('entertainment') || category.includes('venue')) {
      categories.entertainment.push(place);
    } else if (category.includes('park') || category.includes('beach') || 
               category.includes('outdoor') || category.includes('nature') ||
               category.includes('garden') || category.includes('trail')) {
      categories.outdoor.push(place);
    } else {
      
      categories.attractions.push(place);
    }
  });

  return categories;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, interests = [], limit = 50 } = body;

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    const placesData = await getPlacesData(destination, interests, limit);
    
    if (!placesData) {
      return NextResponse.json({ 
        error: 'Places service not available',
        fallback: {
          destination,
          message: 'Places data unavailable - use local travel guides'
        }
      }, { status: 503 });
    }

    return NextResponse.json(placesData);
  } catch (error) {
    console.error('Error fetching places data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch places data' },
      { status: 500 }
    );
  }
}


async function getPlacesData(destination: string, interests: string[] = [], limit: number = 50): Promise<PlacesResponse | null> {
  try {
    if (!FOURSQUARE_API_KEY) {
      console.log('Foursquare API key not available');
      return null;
    }

    
    const searchQueries = [
      'attractions',
      'museums',
      'restaurants',
      'cafes',
      'shopping',
      'parks',
      'entertainment'
    ];

    
    if (interests.length > 0) {
      searchQueries.push(...interests.slice(0, 3)); 
    }

    const allPlaces: PlaceData[] = [];
    const seenPlaces = new Set<string>();

    
    for (const query of searchQueries.slice(0, 6)) { 
      try {
        const places = await searchPlaces(query, destination);
        
        for (const place of places.slice(0, 8)) { 
          if (!seenPlaces.has(place.fsq_id)) {
            seenPlaces.add(place.fsq_id);
            allPlaces.push(formatPlace(place));
          }
        }
        
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error searching for ${query}:`, error);
      }
    }

    
    const limitedPlaces = allPlaces.slice(0, limit);
    
    
    const categorizedPlaces = categorizePlaces(limitedPlaces);

    const response: PlacesResponse = {
      destination,
      places: limitedPlaces,
      categories: categorizedPlaces
    };

    return response;
  } catch (error) {
    console.error('Error fetching places data for', destination, ':', error);
    return null;
  }
} 