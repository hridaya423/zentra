/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */


import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { Destination, BookingLinks, StructuredItinerary, BookingLink } from '@/types/travel';
import { extractJSONFromResponse } from '@/lib/utils/ai-response-filter';


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL ?? 'https://api.firecrawl.dev/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

interface ScrapedAccommodationData {
  name: string;
  priceRange: string;
  rating: number;
  reviews: number;
  amenities: string[];
  location: string;
  availability: boolean;
}



interface ScrapedActivityData {
  name: string;
  type: string;
  price: string;
  duration: string;
  rating: number;
  reviews: number;
  description: string;
  bookingRequired: boolean;
}

interface ScrapedLocalData {
  currentEvents: Array<{
    name: string;
    date: string;
    description: string;
    cost: string;
  }>;
  weatherTips: string;
  localInsights: string[];
  transportUpdates: string[];
}

async function fetchSearch(query: string, limit = 3): Promise<Array<{ title: string; url: string; description: string }>> {
  try {
    const res = await fetch(`${FIRECRAWL_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({ query, limit })
    });
    const json = await res.json();
    if (!json.success) {
      console.error('Firecrawl search failed:', json);
      return [];
    }
    return (json.data as Array<{ title: string; url: string; description: string }>).map(item => ({
      title: item.title,
      url: item.url,
      description: item.description
    }));
  } catch (error) {
    console.error('Error during Firecrawl search:', error);
    return [];
  }
}

async function scrapeUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({ 
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        includeTags: ['p', 'h1', 'h2', 'h3', 'li', 'span'],
        excludeTags: ['nav', 'footer', 'aside', 'header']
      })
    });
    const json = await res.json();
    if (!json.success) {
      console.error('Firecrawl scrape failed for URL:', url, json);
      return '';
    }
    return json.data?.markdown || json.data?.content || '';
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return '';
  }
}

async function scrapeAccommodationData(destination: string, checkIn: string, checkOut: string, budget: string): Promise<ScrapedAccommodationData[]> {
  try {
    console.log(`Scraping accommodation data for ${destination}...`);
    
    const searchResults = await fetchSearch(
      `best hotels ${destination} ${budget} budget ${checkIn} to ${checkOut} prices reviews`,
      5
    );
    
    const accommodationData: ScrapedAccommodationData[] = [];
    
    for (const result of searchResults.slice(0, 2)) {
      const content = await scrapeUrlContent(result.url);
      if (content) {
        const extractedData = await extractAccommodationDataFromContent(content, destination, budget);
        if (extractedData.length > 0) {
          accommodationData.push(...extractedData);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return accommodationData.slice(0, 5);
  } catch (error) {
    console.error('Error scraping accommodation data:', error);
    return [];
  }
}

async function extractAccommodationDataFromContent(content: string, destination: string, budget: string): Promise<ScrapedAccommodationData[]> {
  try {
    const prompt = `ROLE: You are a professional accommodation data analyst specializing in extracting precise, current hotel information for ${budget} budget travelers in ${destination}.

EXPERTISE: 
- Real-time accommodation pricing and availability
- Budget-appropriate accommodation matching
- Amenity identification and classification
- Location analysis and neighborhood assessment
- Review sentiment and rating analysis

TASK: Extract comprehensive accommodation data from the provided content, focusing on options that align with ${budget} budget level and current market conditions.

CONTENT TO ANALYZE:
${content.substring(0, 3000)}

EXTRACTION CRITERIA FOR ${destination}:
✓ Properties appropriate for ${budget} budget level
✓ Current pricing and availability status
✓ Accurate amenity lists and location details
✓ Real review counts and rating information
✓ Neighborhood context and accessibility

BUDGET ALIGNMENT FOR ${budget}:
- Budget: Focus on hostels, guesthouses, basic hotels ($20-80/night)
- Mid-range: 3-4 star hotels, boutique properties ($80-200/night)
- Premium/Luxury: 4-5 star hotels, luxury resorts ($200-500+/night)

OUTPUT FORMAT - Return ONLY this JSON array:
[{"name": "Actual property name from content", "priceRange": "Realistic price range for budget level", "rating": actual_rating_number, "reviews": actual_review_count, "amenities": ["Verified amenity list"], "location": "Specific neighborhood or area", "availability": true_or_false_based_on_content}]`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a professional accommodation data analyst with expertise in hospitality market intelligence, pricing analysis, and property assessment. You specialize in extracting accurate, current accommodation information that matches specific budget requirements and traveler needs. Your analysis considers location desirability, amenity value, pricing trends, and guest satisfaction metrics. You respond with ONLY valid JSON - no explanations, no reasoning, no thinking blocks." 
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.1,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonString = extractJSONFromResponse(response);
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error('JSON parse error for accommodation data:', parseError, 'Raw response:', response.substring(0, 200));
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error('Error extracting accommodation data:', error);
    return [];
  }
}





async function scrapeActivityData(destination: string, interests: string[], budget: string): Promise<ScrapedActivityData[]> {
  try {
    console.log(`Scraping activity data for ${destination}...`);
    
    const interestsQuery = interests.join(' ');
    const searchResults = await fetchSearch(
      `things to do ${destination} ${interestsQuery} activities ${budget} budget prices tickets`,
      3
    );
    
    const activityData: ScrapedActivityData[] = [];
    
    for (const result of searchResults.slice(0, 2)) {
      const content = await scrapeUrlContent(result.url);
      if (content) {
        const extractedData = await extractActivityDataFromContent(content, destination, interests, budget);
        if (extractedData.length > 0) {
          activityData.push(...extractedData);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return activityData.slice(0, 5);
  } catch (error) {
    console.error('Error scraping activity data:', error);
    return [];
  }
}

async function extractActivityDataFromContent(content: string, destination: string, interests: string[], budget: string): Promise<ScrapedActivityData[]> {
  try {
    const prompt = `ROLE: You are a destination activity specialist and experience curator for ${destination}, with deep expertise in matching activities to traveler interests and budget constraints.

SPECIALIZATION:
- Activity pricing analysis and budget optimization for ${budget} travelers
- Interest-based experience matching for: ${interests.join(', ')}
- Duration planning and logistics coordination
- Booking requirement assessment and timing strategies
- Review analysis and quality assessment

MISSION: Extract and curate activity data from provided content, focusing on experiences that align with ${budget} budget level and specific interests: ${interests.join(', ')}.

CONTENT TO ANALYZE:
${content.substring(0, 3000)}

CURATION CRITERIA FOR ${destination}:
✓ Strong alignment with interests: ${interests.join(', ')}
✓ Appropriate for ${budget} budget level
✓ Realistic duration and timing information
✓ Accurate pricing and booking requirements
✓ Quality verification through ratings/reviews
✓ Authentic local experiences preferred

BUDGET ALIGNMENT FOR ${budget}:
- Budget: Free to low-cost activities ($0-30), local experiences, self-guided
- Mid-range: Standard attractions and experiences ($30-100), some guided tours
- Premium: High-end experiences ($100-300+), private tours, exclusive access
- Luxury: Ultra-premium experiences ($300+), VIP access, bespoke services

OUTPUT FORMAT - Return ONLY this JSON array:
[{"name": "Specific activity name from content", "type": "Accurate category/type", "price": "Realistic price for budget", "duration": "Actual duration stated", "rating": actual_rating_number, "reviews": actual_review_count, "description": "Compelling description highlighting unique aspects", "bookingRequired": true_or_false_based_on_content}]`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a professional activity and experience analyst with expertise in destination-specific attractions, pricing intelligence, and traveler preference matching. You specialize in extracting accurate activity information that aligns with specific interests and budget constraints. Your analysis considers activity quality, booking logistics, pricing accuracy, and authentic local experiences. You respond with ONLY valid JSON - no explanations, no reasoning, no thinking blocks." 
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.1,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonString = extractJSONFromResponse(response);
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error('JSON parse error for activity data:', parseError, 'Raw response:', response.substring(0, 200));
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error('Error extracting activity data:', error);
    return [];
  }
}

async function scrapeLocalInsights(destination: string, travelDates: string): Promise<ScrapedLocalData> {
  try {
    console.log(`Scraping local insights for ${destination}...`);
    
    const searchResults = await fetchSearch(
      `${destination} current events ${travelDates} local tips weather transport updates`,
      2
    );
    
    let combinedContent = '';
    for (const result of searchResults) {
      const content = await scrapeUrlContent(result.url);
      combinedContent += content + '\n\n';
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return await extractLocalDataFromContent(combinedContent, destination, travelDates);
  } catch (error) {
    console.error('Error scraping local insights:', error);
    return {
      currentEvents: [],
      weatherTips: '',
      localInsights: [],
      transportUpdates: []
    };
  }
}

async function extractLocalDataFromContent(content: string, destination: string, travelDates: string): Promise<ScrapedLocalData> {
  try {
    const prompt = `ROLE: You are a local destination intelligence specialist for ${destination} with deep knowledge of current events, seasonal considerations, and practical travel logistics.

EXPERTISE AREAS:
- Current events and cultural happenings in ${destination}
- Weather patterns and seasonal travel considerations
- Local transportation systems and current updates
- Insider tips and authentic local knowledge
- Cultural customs and practical travel advice

MISSION: Extract comprehensive local intelligence from the provided content to help travelers navigate ${destination} during ${travelDates} with insider knowledge and current information.

CONTENT TO ANALYZE:
${content.substring(0, 4000)}

EXTRACTION PRIORITIES FOR ${destination} DURING ${travelDates}:
✓ Current events, festivals, and cultural happenings during travel dates
✓ Weather-specific advice and packing recommendations
✓ Transportation updates, strikes, or service changes
✓ Local customs, etiquette, and cultural considerations
✓ Safety updates and practical travel tips
✓ Seasonal considerations and timing advice

INTELLIGENCE CATEGORIES:
- Current Events: Festivals, exhibitions, concerts, local celebrations happening during travel dates
- Weather Tips: Seasonal clothing advice, weather patterns, what to pack
- Local Insights: Cultural tips, customs, local secrets, neighborhood advice
- Transport Updates: Service changes, strikes, new routes, payment methods

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "currentEvents": [{"name": "Specific event name", "date": "YYYY-MM-DD", "description": "Detailed event description with cultural significance", "cost": "Realistic cost or 'Free'"}],
  "weatherTips": "Comprehensive weather advice and packing recommendations for the season",
  "localInsights": ["Specific cultural tip or local secret", "Practical advice for authentic experiences"],
  "transportUpdates": ["Current transport information", "Payment methods and practical tips"]
}`;
    
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a local destination intelligence specialist with comprehensive knowledge of cultural events, seasonal travel patterns, transportation systems, and authentic local experiences. You excel at extracting current, actionable travel intelligence that helps visitors navigate destinations like locals. Your expertise covers cultural customs, practical logistics, safety considerations, and insider knowledge. You respond with ONLY valid JSON - no explanations, no reasoning, no thinking blocks." 
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.1,
      max_tokens: 1500,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonString = extractJSONFromResponse(response);
    if (jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        return parsed && typeof parsed === 'object' ? parsed : {
          currentEvents: [],
          weatherTips: '',
          localInsights: [],
          transportUpdates: []
        };
      } catch (parseError) {
        console.error('JSON parse error for local data:', parseError, 'Raw response:', response.substring(0, 200));
        return {
          currentEvents: [],
          weatherTips: '',
          localInsights: [],
          transportUpdates: []
        };
      }
    }
    
    return {
      currentEvents: [],
      weatherTips: '',
      localInsights: [],
      transportUpdates: []
    };
  } catch (error) {
    console.error('Error extracting local data:', error);
    return {
      currentEvents: [],
      weatherTips: '',
      localInsights: [],
      transportUpdates: []
    };
  }
}

async function researchBookingLinks(query: string, limit = 5): Promise<BookingLink[]> {
  const results = await fetchSearch(query, limit);
  return results.map(r => ({
    platform: r.title,
    url: r.url,
    description: r.description,
    features: []
  }));
}

async function fetchUniqueActivities(destination: string, interests: string[], travelStyle: string): Promise<any[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/discover-activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination,
        interests,
        travelStyle,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const result = await response.json();
    return result.activities || [];
  } catch (error) {
    console.error('Error fetching unique activities:', error);
    return [];
  }
}

async function fetchWeatherData(destination: string): Promise<any> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

async function fetchPlacesData(destination: string, interests: string[] = []): Promise<any> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/places`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination,
        interests,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Places API returned status ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching places data:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    
    const validateDate = (dateString: string) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    };
    
    
    const hasValidDates = validateDate(data.startDate) && validateDate(data.endDate);
    if (!hasValidDates) {
      return NextResponse.json({ error: 'Invalid date format provided. Please use YYYY-MM-DD format.' }, { status: 400 });
    }
    
    
    const {
      destinations,
      startDate,
      endDate,
      travelers,
      budget,
      maxBudget,
      travelStyle,
      interests,
      additionalNotes,
      departureLocation,
      accommodation,
      transportPreference,
      dietaryRestrictions,
      accessibility,
      wantsHotelRecommendations = true,
      wantsFlightBooking = true,
      wantsLocalExperiences = true,
      comprehensiveData
    } = data;

    const scrapedData = {
      accommodations: new Map<string, ScrapedAccommodationData[]>(),
      activities: new Map<string, ScrapedActivityData[]>(),
      localInsights: new Map<string, ScrapedLocalData>(),
      uniqueActivities: new Map<string, any[]>(),
      weatherData: new Map<string, any>(),
      placesData: new Map<string, any>()
    };

    
    if (comprehensiveData && Array.isArray(comprehensiveData)) {
      console.log('🚀 Using pre-gathered comprehensive data from enhanced quick mode...');
      
      
      comprehensiveData.forEach((destData: any) => {
        const destName = destData.destination;
        
        
        scrapedData.weatherData.set(destName, destData.weatherData);
        scrapedData.placesData.set(destName, destData.placesData);
        scrapedData.uniqueActivities.set(destName, destData.uniqueActivities || []);
        
        
        const aiInsights = destData.aiSuggestions;
        scrapedData.localInsights.set(destName, {
          currentEvents: aiInsights?.localEvents || [],
          weatherTips: destData.weatherData?.travelTips?.[0] || aiInsights?.seasonalAdvice?.[0] || '',
          localInsights: [
            ...(aiInsights?.hiddenGems || []),
            ...(aiInsights?.culturalTips || []),
            ...(aiInsights?.transportTips || [])
          ],
          transportUpdates: aiInsights?.transportTips || []
        });
        
        
        scrapedData.accommodations.set(destName, []);
        scrapedData.activities.set(destName, []);
      });
      
   
    } 

    
    if (!comprehensiveData || !Array.isArray(comprehensiveData)) {
    const scrapingPromises = destinations.map(async (dest: Destination) => {
      const destName = dest.name;
      console.log(`Scraping data for ${destName}...`);
      
      try {
        const uniqueActivitiesPromise = fetchUniqueActivities(
          destName,
          interests || [],
          travelStyle || 'balanced'
        );

        const weatherPromise = fetchWeatherData(destName);

        const placesPromise = fetchPlacesData(destName, interests || []);

        const [accommodationData, activityData, localData, uniqueActivities, weatherData, placesData] = await Promise.all([
          scrapeAccommodationData(destName, startDate, endDate, budget),
          scrapeActivityData(destName, interests, budget),
          scrapeLocalInsights(destName, `${startDate} to ${endDate}`),
          uniqueActivitiesPromise,
          weatherPromise,
          placesPromise
        ]);

        scrapedData.accommodations.set(destName, accommodationData);
        scrapedData.activities.set(destName, activityData);
        scrapedData.localInsights.set(destName, localData);
        scrapedData.uniqueActivities.set(destName, uniqueActivities);
        scrapedData.weatherData.set(destName, weatherData);
        scrapedData.placesData.set(destName, placesData);
        
        console.log(`Completed data collection for ${destName}. Found ${uniqueActivities.length} unique activities, weather: ${weatherData ? 'available' : 'unavailable'}, places: ${placesData?.places?.length || 0} found.`);
      } catch (error) {
        console.error(`Error collecting data for ${destName}:`, error);
        scrapedData.accommodations.set(destName, []);
        scrapedData.activities.set(destName, []);
        scrapedData.uniqueActivities.set(destName, []);
        scrapedData.weatherData.set(destName, null);
        scrapedData.placesData.set(destName, null);
        scrapedData.localInsights.set(destName, {
          currentEvents: [],
          weatherTips: '',
          localInsights: [],
          transportUpdates: []
        });
      }
    });

    await Promise.all(scrapingPromises);
    } 
    
    const enhancedContext = destinations.map((dest: Destination) => {
      const destAccommodations = scrapedData.accommodations.get(dest.name) || [];
      const destActivities = scrapedData.activities.get(dest.name) || [];
      const destUniqueActivities = scrapedData.uniqueActivities.get(dest.name) || [];
      const destLocalData = scrapedData.localInsights.get(dest.name);
      const destWeatherData = scrapedData.weatherData.get(dest.name);
      const destPlacesData = scrapedData.placesData.get(dest.name);

      return `
REAL-TIME DATA FOR ${dest.name.toUpperCase()}:

🌤️ CURRENT WEATHER CONDITIONS (OpenWeatherMap API - CRITICAL FOR PLANNING):
${destWeatherData ? `
Current: ${destWeatherData.current.temperature}°C, ${destWeatherData.current.description}
Humidity: ${destWeatherData.current.humidity}%, Wind: ${destWeatherData.current.windSpeed} km/h
5-Day Forecast: ${destWeatherData.forecast.map((day: any) => 
  `${day.date}: ${day.temperature.min}-${day.temperature.max}°C, ${day.description} (${day.precipitation}% rain)`
).join(' | ')}
Packing Recommendations: ${destWeatherData.packingRecommendations.join(', ')}
Travel Tips: ${destWeatherData.travelTips.join(', ')}` : 'Weather data unavailable - check local conditions'}

🏛️ VERIFIED PLACES & ATTRACTIONS (Foursquare API - REAL RATINGS & LOCATIONS):
${destPlacesData?.places ? `
Top Attractions: ${destPlacesData.categories.attractions.slice(0, 5).map((place: any) => 
  `${place.name} (${place.rating ? place.rating + '/10' : 'No rating'}) - ${place.address}`
).join(' | ')}
Best Dining: ${destPlacesData.categories.dining.slice(0, 3).map((place: any) => 
  `${place.name} (${place.rating ? place.rating + '/10' : 'No rating'}) - ${place.category}`
).join(' | ')}
Shopping: ${destPlacesData.categories.shopping.slice(0, 2).map((place: any) => 
  `${place.name} - ${place.address}`
).join(' | ')}
Entertainment: ${destPlacesData.categories.entertainment.slice(0, 2).map((place: any) => 
  `${place.name} - ${place.category}`
).join(' | ')}` : 'Places data unavailable'}

🎯 UNIQUE ACTIVITIES DISCOVERED (Web Search Results - HIGH PRIORITY):
${destUniqueActivities.map(act => 
  `- ${act.name}: ${act.description}
    Category: ${act.category || 'general'} | Duration: ${act.duration || '2-3 hours'} | Cost: ${act.cost || 'Varies'}
    Booking Required: ${act.bookingRequired ? `Yes (${act.advanceBooking || '1 week'} in advance)` : 'No'}
    Best For: ${Array.isArray(act.bestFor) ? act.bestFor.join(', ') : (act.bestFor || travelStyle + ' travelers')}
    Tips: ${act.tips || 'Book in advance for best experience'}`
).join('\n\n')}

CURRENT ACCOMMODATION OPTIONS (Live Data):
${destAccommodations.map(acc => 
  `- ${acc.name}: ${acc.priceRange}, Rating: ${acc.rating}/5 (${acc.reviews} reviews), Location: ${acc.location}, Amenities: ${Array.isArray(acc.amenities) ? acc.amenities.join(', ') : 'Standard amenities'}`
).join('\n')}

STANDARD ACTIVITIES & ATTRACTIONS (Live Data):
${destActivities.map(act => 
  `- ${act.name} (${act.type}): ${act.price}, Duration: ${act.duration}, Rating: ${act.rating}/5 (${act.reviews} reviews), Booking: ${act.bookingRequired ? 'Required' : 'Not Required'}`
).join('\n')}

LOCAL INSIGHTS & CURRENT CONDITIONS:
Weather Tips: ${destLocalData?.weatherTips || 'Check current weather conditions'}
Current Events: ${Array.isArray(destLocalData?.currentEvents) ? destLocalData.currentEvents.map(event => `${event.name} (${event.date}): ${event.description} - ${event.cost}`).join(', ') : 'No major events found'}
Local Tips: ${Array.isArray(destLocalData?.localInsights) ? destLocalData.localInsights.join(', ') : 'General travel tips apply'}
Transport Updates: ${Array.isArray(destLocalData?.transportUpdates) ? destLocalData.transportUpdates.join(', ') : 'Standard transport options available'}
      `.trim();
    }).join('\n\n');

    const enhanceItineraryWithScrapedData = (itineraryData: any) => {
      if (!itineraryData || typeof itineraryData !== 'object') {
        return itineraryData;
      }

      if (itineraryData.accommodation?.recommendations) {
        itineraryData.accommodation.recommendations = itineraryData.accommodation.recommendations.map((rec: any) => {
          const scrapedAccommodations = scrapedData.accommodations.get(rec.destination) || [];
          
          if (scrapedAccommodations.length > 0) {
            rec.realTimeOptions = scrapedAccommodations.map(acc => ({
              name: acc.name,
              type: "Real-time data",
              priceRange: acc.priceRange,
              location: acc.location,
              highlights: acc.amenities,
              rating: `${acc.rating}/5 (${acc.reviews} reviews)`,
              pros: acc.amenities.slice(0, 3),
              cons: acc.rating < 4 ? ["Lower rating than premium options"] : ["Premium pricing"],
              bestFor: acc.rating >= 4.5 ? "Luxury travelers" : acc.rating >= 4 ? "Comfort seekers" : "Budget travelers",
              availability: acc.availability ? "Available for your dates" : "Limited availability",
              scrapedData: true
            }));
          }
          
          return rec;
        });
      }

      if (itineraryData.destinations) {
        itineraryData.destinations = itineraryData.destinations.map((dest: any) => {
          const scrapedActivities = scrapedData.activities.get(dest.name) || [];
          
          if (scrapedActivities.length > 0) {
            dest.realTimeActivities = scrapedActivities.map(act => ({
              name: act.name,
              description: act.description,
              duration: act.duration,
              cost: act.price,
              category: act.type.toLowerCase(),
              bookingRequired: act.bookingRequired,
              tips: `Rated ${act.rating}/5 by ${act.reviews} visitors`,
              rating: `${act.rating}/5`,
              reviews: act.reviews,
              scrapedData: true
            }));
          }
          
          return dest;
        });
      }

      if (itineraryData.itinerary?.days) {
        itineraryData.itinerary.days = itineraryData.itinerary.days.map((day: any) => {
          const destLocalData = scrapedData.localInsights.get(day.destination);
          const destActivities = scrapedData.activities.get(day.destination) || [];
          
          if (destLocalData?.currentEvents && destLocalData.currentEvents.length > 0) {
            const eventForDay = destLocalData.currentEvents.find(event => 
              event.date === day.date || new Date(event.date).toDateString() === new Date(day.date).toDateString()
            );
            
            if (eventForDay) {
              day.activities.push({
                time: "06:00 PM",
                name: eventForDay.name,
                description: `Current local event: ${eventForDay.description}`,
                location: day.destination,
                duration: "2-3 hours",
                cost: eventForDay.cost,
                tips: "This is a current local event happening during your visit - don't miss it!",
                bookingRequired: eventForDay.cost !== "Free",
                category: "current-event",
                scrapedData: true
              });
            }
          }

          if (destActivities.length > 0) {
            day.activities = day.activities.map((activity: any) => {
              const matchingActivity = destActivities.find(scraped => 
                scraped.name.toLowerCase().includes(activity.name.toLowerCase().split(' ')[0]) ||
                activity.name.toLowerCase().includes(scraped.name.toLowerCase().split(' ')[0])
              );
              
              if (matchingActivity) {
                activity.cost = matchingActivity.price;
                activity.tips = `${activity.tips} | Real rating: ${matchingActivity.rating}/5 (${matchingActivity.reviews} reviews)`;
                activity.realRating = `${matchingActivity.rating}/5`;
                activity.scrapedData = true;
              }
              
              return activity;
            });
          }

          if (destLocalData?.localInsights && destLocalData.localInsights.length > 0) {
            day.localTips = destLocalData.localInsights.slice(0, 2);
          }

          return day;
        });
      }

      if (itineraryData.destinations) {
        itineraryData.destinations = itineraryData.destinations.map((dest: any) => {
          const weatherData = scrapedData.weatherData.get(dest.name);
          if (weatherData) {
            dest.currentWeather = {
              temperature: weatherData.current.temperature,
              description: weatherData.current.description,
              humidity: weatherData.current.humidity,
              windSpeed: weatherData.current.windSpeed
            };
            dest.forecast = weatherData.forecast;
            dest.weatherPackingTips = weatherData.packingRecommendations;
            dest.weatherTravelTips = weatherData.travelTips;
          }
          return dest;
        });
      }

      if (itineraryData.destinations) {
        itineraryData.destinations = itineraryData.destinations.map((dest: any) => {
          const placesData = scrapedData.placesData.get(dest.name);
          if (placesData?.places) {
            dest.verifiedPlaces = {
              attractions: placesData.categories.attractions.slice(0, 10),
              dining: placesData.categories.dining.slice(0, 8),
              shopping: placesData.categories.shopping.slice(0, 5),
              entertainment: placesData.categories.entertainment.slice(0, 5),
              outdoor: placesData.categories.outdoor.slice(0, 5)
            };
          }
          return dest;
        });
      }

      itineraryData.realTimeInsights = destinations.map((dest: Destination) => {
        const localData = scrapedData.localInsights.get(dest.name);
        const weatherData = scrapedData.weatherData.get(dest.name);
        const placesData = scrapedData.placesData.get(dest.name);
        
        return {
          destination: dest.name,
          weatherTips: localData?.weatherTips || '',
          currentEvents: localData?.currentEvents || [],
          localTips: localData?.localInsights || [],
          transportUpdates: localData?.transportUpdates || [],
          currentWeather: weatherData ? {
            temperature: weatherData.current.temperature,
            description: weatherData.current.description,
            forecast: weatherData.forecast.slice(0, 3)
          } : null,
          topPlaces: placesData ? {
            attractions: placesData.categories.attractions.slice(0, 3),
            dining: placesData.categories.dining.slice(0, 3)
          } : null,
          scrapedAt: new Date().toISOString()
        };
      });

      return itineraryData;
    };

    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const tripDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (tripDuration < 1) {
      return NextResponse.json(
        { error: "Trip duration must be at least 1 day" },
        { status: 400 }
      );
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json(
        { error: "At least one destination is required" },
        { status: 400 }
      );
    }

    
    const getTravelStyleActivities = (style: string) => {
      switch (style) {
        case 'relaxed':
          return { 
            activitiesPerDay: 2, 
            pace: 'leisurely', 
            focus: 'relaxation and gentle sightseeing',
            preferredTypes: ['wellness', 'nature', 'culture', 'dining'] 
          };
        case 'balanced':
          return { 
            activitiesPerDay: 3, 
            pace: 'moderate', 
            focus: 'mix of sightseeing and relaxation',
            preferredTypes: ['sightseeing', 'culture', 'dining', 'nature'] 
          };
        case 'active':
          return { 
            activitiesPerDay: 4, 
            pace: 'energetic', 
            focus: 'packed with diverse experiences',
            preferredTypes: ['sightseeing', 'adventure', 'culture', 'nature', 'shopping'] 
          };
        case 'adventurous':
          return { 
            activitiesPerDay: 5, 
            pace: 'high-energy', 
            focus: 'thrilling and unique experiences',
            preferredTypes: ['adventure', 'nature', 'sports', 'unique', 'exploration'] 
          };
        case 'cultural':
          return { 
            activitiesPerDay: 4, 
            pace: 'immersive', 
            focus: 'deep cultural exploration',
            preferredTypes: ['culture', 'history', 'museums', 'heritage', 'art'] 
          };
        case 'foodie':
          return { 
            activitiesPerDay: 4, 
            pace: 'culinary-focused', 
            focus: 'gastronomic adventures',
            preferredTypes: ['dining', 'markets', 'cooking', 'culture', 'local'] 
          };
        default:
          return { 
            activitiesPerDay: 3, 
            pace: 'moderate', 
            focus: 'balanced exploration',
            preferredTypes: ['sightseeing', 'culture', 'dining'] 
          };
      }
    };

    const getBudgetGuidance = (budgetType: string, maxBudget?: number) => {
      switch (budgetType) {
        case 'cheapest':
          return {
            dailyBudget: '$20-50',
            accommodationType: 'Hostels, budget guesthouses, shared accommodations',
            foodType: 'Street food, local markets, self-catering',
            transportType: 'Walking, public transport, budget airlines',
            activityType: 'Free attractions, walking tours, public spaces',
            tips: 'Focus on free activities, cook your own meals, use public transport'
          };
        case 'budget':
          return {
            dailyBudget: '$50-100',
            accommodationType: 'Budget hotels, clean hostels, B&Bs',
            foodType: 'Local restaurants, food courts, occasional mid-range dining',
            transportType: 'Public transport, budget flights, occasional taxi',
            activityType: 'Mix of free and paid attractions, group tours',
            tips: 'Book in advance for better rates, eat where locals eat'
          };
        case 'moderate':
          return {
            dailyBudget: '$150-300',
            accommodationType: '3-4 star hotels, boutique properties',
            foodType: 'Good restaurants, some fine dining experiences',
            transportType: 'Mix of public and private transport, standard flights',
            activityType: 'Paid attractions, guided tours, some premium experiences',
            tips: 'Balance comfort with value, book popular restaurants in advance'
          };
        case 'luxury':
          return {
            dailyBudget: '$500+',
            accommodationType: '5-star hotels, luxury resorts, premium suites',
            foodType: 'Fine dining, Michelin-starred restaurants, exclusive culinary experiences',
            transportType: 'Business class flights, private transfers, premium transport',
            activityType: 'VIP experiences, private tours, exclusive access',
            tips: 'Book premium experiences well in advance, consider concierge services'
          };
        case 'anything':
          return {
            dailyBudget: 'Unlimited',
            accommodationType: 'Ultra-luxury hotels, private villas, presidential suites',
            foodType: 'World-class dining, private chefs, exclusive culinary experiences',
            transportType: 'First class/private jets, luxury car services, helicopters',
            activityType: 'Once-in-a-lifetime experiences, private access, bespoke adventures',
            tips: 'Sky is the limit - focus on unique, exclusive, and unforgettable experiences'
          };
        case 'custom':
          const daily = maxBudget ? Math.round(maxBudget / tripDuration) : 200;
          return {
            dailyBudget: `$${daily}`,
            accommodationType: daily < 100 ? 'Budget to mid-range hotels' : daily < 300 ? '3-4 star hotels' : '4-5 star luxury hotels',
            foodType: daily < 100 ? 'Local and budget dining' : daily < 300 ? 'Good restaurants with some fine dining' : 'Premium dining experiences',
            transportType: daily < 100 ? 'Public transport and budget options' : daily < 300 ? 'Mix of transport options' : 'Premium transport options',
            activityType: daily < 100 ? 'Free and low-cost activities' : daily < 300 ? 'Mix of activities and experiences' : 'Premium experiences and activities',
            tips: `Optimize for your $${maxBudget} total budget over ${tripDuration} days`
          };
        default:
          return {
            dailyBudget: '$150-300',
            accommodationType: '3-4 star hotels',
            foodType: 'Good restaurants',
            transportType: 'Standard transport options',
            activityType: 'Standard attractions and activities',
            tips: 'Balance comfort with value'
          };
      }
    };

    const budgetGuidance = getBudgetGuidance(budget, maxBudget);

    
    const interactivePreferences = `
INTERACTIVE PREFERENCES:
- Hotel Recommendations: ${wantsHotelRecommendations ? 'YES - Include 3-5 hotel options per destination with detailed comparisons, pros/cons, and booking tips' : 'NO - Minimal accommodation info'}
- Flight Booking Help: ${wantsFlightBooking ? 'YES - Include multiple flight options, airlines, booking strategies, and seasonal pricing' : 'NO - Basic transport info only'}
- Local Experiences: ${wantsLocalExperiences ? 'YES - Include unique local activities, hidden gems, cultural experiences, and authentic interactions' : 'NO - Standard tourist activities'}`;

    
    const styleGuide = getTravelStyleActivities(travelStyle);
    
    
    const accommodationGuidance = accommodation === 'best' ? 
      'Find the optimal accommodation type based on destination, budget, and travel style' :
      accommodation === 'unique' ? 'Prioritize boutique hotels, B&Bs, and distinctive local properties' :
      accommodation === 'budget' ? 'Focus on hostels, guesthouses, and budget-friendly options' :
      'Standard hotel accommodations';
    
    const transportGuidance = transportPreference === 'best' ?
      'Recommend optimal transport based on routes, time, cost, and experience' :
      transportPreference === 'fast' ? 'Prioritize speed and convenience, prefer flights and express services' :
      transportPreference === 'scenic' ? 'Choose routes with beautiful views, prefer trains and coastal drives' :
      transportPreference === 'budget' ? 'Select most affordable options like buses and budget airlines' :
      transportPreference === 'flexible' ? 'Include car rentals and self-drive options for maximum freedom' :
      'Standard transport options';
    
    const interestAnalysis = interests.length > 0 ? 
      `CRITICAL: User's specific interests are: ${interests.join(', ')}. Each day must include activities directly related to these interests. If they mentioned "conferences" include business districts and conference venues. If they mentioned "photography" include scenic viewpoints and golden hour activities. Tailor ALL recommendations to these exact interests.` :
      'Focus on general destination highlights';
    
    const prompt = `🚨 CRITICAL REQUIREMENTS: 
1. Generate exactly ${tripDuration} days in the itinerary.days array. DO NOT generate fewer days. Each day from 1 to ${tripDuration} must be included with full details.
2. Generate ${styleGuide.activitiesPerDay} activities per day minimum based on ${travelStyle} travel style. DO NOT generate only 1 activity per day.
3. Trip highlights MUST reference actual activities from the daily itinerary, not generic destinations.

🚨 ABSOLUTE CRITICAL RULE: You MUST generate ${styleGuide.activitiesPerDay} activities per day for ${travelStyle} travel style. The user selected "${travelStyle}" which requires ${styleGuide.activitiesPerDay} activities per day. DO NOT generate only 1 activity per day. This is a hard requirement.

MISSION: Create a transformative ${tripDuration}-day travel masterpiece that transcends typical itinerary planning. This is not just a schedule - it's a complete cultural immersion blueprint that STRICTLY RESPECTS budget constraints, INCORPORATES real-time intelligence, and creates authentic connections with local culture.

CORE PRINCIPLES:
🎯 AUTHENTICITY FIRST: Prioritize genuine local experiences over tourist attractions
💰 BUDGET SACRED: Every recommendation must align with specified budget constraints
⏰ LOGISTICS MASTERY: Account for realistic timing, crowds, seasonal factors, booking windows
🏛️ CULTURAL DEPTH: Provide historical context, local customs, and meaningful interactions
🔄 PROACTIVE PLANNING: Anticipate problems, provide alternatives, consider weather/seasonality
📍 INSIDER ACCESS: Include hidden gems, local secrets, and authentic neighborhood experiences

🎯 PROACTIVE PLANNING APPROACH:
- Create detailed hour-by-hour schedules for each day
- Include backup plans for weather contingencies
- Provide specific timing recommendations (e.g., "Visit at 9 AM to avoid crowds")
- Include transition times between activities
- Suggest optimal photo spots and timing
- Recommend local customs and etiquette for each activity
- Include seasonal considerations and local events
- Provide detailed logistics for each recommendation

TRIP DETAILS:
- Departure: ${departureLocation || 'Not specified'}
- Destinations: ${destinations.map((d: Destination) => `${d.name} (${d.duration} days)`).join(', ')}
- Dates: ${startDate} to ${endDate}
- Travelers: ${travelers}
- Budget: ${budget}${maxBudget ? ` (Max: $${maxBudget})` : ''}
- Style: ${travelStyle} (${styleGuide.activitiesPerDay} activities/day, ${styleGuide.pace} pace)

🎭 TRAVELER PERSONALITY PROFILE (SACRED REQUIREMENTS):
${interestAnalysis}

LIFESTYLE PREFERENCES (MUST INTEGRATE INTO EVERY RECOMMENDATION):
• Accommodation Philosophy: ${accommodationGuidance}
• Transport Strategy: ${transportGuidance}
• Dietary Identity: ${dietaryRestrictions !== 'none' ? `CRITICAL - ${dietaryRestrictions} dietary requirements must be considered for EVERY meal recommendation` : 'No dietary restrictions'}
• Accessibility Considerations: Standard accessibility requirements (wheelchair accessible venues when possible)
${additionalNotes ? `• Personal Notes & Special Requests: ${additionalNotes}` : ''}

TRAVELER CHEMISTRY ANALYSIS:
- Group Size: ${travelers} ${travelers === 1 ? 'solo traveler (independence, flexibility, social opportunities)' : travelers === 2 ? 'couple (intimate experiences, romantic settings, shared discoveries)' : 'group (coordination, shared experiences, varied interests)'}
- Travel Dynamics: Consider group chemistry, decision-making preferences, and energy management
- Experience Sharing: Plan moments for meaningful connections and photo opportunities

BUDGET CONSTRAINTS (MUST BE RESPECTED):
- Daily Budget: ${budgetGuidance.dailyBudget}
- Accommodation Type: ${budgetGuidance.accommodationType}
- Food Type: ${budgetGuidance.foodType}
- Transport Type: ${budgetGuidance.transportType}
- Activity Type: ${budgetGuidance.activityType}
- Budget Tips: ${budgetGuidance.tips}

${interactivePreferences}

🔥 REAL-TIME SCRAPED DATA AND DISCOVERED ACTIVITIES (PRIORITY - USE THIS DATA):
${enhancedContext}

CRITICAL INSTRUCTIONS FOR DETAILED DAILY PLANNING:
1. **HOURLY SCHEDULES**: Create detailed hour-by-hour itineraries with specific timing
2. **TRANSITION LOGISTICS**: Include travel time between activities, transport methods, and costs
3. **CROWD AVOIDANCE**: Recommend optimal timing to avoid crowds at popular attractions
4. **WEATHER CONTINGENCIES**: Provide indoor alternatives for outdoor activities
5. **LOCAL INSIGHTS**: Include cultural context, local customs, and etiquette tips
6. **PHOTO OPPORTUNITIES**: Suggest best spots and timing for photography
7. **ENERGY MANAGEMENT**: Balance high-energy and relaxing activities throughout each day
8. **MEAL TIMING**: Strategic meal placement to optimize energy and budget
9. **BOOKING WINDOWS**: Specific timeframes for making reservations
10. **SEASONAL CONSIDERATIONS**: Adapt recommendations based on travel dates

CRITICAL WEATHER & PLACES INTEGRATION:
1. **OVERVIEW**: Include current weather conditions and forecast in the trip overview
2. **DESTINATIONS**: For each destination, mention current weather and top-rated places from Foursquare data
3. **DAILY ACTIVITIES**: Consider weather conditions when scheduling outdoor vs indoor activities
4. **PACKING**: Use real weather data for packing recommendations
5. **PLACES**: Prioritize verified Foursquare places with real ratings over generic suggestions

IMPORTANT: Use the real-time scraped data above to:
1. Include actual hotel names, prices, and ratings from the scraped accommodation data
2. Use actual activity names, costs, and ratings from the scraped activity data
3. Include current events happening during the travel dates
4. **WEATHER**: Incorporate real temperature, conditions, and 5-day forecast into planning
5. **PLACES**: Use verified Foursquare places with real ratings and addresses
6. Use real pricing information to ensure budget accuracy
7. Mention specific amenities, ratings, and review counts from scraped data
8. Include any transport updates or local tips from scraped data

ENHANCED PROACTIVE REQUIREMENTS:
1. **COMPLETE DAILY SCHEDULES**: Include ALL ${tripDuration} days with detailed hour-by-hour plans
2. **MULTIPLE ACTIVITIES PER DAY**: CRITICAL - Include ${styleGuide.activitiesPerDay} activities per day minimum based on ${travelStyle} travel style. DO NOT generate only 1 activity per day.
3. **REALISTIC LOGISTICS**: Account for travel time, queues, meal breaks, and rest periods
4. **MULTIPLE OPTIONS**: Provide 2-3 alternatives for each major activity/restaurant
5. **ADVANCE PLANNING**: Include specific booking deadlines and reservation requirements
6. **LOCAL EXPERTISE**: Add insider tips, hidden gems, and local recommendations
7. **CONTINGENCY PLANNING**: Weather backup plans and alternative activities
8. **CULTURAL IMMERSION**: Include authentic local experiences and cultural learning opportunities
9. **BUDGET OPTIMIZATION**: Detailed cost breakdowns and money-saving strategies
10. **PRACTICAL DETAILS**: Include addresses, phone numbers, opening hours, and booking links
11. **PERSONALIZATION**: Tailor every recommendation to the user's specific interests: ${interests.join(', ')}
12. **SEASONAL ADAPTATION**: Adjust recommendations based on travel season and local events
13. **ENERGY FLOW**: Design daily flow to maximize enjoyment and minimize fatigue

GEOGRAPHIC INTELLIGENCE REQUIREMENTS:
1. **ACTIVITY CLUSTERING**: Group activities by geographic proximity to minimize travel time
2. **LOGICAL ROUTING**: Plan activities in geographical order (north to south, clockwise, etc.)
3. **WALKING DISTANCES**: Include specific walking distances between consecutive activities
4. **TRANSPORT OPTIMIZATION**: Suggest most efficient transport methods between locations
5. **NEIGHBORHOOD AWARENESS**: Keep morning activities in one area, afternoon in another
6. **LANDMARK REFERENCES**: Use specific landmarks as reference points for navigation

TIME-OF-DAY OPTIMIZATION REQUIREMENTS:
1. **MORNING (6-11 AM)**: Museums, monuments, markets, outdoor activities (cooler, fewer crowds)
2. **MIDDAY (11 AM-2 PM)**: Indoor activities, shopping, lunch, air-conditioned venues
3. **AFTERNOON (2-6 PM)**: Parks, walking tours, outdoor exploration, cultural sites
4. **EVENING (6-9 PM)**: Dining, sunset spots, cultural performances, local nightlife
5. **NIGHT (9 PM+)**: Entertainment, bars, night markets, shows

SPECIFIC VENUE REQUIREMENTS:
- Use EXACT venue names, not generic descriptions
- Include specific streets/addresses when possible
- Reference actual landmarks (e.g., "near the Arc de Triomphe" not "near a monument")
- Mention real restaurant names, not "local restaurant"
- Include specific transportation stations/stops

Return ONLY valid JSON in this EXACT structure:
{
  "overview": "Comprehensive trip overview highlighting key experiences and unique elements",
  "tripHighlights": [
    {
      "name": "MUST BE AN ACTUAL ACTIVITY FROM THE DAILY ITINERARY - Main Activity Name",
      "description": "What makes this highlight special and unmissable - MUST reference an activity that appears in the daily plan"
    },
    {
      "name": "MUST BE AN ACTUAL ACTIVITY FROM THE DAILY ITINERARY - Cultural Experience Name", 
      "description": "Unique cultural immersion opportunity - MUST reference an activity that appears in the daily plan"
    },
    {
      "name": "MUST BE AN ACTUAL ACTIVITY FROM THE DAILY ITINERARY - Hidden Gem Name",
      "description": "Off-the-beaten-path discovery - MUST reference an activity that appears in the daily plan"
    }
  ],
  "culturalTips": {
    "etiquette": ["Specific behavior expectation", "Social norm to respect"],
    "customs": ["Local tradition to be aware of", "Cultural practice to observe"],
    "language": ["Essential phrase with pronunciation", "Useful expression for tourists"],
    "safety": ["Regional safety consideration", "Local precaution to take"]
  },
  "destinations": [
    {
      "name": "Destination Name",
      "description": "What makes this place special for travelers",
      "duration": ${destinations[0]?.duration || 3},
      "bestTimeToVisit": "Best season with weather details",
      "localCurrency": "Currency with exchange rate tips",
      "languages": "Languages spoken with useful phrases",
      "timeZone": "Time zone information",
      "activities": [
        {
          "name": "SPECIFIC VENUE NAME (not generic description)",
          "description": "Detailed activity description with cultural context",
          "duration": "2 hours",
          "cost": "$25",
          "category": "adventure",
          "location": "Specific address or landmark reference",
          "walkingDistanceFromPrevious": "5 minutes walk south",
          "transportTime": "10 minutes by metro",
          "timeOfDay": "morning",
          "bookingRequired": true,
          "tips": "Insider tips for this specific venue"
        }
      ]
    }
  ],
  "transport": {
    "betweenDestinations": [
      {
        "from": "Start",
        "to": "End",
        "options": [
          {
            "type": "Train",
            "duration": "3 hours",
            "cost": "$50",
            "description": "Detailed transport description",
            "bookingInfo": "How and when to book",
            "pros": ["Advantage 1", "Advantage 2"],
            "cons": ["Disadvantage 1"]
          }
        ]
      }
    ],
          "gettingThere": {
        "flights": [
          {
            "from": "${departureLocation || 'Major City'}",
            "to": "Destination",
            "airlines": ["Budget Airline", "Standard Airline", "Premium Airline"],
            "options": [
              {
                "class": "Economy",
                "estimatedCost": "Budget-appropriate cost",
                "duration": "X hours",
                "pros": ["Affordable", "Direct flight"],
                "cons": ["Basic service"]
              },
              {
                "class": "Premium Economy",
                "estimatedCost": "Mid-range cost",
                "duration": "X hours",
                "pros": ["More comfort", "Better service"],
                "cons": ["Higher cost"]
              }
            ],
            "bookingTips": "${wantsFlightBooking ? 'Detailed booking strategies, best times to book, price comparison sites, and seasonal pricing' : 'Basic booking info'}",
            "seasonalPricing": "Price variations by season with specific months"
          }
        ],
        "alternativeTransport": [
          {
            "type": "Train/Bus/Car",
            "cost": "Budget-appropriate",
            "duration": "X hours",
            "pros": ["Scenic", "Affordable"],
            "cons": ["Longer journey"],
            "bookingInfo": "How to book and tips"
          }
        ]
      },
    "localTransport": [
      {
        "destination": "City",
        "options": [
          {
            "type": "Bus",
            "cost": "$3",
            "description": "How to use with practical tips",
            "apps": "Useful apps for this transport"
          }
        ]
      }
    ]
  },
  "accommodation": {
    "recommendations": [
      {
        "destination": "City",
        "options": [
          {
            "name": "Budget Option Hotel",
            "type": "Budget-appropriate type",
            "priceRange": "Budget-appropriate price/night",
            "location": "Convenient location",
            "highlights": ["Key features"],
            "rating": "Appropriate rating",
            "pros": ["Advantages"],
            "cons": ["Disadvantages"],
            "bestFor": "Budget travelers"
          },
          {
            "name": "Another hotel based on the budget",
            "type": "Another hotel type",
            "priceRange": "Another hotel price/night",
            "location": "Prime location",
            "highlights": ["Premium features"],
            "rating": "Higher rating",
            "pros": ["Better advantages"],
            "cons": ["Minor disadvantages"],
            "bestFor": "Comfort seekers"
          },
          // Add more hotel options based on the overall trip
        ],
        "bookingTips": "${wantsHotelRecommendations ? 'Detailed booking advice, best rates, comparison sites, and insider tips for each option' : 'Basic booking info'}",
        "generalTips": "How to choose between options based on budget and preferences"
      }
    ]
  },
  "localExperiences": {
    "unique": [
      {
        "name": "Experience Name",
        "description": "${wantsLocalExperiences ? 'Detailed unique local experience with cultural significance' : 'Standard experience'}",
        "duration": "Half day",
        "cost": "$75",
        "bookingRequired": true,
        "culturalSignificance": "Why this experience is special",
        "tips": "How to make the most of it"
      }
    ]
  },
  "itinerary": {
    "days": [
      // CRITICAL: Generate exactly ${tripDuration} day objects - one for each day from day 1 to day ${tripDuration}
      {
        "day": 1,
        "date": "${startDate}",
        "destination": "Primary destination for day 1",
        "title": "Day 1 title (e.g., Arrival and First Impressions)", 
        "theme": "Theme for day 1",
        "activities": [
          {
            "time": "09:00 AM",
            "name": "SPECIFIC VENUE NAME - Morning Activity",
            "description": "Detailed activity description with cultural context and what to expect",
            "location": "Specific address or landmark with GPS coordinates",
            "duration": "2 hours",
            "cost": "$25",
            "tips": "Insider tips, best photo spots, crowd avoidance, local etiquette",
            "bookingRequired": false,
            "category": "arrival",
            "alternatives": [
              {
                "name": "Alternative Activity",
                "reason": "If weather is bad or activity is full",
                "cost": "$20",
                "location": "Alternative location"
              }
            ],
            "practicalInfo": {
              "address": "Full street address",
              "phone": "Contact number",
              "website": "Official website",
              "openingHours": "Daily schedule",
              "bestTimeToVisit": "Optimal timing to avoid crowds",
              "accessibilityInfo": "Wheelchair access, stairs, etc.",
              "paymentMethods": "Cash, card, mobile payments accepted"
            },
            "culturalContext": "Historical significance and cultural importance",
            "photoSpots": ["Best viewpoint 1", "Instagram-worthy spot 2"],
            "localEtiquette": "Dress code, behavior expectations, tipping customs",
            "weatherConsiderations": "Indoor/outdoor, seasonal variations"
          },
          // REPEAT THE ABOVE STRUCTURE FOR ACTIVITIES/PLAN THROUGHOUT THE DAY
          // 🚨 CRITICAL: MUST include ${styleGuide.activitiesPerDay} activities per day based on ${travelStyle} travel style
          // Current style: ${travelStyle} = ${styleGuide.activitiesPerDay} activities per day MINIMUM
          // DO NOT STOP AT 1 ACTIVITY - GENERATE THE FULL NUMBER OF ACTIVITIES
          // Example: If activitiesPerDay = 4, generate 4 complete activity objects with different times
          // Times should be spread throughout the day: morning, late morning, afternoon, late afternoon/evening
        ],
        "meals": [
          {
            "time": "12:30 PM",
            "type": "Lunch",
            "suggestion": "Local dining spot name",
            "cuisine": "Local",
            "cost": "$45",
            "notes": "Dining recommendations and tips",
            "alternatives": [
              {
                "name": "Budget option",
                "cost": "$25",
                "reason": "If looking to save money"
              },
              {
                "name": "Premium option", 
                "cost": "$65",
                "reason": "For special occasion"
              }
            ],
            "practicalInfo": {
              "address": "Full address",
              "phone": "Reservation number",
              "reservationRequired": true,
              "averageWaitTime": "15-30 minutes",
              "paymentMethods": "Cash, card accepted",
              "dietaryOptions": "Vegetarian, vegan, gluten-free available"
            },
            "menuHighlights": ["Must-try dish 1", "Local specialty 2"],
            "culturalDining": "Local dining customs and etiquette"
          }
        ],
        "transport": {
          "overview": "How to get around this day",
          "details": [
            {
              "from": "Starting location",
              "to": "Destination",
              "method": "Walking/Metro/Taxi",
              "duration": "15 minutes",
              "cost": "$3",
              "instructions": "Detailed directions and tips"
            }
          ],
          "dailyTransportBudget": "$15",
          "transportTips": "Local transport apps, payment methods, safety tips"
        },
        "accommodation": {
          "name": "Hotel/Accommodation name",
          "checkInDetails": "Check-in process and timing",
          "amenities": ["WiFi", "Breakfast", "Gym"],
          "tips": "Hotel-specific tips and recommendations"
        },
        "dailyBudgetBreakdown": {
          "activities": "$XX",
          "meals": "$XX", 
          "transport": "$XX",
          "miscellaneous": "$XX",
          "total": "$XX"
        },
        "weatherInfo": {
          "forecast": "Expected weather conditions",
          "temperature": "High/Low temperatures",
          "recommendations": "Weather-appropriate clothing and gear"
        },
        "energyLevel": "High/Medium/Low - indicating intensity of the day",
        "highlights": ["Top 3 experiences of the day"],
        "eveningOptions": [
          {
            "name": "Evening activity option",
            "type": "Entertainment/Dining/Relaxation",
            "cost": "$30",
            "description": "What to do in the evening"
          }
        ]
      },
      // REPEAT THE ABOVE STRUCTURE FOR ALL ${tripDuration} DAYS
      // Day 2: { "day": 2, "date": "Next day", ... },  
      // Day 3: { "day": 3, "date": "Third day", ... },
      // Continue until day ${tripDuration}
      // DO NOT STOP AT DAY 1 - GENERATE ALL ${tripDuration} DAYS WITH FULL DETAILS
    ]
  },
  "budget": {
    "total": "Realistic total based on ${budgetGuidance.dailyBudget} for ${tripDuration} days",
    "breakdown": {
      "accommodation": "Percentage and amount for ${budgetGuidance.accommodationType}",
      "food": "Percentage and amount for ${budgetGuidance.foodType}",
      "activities": "Percentage and amount for ${budgetGuidance.activityType}",
      "transport": "Percentage and amount for ${budgetGuidance.transportType}",
      "extras": "Percentage and amount for miscellaneous"
    },
    "dailyAverage": "${budgetGuidance.dailyBudget}",
    "savingTips": ["Budget-specific saving tips", "Money-saving strategies for ${budget} travelers"],
    "splurgeRecommendations": ["Worth the extra cost within budget", "Best value upgrades"],
    "budgetAlternatives": {
      "cheaper": "How to reduce costs further",
      "upgrade": "How to upgrade experience within reasonable budget increase"
    }
  },
  "packingTips": {
    "essentials": ["Item1", "Item2"],
    "seasonal": "Season-specific items",
    "luxury": "Luxury travel essentials",
    "cultural": "Culturally appropriate items"
  },
  "localTips": {
    "cultural": ["Cultural tip 1", "Cultural tip 2"],
    "practical": ["Practical tip 1", "Practical tip 2"],
    "safety": ["Safety tip 1", "Safety tip 2"],
    "etiquette": ["Etiquette tip 1", "Etiquette tip 2"]
  },
  "emergencyInfo": {
    "destinations": [
      {
        "name": "City",
        "emergencyNumber": "999",
        "nearestHospital": "Hospital Name with address",
        "embassyInfo": "Embassy contact details",
        "importantNumbers": {
          "police": "Number",
          "medical": "Number",
          "tourist": "Tourist helpline"
        }
      }
    ]
  },
  "bookingChecklist": [
    {
      "item": "Flights",
      "timeframe": "2-3 months before",
      "priority": "High",
      "notes": "${wantsFlightBooking ? 'Detailed booking strategy' : 'Basic booking info'}"
    },
    {
      "item": "Hotels",
      "timeframe": "1-2 months before",
      "priority": "High",
      "notes": "${wantsHotelRecommendations ? 'Detailed hotel booking strategy' : 'Basic booking info'}"
    }
  ]
}`;

    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a world-renowned master travel planner and cultural immersion specialist with 25+ years of expertise creating transformative, meticulously detailed travel experiences. Your specialties include: proactive hour-by-hour scheduling, insider cultural insights, budget optimization, authentic local experiences, seasonal timing strategies, advance booking coordination, and practical logistics mastery. 

CRITICAL: You MUST generate exactly ${tripDuration} days in the itinerary.days array. This is non-negotiable. Each day must have detailed activities, meals, and transport information. Do not abbreviate or skip days due to length constraints.

You understand that exceptional travel planning anticipates needs, provides alternatives, respects budgets religiously, and creates authentic connections with local culture. Your itineraries are comprehensive travel guides that serve as complete roadmaps for unforgettable journeys. You excel at balancing must-see highlights with hidden gems, managing realistic timing with transport logistics, and matching experiences perfectly to traveler personalities and interests. Every recommendation includes practical details, cultural context, insider tips, and authentic local experiences. You respond with ONLY valid JSON that can be parsed directly - ensure complete, properly closed JSON structure with all brackets and braces.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 15000,
      top_p: 0.8, 
    });

    const itineraryResponse = completion.choices[0]?.message?.content || "Failed to generate itinerary";
    
    let itineraryData;
    
    let parseSuccess = false;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    let lastError;
    let lastResponse = itineraryResponse;
    
    while (!parseSuccess && retryCount < MAX_RETRIES) {
      try {
        console.log(`Attempt ${retryCount + 1} to parse itinerary JSON`);
        let jsonString = lastResponse.trim();
        
        
        const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim();
        }
        
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1);
        }
        
        
        jsonString = jsonString
          .replace(/,\s*}/g, '}') 
          .replace(/,\s*]/g, ']') 
          .replace(/\n/g, ' ') 
          .replace(/\s+/g, ' '); 
        
        itineraryData = JSON.parse(jsonString);
        
        
        if (!itineraryData.overview || !itineraryData.destinations || !itineraryData.itinerary) {
          throw new Error("Invalid itinerary structure");
        }
        
        
        if (!itineraryData.itinerary.days || itineraryData.itinerary.days.length !== tripDuration) {
          console.error(`ERROR: Expected ${tripDuration} days, got ${itineraryData.itinerary.days?.length || 0}`);
          console.error("Generated days:", itineraryData.itinerary.days?.map((d: { day: number; title: string }) => `Day ${d.day}: ${d.title}`));
          
          
          if (retryCount < MAX_RETRIES - 1) {
            throw new Error(`Expected ${tripDuration} days, got ${itineraryData.itinerary.days?.length || 0}`);
          } else {
            return NextResponse.json(
              { error: `AI generated only ${itineraryData.itinerary.days?.length || 0} days instead of the requested ${tripDuration} days. Please try again with a shorter trip or contact support.` },
              { status: 500 }
            );
          }
        }
        
        
        parseSuccess = true;
        
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${retryCount + 1} failed to parse itinerary JSON:`, error);
        
        if (retryCount < MAX_RETRIES - 1) {
          retryCount++;
          console.log(`Retrying itinerary generation (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          
          
          const retryPrompt = `I need a valid JSON itinerary for a ${tripDuration}-day trip to ${destinations.map((d: Destination) => d.name).join(', ')}. 
The traveler is interested in ${interests.join(', ')}. 
Budget level: ${budget}.
Travel style: ${travelStyle}.

CRITICAL: Return ONLY valid, parseable JSON with no markdown formatting or explanation. 
CRITICAL: Include exactly ${tripDuration} days in the itinerary.days array.

Follow this structure:
{
  "overview": "Brief trip overview",
  "destinations": [{"name": "City", "country": "Country", "duration": days}],
  "itinerary": {
    "days": [
      {
        "day": 1,
        "title": "Day title",
        "activities": [{"time": "9:00 AM", "name": "Activity", "description": "Details"}]
      },
      // EXACTLY ${tripDuration} DAYS REQUIRED
    ]
  }
}`;
          
          try {
            const retryCompletion = await groq.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: "You are a travel planner who ONLY outputs valid JSON. No explanations, no markdown, just pure JSON."
                },
                {
                  role: "user",
                  content: retryPrompt
                }
              ],
              model: "llama-3.3-70b-versatile",
              temperature: 0.3, 
              max_tokens: 1000, 
              top_p: 0.95,
            });
            
            lastResponse = retryCompletion.choices[0]?.message?.content || "Failed to generate itinerary";
          } catch (apiError) {
            console.error("API error during retry:", apiError);
          }
        } else {
          
          console.error("All parsing attempts failed");
          console.error("Raw response length:", lastResponse.length);
          console.error("Raw response preview:", lastResponse.substring(0, 500) + "...");
          
          return NextResponse.json(
            { error: "Failed to generate itinerary after multiple attempts. Please try again." },
            { status: 500 }
          );
        }
      }
    }

    const bookingLinks: BookingLinks = {};
    const primaryDest = destinations[0]?.name || '';
    if (wantsHotelRecommendations && primaryDest) {
      bookingLinks.hotels = await researchBookingLinks(
        `best hotel booking links for ${primaryDest} from ${startDate} to ${endDate} for ${travelers} guests with ${budget} budget`
      );
    }
    if (wantsFlightBooking && departureLocation && primaryDest) {
      bookingLinks.flights = await researchBookingLinks(
        `best flight booking links from ${departureLocation} to ${primaryDest} departing ${startDate} returning ${endDate} for ${travelers} passengers`
      );
    }
    if (primaryDest) {
      bookingLinks.cars = await researchBookingLinks(
        `best car rental booking links in ${primaryDest} from ${startDate} to ${endDate}`
      );
    }
    if (wantsLocalExperiences && primaryDest) {
      bookingLinks.activities = await researchBookingLinks(
        `best activity booking links in ${primaryDest} between ${startDate} and ${endDate} within ${budget} budget`
      );
    }

    if (typeof itineraryData === 'object' && itineraryData !== null) {
      itineraryData = enhanceItineraryWithScrapedData(itineraryData as StructuredItinerary);
      itineraryData.bookingLinks = bookingLinks;

      
      if (wantsHotelRecommendations && itineraryData?.bookingLinks?.accommodations) {
        itineraryData.bookingLinks.accommodations = itineraryData.bookingLinks.accommodations.map((d: any) => {
          const { location, checkIn, checkOut } = d;
          return {
            ...d,
            url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(location)}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${travelers}`
          };
        });
      }
    }

    return NextResponse.json(itineraryData);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: "Failed to generate itinerary. Please try again." },
      { status: 500 }
    );
  }
} 