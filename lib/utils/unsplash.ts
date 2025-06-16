const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  description: string;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

export interface DestinationImage {
  heroImage: UnsplashImage;
  thumbnails: UnsplashImage[];
}

function generateFallbackImage(query: string, width: number = 400, height: number = 300): UnsplashImage {
  const fallbackUrl = `https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=${width}&h=${height}&fit=crop&crop=center`;
  
  return {
    id: `fallback-${Date.now()}`,
    urls: {
      raw: fallbackUrl,
      full: fallbackUrl,
      regular: fallbackUrl,
      small: fallbackUrl,
      thumb: fallbackUrl
    },
    alt_description: query,
    description: `Fallback image for ${query}`,
    user: {
      name: 'Travel Planner',
      username: 'travelplanner'
    },
    width: width,
    height: height
  };
}

export async function searchUnsplashImages(
  query: string,
  count: number = 1,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape',
  page: number = 1
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    return Array.from({ length: count }, () => generateFallbackImage(query));
  }

  try {
    
    const params = new URLSearchParams({
      query: query,
      per_page: count.toString(),
      orientation: orientation,
      order_by: 'relevant',
      page: page.toString(),
    });

    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?${params}`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          'Accept-Version': 'v1',
        },
      }
    );

    if (!response.ok) {
      console.error(`Unsplash API error: ${response.status} ${response.statusText}`);
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    const images = data.results || [];
    
    
    
    if (images.length < count) {
      const fallbacksNeeded = count - images.length;
      const fallbacks = Array.from({ length: fallbacksNeeded }, () => generateFallbackImage(query));
      return [...images, ...fallbacks];
    }
    
    return images;
  } catch (error) {
    console.error('Error fetching Unsplash images:', error);
    
    return Array.from({ length: count }, () => generateFallbackImage(query));
  }
}

export async function getDestinationHeroImage(destinationName: string): Promise<UnsplashImage> {
  const searchQueries = [
    `${destinationName} travel destination landscape`,
    `${destinationName} skyline`,
    `${destinationName} landmark`,
    `${destinationName} city`
  ];

  for (const query of searchQueries) {
    try {
      const images = await searchUnsplashImages(query, 1, 'landscape');
      if (images.length > 0) {
        return images[0];
      }
    } catch (error) {
      console.error(`Failed to get hero image with query "${query}":`, error);
    }
  }

  
  return generateFallbackImage(`${destinationName} travel`, 800, 400);
}

export async function getActivityThumbnails(activityName: string, location: string): Promise<UnsplashImage | null> {
  
  const searchQueries = [
    `${activityName} ${location}`,
    `${location} ${activityName}`
  ];

  for (const query of searchQueries) {
    try {
      const images = await searchUnsplashImages(query, 3, 'squarish');
      
      if (images.length > 0) {
        
        const selectedImage = images[0];
        return selectedImage;
      }
    } catch (error) {
      console.error(`Failed to get activity image with query "${query}":`, error);
    }
  }

  
  return null;
}

export async function getDestinationImages(
  destinationName: string,
  activities: string[] = []
): Promise<DestinationImage> {
  try {
    
    
    const heroImage = await getDestinationHeroImage(destinationName);
    
    
    const activityPromises = activities.slice(0, 15).map(activity => 
      getActivityThumbnails(activity, destinationName)
    );
    
    const thumbnails = await Promise.all(activityPromises);


    return {
      heroImage,
      thumbnails: thumbnails.filter(img => img !== null),
    };
  } catch (error) {
    console.error('Error fetching destination images:', error);
    return {
      heroImage: generateFallbackImage(`${destinationName} travel`, 800, 400),
      thumbnails: activities.slice(0, 4).map(activity => 
        generateFallbackImage(`${activity} ${destinationName}`, 300, 300)
      ),
    };
  }
}

export function optimizeImageUrl(image: UnsplashImage, width: number, height: number, quality: number = 80): string {
  if (image.id === 'default') {
    return image.urls.regular;
  }
  
  const params = new URLSearchParams({
    w: width.toString(),
    h: height.toString(),
    q: quality.toString(),
    fit: 'crop',
    crop: 'entropy',
  });
  
  return `${image.urls.raw}&${params}`;
}

export class ImageCache {
  private static CACHE_PREFIX = 'unsplash_cache_';
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; 

  static set(key: string, images: UnsplashImage[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheItem = {
        images,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to cache images:', error);
    }
  }

  static get(key: string): UnsplashImage[] | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const isExpired = Date.now() - cacheItem.timestamp > this.CACHE_DURATION;
      
      if (isExpired) {
        localStorage.removeItem(this.CACHE_PREFIX + key);
        return null;
      }

      return cacheItem.images;
    } catch (error) {
      console.warn('Failed to retrieve cached images:', error);
      return null;
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  }
}

export async function getUnsplashImage(query: string): Promise<string> {
  try {
    const accessKey = UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`;
    }
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
        },
      }
    );
    if (!response.ok) {
      console.error(`Unsplash API error: ${response.status} ${response.statusText}`);
      throw new Error(`Unsplash API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular;
      return imageUrl;
    } else {
      return `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`;
    }
  } catch (error) {
    console.error('Error fetching Unsplash image:', error);
    return `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`;
  }
}

export async function getDestImageWFallback(destination: { name: string; country: string; imageKeywords?: string; }): Promise<string> {
  try {
    return await getUnsplashImage(destination.name);
  } catch (error) {
    console.error(`Error fetching image for ${destination.name}:`, error);
    try {
      return await getUnsplashImage(`${destination.name} ${destination.country}`);
    } catch {
      try {
        return await getUnsplashImage(destination.country);
      } catch (finalError) {
        console.error(`All image fetch attempts failed for ${destination.name}:`, finalError);
        return 'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=800&auto=format&fit=crop';
      }
    }
  }
} 