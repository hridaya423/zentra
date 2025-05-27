/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { Destination, BookingLinks, StructuredItinerary, BookingLink } from '@/types/travel';


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

interface ScrapedRestaurantData {
  name: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  reviews: number;
  specialties: string[];
  reservationRequired: boolean;
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
    const prompt = `Extract accommodation information from this content for ${destination} with ${budget} budget. 
    Content: ${content.substring(0, 3000)}
    
    Return JSON array of hotels with this structure:
    [{"name": "Hotel Name", "priceRange": "$100-200/night", "rating": 4.5, "reviews": 1200, "amenities": ["WiFi", "Pool"], "location": "City Center", "availability": true}]
    
    Only return valid JSON array, no other text.`;
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('Error extracting accommodation data:', error);
    return [];
  }
}

async function scrapeRestaurantData(destination: string, budget: string): Promise<ScrapedRestaurantData[]> {
  try {
    console.log(`Scraping restaurant data for ${destination}...`);
    
    const searchResults = await fetchSearch(
      `best restaurants ${destination} ${budget} budget local food reviews ratings`,
      3
    );
    
    const restaurantData: ScrapedRestaurantData[] = [];
    
    for (const result of searchResults.slice(0, 2)) {
      const content = await scrapeUrlContent(result.url);
      if (content) {
        const extractedData = await extractRestaurantDataFromContent(content, destination, budget);
        if (extractedData.length > 0) {
          restaurantData.push(...extractedData);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return restaurantData.slice(0, 5);
  } catch (error) {
    console.error('Error scraping restaurant data:', error);
    return [];
  }
}

async function extractRestaurantDataFromContent(content: string, destination: string, budget: string): Promise<ScrapedRestaurantData[]> {
  try {
    const prompt = `Extract restaurant information from this content for ${destination} with ${budget} budget.
    Content: ${content.substring(0, 3000)}
    
    Return JSON array of restaurants with this structure:
    [{"name": "Restaurant Name", "cuisine": "Italian", "priceRange": "$$", "rating": 4.2, "reviews": 850, "specialties": ["Pasta", "Pizza"], "reservationRequired": true}]
    
    Only return valid JSON array, no other text.`;
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('Error extracting restaurant data:', error);
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
    const prompt = `Extract activity information from this content for ${destination} matching interests: ${interests.join(', ')} with ${budget} budget.
    Content: ${content.substring(0, 3000)}
    
    Return JSON array of activities with this structure:
    [{"name": "Activity Name", "type": "Museum", "price": "$25", "duration": "2 hours", "rating": 4.3, "reviews": 650, "description": "Brief description", "bookingRequired": false}]
    
    Only return valid JSON array, no other text.`;
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1000,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
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
    const prompt = `Extract local insights from this content for ${destination} during ${travelDates}.
    Content: ${content.substring(0, 4000)}
    
    Return JSON with this structure:
    {
      "currentEvents": [{"name": "Event Name", "date": "2024-01-15", "description": "Event description", "cost": "$20"}],
      "weatherTips": "Weather information and what to pack",
      "localInsights": ["Local tip 1", "Local tip 2"],
      "transportUpdates": ["Transport update 1", "Transport update 2"]
    }
    
    Only return valid JSON object, no other text.`;
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1500,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      departureLocation,
      destinations,
      startDate,
      endDate,
      travelers,
      budget,
      travelStyle,
      interests,
      accommodation,
      transportPreference,
      maxBudget,
      dietaryRestrictions,
      additionalNotes,
      wantsHotelRecommendations,
      wantsFlightBooking,
      wantsLocalExperiences,
      wantsRestaurantReservations
    } = body;

    console.log('🔍 Starting enhanced real-time data scraping...');
    const scrapedData = {
      accommodations: new Map<string, ScrapedAccommodationData[]>(),
      restaurants: new Map<string, ScrapedRestaurantData[]>(),
      activities: new Map<string, ScrapedActivityData[]>(),
      localInsights: new Map<string, ScrapedLocalData>()
    };

    const scrapingPromises = destinations.map(async (dest: Destination) => {
      const destName = dest.name;
      console.log(`📍 Scraping data for ${destName}...`);
      
      try {
        const [accommodationData, restaurantData, activityData, localData] = await Promise.all([
          scrapeAccommodationData(destName, startDate, endDate, budget),
          scrapeRestaurantData(destName, budget),
          scrapeActivityData(destName, interests, budget),
          scrapeLocalInsights(destName, `${startDate} to ${endDate}`)
        ]);

        scrapedData.accommodations.set(destName, accommodationData);
        scrapedData.restaurants.set(destName, restaurantData);
        scrapedData.activities.set(destName, activityData);
        scrapedData.localInsights.set(destName, localData);
        
        console.log(`✅ Completed scraping for ${destName}`);
      } catch (error) {
        console.error(`❌ Error scraping data for ${destName}:`, error);
        scrapedData.accommodations.set(destName, []);
        scrapedData.restaurants.set(destName, []);
        scrapedData.activities.set(destName, []);
        scrapedData.localInsights.set(destName, {
          currentEvents: [],
          weatherTips: '',
          localInsights: [],
          transportUpdates: []
        });
      }
    });

    await Promise.all(scrapingPromises);
    console.log('🎉 Real-time data scraping completed!');
    
    const enhancedContext = destinations.map((dest: Destination) => {
      const destAccommodations = scrapedData.accommodations.get(dest.name) || [];
      const destRestaurants = scrapedData.restaurants.get(dest.name) || [];
      const destActivities = scrapedData.activities.get(dest.name) || [];
      const destLocalData = scrapedData.localInsights.get(dest.name);

      return `
REAL-TIME DATA FOR ${dest.name.toUpperCase()}:

CURRENT ACCOMMODATION OPTIONS (Live Data):
${destAccommodations.map(acc => 
  `- ${acc.name}: ${acc.priceRange}, Rating: ${acc.rating}/5 (${acc.reviews} reviews), Location: ${acc.location}, Amenities: ${acc.amenities.join(', ')}`
).join('\n')}

CURRENT RESTAURANT OPTIONS (Live Data):
${destRestaurants.map(rest => 
  `- ${rest.name}: ${rest.cuisine} cuisine, ${rest.priceRange}, Rating: ${rest.rating}/5 (${rest.reviews} reviews), Specialties: ${rest.specialties.join(', ')}, Reservations: ${rest.reservationRequired ? 'Required' : 'Not Required'}`
).join('\n')}

CURRENT ACTIVITIES & ATTRACTIONS (Live Data):
${destActivities.map(act => 
  `- ${act.name} (${act.type}): ${act.price}, Duration: ${act.duration}, Rating: ${act.rating}/5 (${act.reviews} reviews), Booking: ${act.bookingRequired ? 'Required' : 'Not Required'}`
).join('\n')}

LOCAL INSIGHTS & CURRENT CONDITIONS:
Weather Tips: ${destLocalData?.weatherTips || 'Check current weather conditions'}
Current Events: ${destLocalData?.currentEvents.map(event => `${event.name} (${event.date}): ${event.description} - ${event.cost}`).join(', ') || 'No major events found'}
Local Tips: ${destLocalData?.localInsights.join(', ') || 'General travel tips apply'}
Transport Updates: ${destLocalData?.transportUpdates.join(', ') || 'Standard transport options available'}
      `.trim();
    }).join('\n\n');

    const enhanceItineraryWithScrapedData = (generatedItinerary: any): StructuredItinerary => {
      if (!generatedItinerary || typeof generatedItinerary !== 'object') {
        return generatedItinerary;
      }

      if (generatedItinerary.accommodation?.recommendations) {
        generatedItinerary.accommodation.recommendations = generatedItinerary.accommodation.recommendations.map((rec: any) => {
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

      if (generatedItinerary.restaurants?.recommendations) {
        generatedItinerary.restaurants.recommendations = destinations.map((dest: Destination) => {
          const scrapedRestaurants = scrapedData.restaurants.get(dest.name) || [];
          const existing = generatedItinerary.restaurants.recommendations.find((r: any) => r.destination === dest.name);
          
          if (scrapedRestaurants.length > 0) {
            return {
              destination: dest.name,
              realTimeOptions: scrapedRestaurants.map(rest => ({
                name: rest.name,
                cuisine: rest.cuisine,
                priceRange: rest.priceRange,
                specialties: rest.specialties,
                reservationRequired: rest.reservationRequired,
                reservationInfo: rest.reservationRequired ? 
                  (wantsRestaurantReservations ? 'Book 1-2 weeks in advance via phone or online' : 'Reservations recommended') : 
                  'Walk-ins welcome',
                dressCode: rest.priceRange === "$$$$" ? "Smart elegant" : rest.priceRange === "$$$" ? "Smart casual" : "Casual",
                dietaryOptions: `Check with restaurant for ${dietaryRestrictions} options`,
                rating: `${rest.rating}/5 (${rest.reviews} reviews)`,
                scrapedData: true
              })),
              ...existing
            };
          }
          
          return existing;
        }).filter(Boolean);
      }

      if (generatedItinerary.destinations) {
        generatedItinerary.destinations = generatedItinerary.destinations.map((dest: any) => {
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

      if (generatedItinerary.itinerary?.days) {
        generatedItinerary.itinerary.days = generatedItinerary.itinerary.days.map((day: any) => {
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

      generatedItinerary.realTimeInsights = destinations.map((dest: Destination) => {
        const localData = scrapedData.localInsights.get(dest.name);
        return {
          destination: dest.name,
          weatherTips: localData?.weatherTips || '',
          currentEvents: localData?.currentEvents || [],
          localTips: localData?.localInsights || [],
          transportUpdates: localData?.transportUpdates || [],
          scrapedAt: new Date().toISOString()
        };
      });

      return generatedItinerary;
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

    
    const isMultiDestination = destinations.length > 1;
    const destinationList = destinations.map((d: Destination) => d.name).join(', ');
    
    
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
            foodType: 'Fine dining, Michelin-starred restaurants, exclusive experiences',
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
- Local Experiences: ${wantsLocalExperiences ? 'YES - Include unique local activities, hidden gems, cultural experiences, and authentic interactions' : 'NO - Standard tourist activities'}
- Restaurant Reservations: ${wantsRestaurantReservations ? 'YES - Include restaurant recommendations with reservation details, contact info, and booking timelines' : 'NO - General dining suggestions'}`;

    
    const prompt = `Create a detailed ${tripDuration}-day travel itinerary in JSON format that STRICTLY RESPECTS the budget constraints and INCORPORATES the real-time scraped data provided below.

TRIP DETAILS:
- Departure: ${departureLocation || 'Not specified'}
- Destinations: ${destinations.map((d: Destination) => `${d.name} (${d.duration} days)`).join(', ')}
- Dates: ${startDate} to ${endDate}
- Travelers: ${travelers}
- Budget: ${budget}${maxBudget ? ` (Max: $${maxBudget})` : ''}
- Style: ${travelStyle}
- Interests: ${interests.join(', ')}
- Accommodation: ${accommodation}
- Transport: ${transportPreference}
- Diet: ${dietaryRestrictions}
${additionalNotes ? `- Notes: ${additionalNotes}` : ''}

BUDGET CONSTRAINTS (MUST BE RESPECTED):
- Daily Budget: ${budgetGuidance.dailyBudget}
- Accommodation Type: ${budgetGuidance.accommodationType}
- Food Type: ${budgetGuidance.foodType}
- Transport Type: ${budgetGuidance.transportType}
- Activity Type: ${budgetGuidance.activityType}
- Budget Tips: ${budgetGuidance.tips}

${interactivePreferences}

🔥 REAL-TIME SCRAPED DATA (PRIORITY - USE THIS DATA):
${enhancedContext}

IMPORTANT: Use the real-time scraped data above to:
1. Include actual hotel names, prices, and ratings from the scraped accommodation data
2. Incorporate real restaurant names, cuisines, and pricing from the scraped restaurant data  
3. Use actual activity names, costs, and ratings from the scraped activity data
4. Include current events happening during the travel dates
5. Incorporate current weather tips and local insights
6. Use real pricing information to ensure budget accuracy
7. Mention specific amenities, ratings, and review counts from scraped data
8. Include any transport updates or local tips from scraped data

The scraped data should take PRIORITY over generic recommendations. If real pricing is available, use those exact prices. If real hotels/restaurants are found, prioritize them in recommendations.

ENHANCED REQUIREMENTS:
1. Include ALL ${tripDuration} days in itinerary.days array
2. Use real place names and realistic costs that FIT THE BUDGET
3. Match activities to interests: ${interests.join(', ')}
4. Include detailed transport between destinations with multiple options
5. Provide specific recommendations based on interactive preferences
6. ${wantsHotelRecommendations ? 'Include 3-5 hotel options per destination with detailed comparisons, pros/cons, pricing, and booking strategies' : 'Basic accommodation info'}
7. ${wantsFlightBooking ? 'Include multiple flight options with different airlines, classes, and booking strategies from ' + (departureLocation || 'major cities') : 'Basic flight info'}
8. ${wantsLocalExperiences ? 'Include unique local experiences, hidden gems, cultural activities, and authentic interactions' : 'Standard tourist activities'}
9. ${wantsRestaurantReservations ? 'Include restaurant recommendations with reservation requirements, contact info, and booking timelines' : 'General dining suggestions'}
10. RESPECT BUDGET: All recommendations must fit within ${budgetGuidance.dailyBudget} daily budget
11. Provide multiple options for accommodation, transport, and activities at different price points
12. Include money-saving tips and splurge recommendations within budget

Return ONLY valid JSON in this EXACT structure:
{
  "overview": "Comprehensive trip overview highlighting key experiences and luxury elements",
  "destinations": [
    {
      "name": "Destination Name",
      "description": "What makes this place special for luxury travelers",
      "duration": ${destinations[0]?.duration || 3},
      "bestTimeToVisit": "Best season with weather details",
      "localCurrency": "Currency with exchange rate tips",
      "languages": "Languages spoken with useful phrases",
      "timeZone": "Time zone information",
      "activities": [
        {
          "name": "Activity Name",
          "description": "Detailed activity description",
          "duration": "2 hours",
          "cost": "$25",
          "category": "adventure",
          "bookingRequired": true,
          "tips": "Insider tips for this activity"
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
            "name": "Mid-Range Option Hotel",
            "type": "Mid-range type",
            "priceRange": "Mid-range price/night",
            "location": "Prime location",
            "highlights": ["Premium features"],
            "rating": "Higher rating",
            "pros": ["Better advantages"],
            "cons": ["Minor disadvantages"],
            "bestFor": "Comfort seekers"
          },
          {
            "name": "Premium Option Hotel",
            "type": "Luxury type",
            "priceRange": "Premium price/night",
            "location": "Best location",
            "highlights": ["Luxury features"],
            "rating": "Top rating",
            "pros": ["Luxury advantages"],
            "cons": ["Higher cost"],
            "bestFor": "Luxury travelers"
          }
        ],
        "bookingTips": "${wantsHotelRecommendations ? 'Detailed booking advice, best rates, comparison sites, and insider tips for each option' : 'Basic booking info'}",
        "generalTips": "How to choose between options based on budget and preferences"
      }
    ]
  },
  "restaurants": {
    "recommendations": [
      {
        "destination": "City",
        "name": "Restaurant Name",
        "cuisine": "Local/International",
        "priceRange": "$$$$",
        "specialties": ["Dish 1", "Dish 2"],
        "reservationRequired": ${wantsRestaurantReservations},
        "reservationInfo": "${wantsRestaurantReservations ? 'Detailed reservation process, contact info, and best times' : 'Basic info'}",
        "dressCode": "Smart casual",
        "dietaryOptions": "Available options for ${dietaryRestrictions}"
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
      {
        "day": 1,
        "date": "${startDate}",
        "destination": "City",
        "title": "Arrival and First Impressions",
        "theme": "Getting oriented and luxury welcome",
        "activities": [
          {
            "time": "09:00 AM",
            "name": "Activity",
            "description": "What you'll do with luxury touches",
            "location": "Specific address or landmark",
            "duration": "2 hours",
            "cost": "$25",
            "tips": "Insider tips and recommendations",
            "bookingRequired": false,
            "category": "arrival"
          }
        ],
        "meals": [
          {
            "time": "12:30 PM",
            "type": "Lunch",
            "restaurant": "Restaurant name",
            "cuisine": "Local",
            "cost": "$45",
            "reservationNeeded": ${wantsRestaurantReservations}
          }
        ],
        "transport": "How to get around this day",
        "accommodation": "Where you're staying with check-in details"
      }
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
          content: "You are an expert travel planner with 20+ years of experience creating personalized itineraries for all budget levels. You excel at finding the best value options while respecting strict budget constraints. You provide multiple options for accommodations, transport, and activities at different price points. Your responses must be valid JSON that can be parsed directly. CRITICAL: Ensure your JSON response is complete and properly closed with all brackets and braces. ALWAYS respect the specified budget constraints and provide realistic pricing. Focus on authenticity, value, and creating memorable experiences within budget."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.3,
      max_tokens: 12000,
      top_p: 0.8,
    });

    const itineraryResponse = completion.choices[0]?.message?.content || "Failed to generate itinerary";
    
    let itineraryData;
    try {
      let jsonString = itineraryResponse.trim();
      
      
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
        console.warn(`Expected ${tripDuration} days, got ${itineraryData.itinerary.days?.length || 0}`);
      }
      
    } catch (error) {
      console.error("Failed to parse itinerary JSON:", error);
      console.error("Raw response length:", itineraryResponse.length);
      console.error("Raw response preview:", itineraryResponse.substring(0, 500) + "...");
      
      
      const fallbackItinerary: Partial<StructuredItinerary> = {
        overview: `Experience an extraordinary ${tripDuration}-day luxury journey through ${destinationList}. This meticulously crafted itinerary combines ${travelStyle} travel with premium experiences focused on ${interests.join(', ')}, ensuring an unforgettable adventure tailored to your sophisticated preferences.`,
        destinations: destinations.map((dest: Destination) => ({
          name: dest.name,
          description: `A captivating luxury destination offering world-class experiences perfect for discerning ${travelStyle} travelers with interests in ${interests.join(', ')}.`,
          duration: dest.duration,
          bestTimeToVisit: "Year-round with seasonal highlights and optimal weather windows",
          localCurrency: "Local currency with current exchange rates and payment tips",
          languages: "Local languages with essential phrases for luxury travelers",
          timeZone: "Local time zone with jet lag management tips",
          activities: [
            {
              name: "Premium Cultural Exploration",
              description: "Private guided tour of cultural highlights with expert local guide",
              duration: "3 hours",
              cost: "$150",
              category: "culture",
              bookingRequired: true,
              tips: "Book private tours for personalized experience"
            },
            {
              name: "Luxury Culinary Experience",
              description: `Exclusive ${dietaryRestrictions !== 'none' ? dietaryRestrictions + ' ' : ''}dining experience with renowned chef`,
              duration: "2.5 hours",
              cost: "$200",
              category: "food",
              bookingRequired: true,
              tips: "Reserve well in advance for chef's table experiences"
            }
          ]
        })),
        transport: {
          betweenDestinations: isMultiDestination ? [{
            from: destinations[0].name,
            to: destinations[1]?.name || destinations[0].name,
            options: [{
              type: transportPreference === 'public' ? 'Premium Train Service' : 'Luxury Transfer Options',
              duration: "2-4 hours",
              cost: "$150-400",
              description: "Premium transport options with comfort and style",
              bookingInfo: wantsFlightBooking ? "Book 2-4 weeks in advance for best rates and seat selection" : "Standard booking available",
              pros: ["Comfort", "Scenic route", "Reliable"],
              cons: ["Weather dependent"]
            }]
          }] : [],
          gettingThere: {
            flights: [{
              from: "Major international hub",
              to: destinations[0].name,
              airlines: ["Premium carriers", "Luxury airlines"],
              estimatedCost: budget === 'luxury' ? "$2000-5000" : "$800-2000",
              duration: "Varies by origin",
              bookingTips: wantsFlightBooking ? "Book 2-3 months ahead for business class deals. Use airline miles for upgrades. Tuesday departures often cheaper." : "Book in advance for better rates",
              classOptions: ["Economy", "Premium Economy", "Business", "First"],
              seasonalPricing: "Peak season: +30-50%, Shoulder: +10-20%, Off-peak: Best rates"
            }],
            otherOptions: []
          },
          localTransport: destinations.map((dest: Destination) => ({
            destination: dest.name,
            options: [{
              type: transportPreference === 'public' ? 'Premium public transport' : 'Private luxury transport',
              cost: budget === 'luxury' ? "$50-100/day" : "$20-50/day",
              description: "Comfortable and efficient local transportation",
              apps: "Local transport apps and luxury car services"
            }]
          }))
        },
        accommodation: {
          recommendations: destinations.map((dest: Destination) => ({
            destination: dest.name,
            name: `Luxury ${accommodation} in ${dest.name}`,
            type: accommodation,
            priceRange: budget === 'luxury' ? "$500-1000/night" : budget === 'moderate' ? "$200-400/night" : "$100-200/night",
            location: "Prime location with landmark proximity",
            highlights: ["Exceptional service", "Premium amenities", "Prime location", "Luxury spa"],
            suitableFor: `Discerning ${travelStyle} travelers`,
            bookingTips: wantsHotelRecommendations ? "Book directly with hotel for upgrades. Join loyalty programs. Request higher floors and specific room types. Best rates often 2-3 months in advance." : "Book in advance for better rates",
            amenities: ["Concierge service", "Spa", "Fine dining", "Premium location"],
            rating: "5 stars",
            pros: ["Exceptional service", "Prime location", "Luxury amenities"],
            cons: ["Premium pricing"]
          }))
        },
        restaurants: {
          recommendations: destinations.map((dest: Destination) => ({
            destination: dest.name,
            name: `Premier Restaurant in ${dest.name}`,
            cuisine: "Local specialties with international flair",
            priceRange: budget === 'luxury' ? "$$$$" : "$$$",
            specialties: ["Signature dish 1", "Local delicacy", "Chef's special"],
            reservationRequired: wantsRestaurantReservations,
            reservationInfo: wantsRestaurantReservations ? "Reserve 2-4 weeks ahead. Call directly or use concierge. Mention special occasions for VIP treatment." : "Reservations recommended",
            dressCode: "Smart elegant",
            dietaryOptions: `Excellent ${dietaryRestrictions} options available`
          }))
        },
        localExperiences: {
          unique: destinations.map((dest: Destination) => ({
            name: `Exclusive ${dest.name} Experience`,
            description: wantsLocalExperiences ? `Private behind-the-scenes access to ${dest.name}'s hidden gems with cultural expert guide, including exclusive venues not open to general public` : `Standard cultural tour of ${dest.name} highlights`,
            duration: "Half day",
            cost: wantsLocalExperiences ? "$300" : "$75",
            bookingRequired: true,
            culturalSignificance: "Deep dive into local culture and traditions",
            tips: "Bring camera and comfortable walking shoes"
          }))
        },
        itinerary: {
          days: Array.from({ length: tripDuration }, (_, i) => {
            const dayNum = i + 1;
            const currentDest = destinations.find((d: Destination) => {
              const startDay = destinations.slice(0, destinations.indexOf(d)).reduce((sum: number, prev: Destination) => sum + prev.duration, 1);
              const endDay = startDay + d.duration - 1;
              return dayNum >= startDay && dayNum <= endDay;
            }) || destinations[0];
            
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            
            return {
              day: dayNum,
              date: date.toISOString().split('T')[0],
              destination: currentDest.name,
              title: dayNum === 1 ? `Luxury Arrival in ${currentDest.name}` : `Exploring ${currentDest.name} in Style`,
              theme: dayNum === 1 ? "Arrival and luxury welcome" : "Cultural immersion and premium experiences",
              activities: [
                {
                  time: "09:00 AM",
                  name: dayNum === 1 ? "VIP Airport Transfer & Hotel Check-in" : "Morning Luxury Experience",
                  description: dayNum === 1 ? "Private transfer to luxury accommodation with welcome amenities" : "Start your day with premium local exploration",
                  location: `${currentDest.name} premium district`,
                  duration: "2 hours",
                  cost: budget === 'luxury' ? "$100" : "$50",
                  tips: dayNum === 1 ? "Confirm transfer details 24h before arrival" : "Book early morning slots for best experience",
                  bookingRequired: true,
                  category: dayNum === 1 ? "arrival" : "culture"
                },
                {
                  time: "02:00 PM",
                  name: "Afternoon Premium Activity",
                  description: wantsLocalExperiences ? "Exclusive local experience with cultural significance" : "Standard afternoon sightseeing",
                  location: `Premium venue in ${currentDest.name}`,
                  duration: "3 hours",
                  cost: wantsLocalExperiences ? "$150" : "$75",
                  tips: "Bring comfortable walking shoes and camera",
                  bookingRequired: true,
                  category: "experience"
                },
                {
                  time: "07:30 PM",
                  name: "Luxury Dining Experience",
                  description: `Fine dining featuring ${dietaryRestrictions !== 'none' ? dietaryRestrictions + ' ' : ''}local cuisine`,
                  location: `Award-winning restaurant in ${currentDest.name}`,
                  duration: "2.5 hours",
                  cost: budget === 'luxury' ? "$200" : "$100",
                  tips: wantsRestaurantReservations ? "Reservation confirmed with dietary preferences noted" : "Reservations recommended",
                  bookingRequired: wantsRestaurantReservations,
                  category: "dining"
                }
              ],
              meals: [
                {
                  time: "12:30 PM",
                  type: "Lunch",
                  restaurant: `Premium local restaurant`,
                  cuisine: "Local specialties",
                  cost: budget === 'luxury' ? "$80" : "$45",
                  reservationNeeded: wantsRestaurantReservations
                }
              ],
              transport: "Private transfers and premium local transport",
              accommodation: `Luxury ${accommodation} with premium amenities and concierge service`
            };
          })
        },
        budget: {
          total: maxBudget ? `$${maxBudget}` : budget === 'luxury' ? `$${tripDuration * 800}` : budget === 'moderate' ? `$${tripDuration * 400}` : `$${tripDuration * 200}`,
          breakdown: {
            accommodation: `$${Math.round((maxBudget || (budget === 'luxury' ? tripDuration * 800 : budget === 'moderate' ? tripDuration * 400 : tripDuration * 200)) * 0.35)}`,
            food: `$${Math.round((maxBudget || (budget === 'luxury' ? tripDuration * 800 : budget === 'moderate' ? tripDuration * 400 : tripDuration * 200)) * 0.25)}`,
            activities: `$${Math.round((maxBudget || (budget === 'luxury' ? tripDuration * 800 : budget === 'moderate' ? tripDuration * 400 : tripDuration * 200)) * 0.25)}`,
            transport: `$${Math.round((maxBudget || (budget === 'luxury' ? tripDuration * 800 : budget === 'moderate' ? tripDuration * 400 : tripDuration * 200)) * 0.1)}`,
            extras: `$${Math.round((maxBudget || (budget === 'luxury' ? tripDuration * 800 : budget === 'moderate' ? tripDuration * 400 : tripDuration * 200)) * 0.05)}`
          },
          dailyAverage: `$${Math.round((maxBudget || (budget === 'luxury' ? tripDuration * 800 : budget === 'moderate' ? tripDuration * 400 : tripDuration * 200)) / tripDuration)}`,
          savingTips: ["Book luxury accommodations during shoulder season", "Use hotel loyalty programs for upgrades", "Book experiences directly for better rates"],
          splurgeRecommendations: ["Private guided tours", "Michelin-starred dining", "Spa treatments", "Premium transport upgrades"]
        },
        packingTips: {
          essentials: ["Comfortable luxury walking shoes", "Weather-appropriate elegant clothing", "Premium travel accessories"],
          seasonal: "Season-specific luxury items and weather protection",
          luxury: "Quality luggage, premium toiletries, elegant evening wear",
          cultural: "Culturally appropriate attire for religious sites and fine dining"
        },
        localTips: {
          cultural: ["Respect local customs and traditions", "Learn basic greetings in local language"],
          practical: ["Use official luxury transport services", "Keep copies of important documents"],
          safety: ["Stay in well-lit premium areas", "Use hotel concierge for recommendations"],
          etiquette: ["Dress appropriately for fine dining", "Tip according to local customs"]
        },
        emergencyInfo: {
          destinations: destinations.map((dest: Destination) => ({
            name: dest.name,
            emergencyNumber: "Local emergency services",
            nearestHospital: `Premium medical facility in ${dest.name}`,
            embassyInfo: "Embassy contact details and location",
            importantNumbers: {
              police: "Local police emergency",
              medical: "Medical emergency services",
              tourist: "Tourist assistance hotline"
            }
          }))
        },
        bookingChecklist: [
          {
            item: "Flights",
            timeframe: "2-3 months before",
            priority: "High",
            notes: wantsFlightBooking ? "Book premium seats early. Consider travel insurance. Check visa requirements." : "Book in advance for better rates"
          },
          {
            item: "Hotels",
            timeframe: "1-2 months before",
            priority: "High",
            notes: wantsHotelRecommendations ? "Book directly for upgrades. Join loyalty programs. Request specific room types and floors." : "Book early for availability"
          },
          {
            item: "Restaurant Reservations",
            timeframe: "2-4 weeks before",
            priority: wantsRestaurantReservations ? "High" : "Medium",
            notes: wantsRestaurantReservations ? "Book premium restaurants early. Mention dietary restrictions and special occasions." : "Make reservations for popular restaurants"
          },
          {
            item: "Local Experiences",
            timeframe: "2-3 weeks before",
            priority: wantsLocalExperiences ? "High" : "Medium",
            notes: wantsLocalExperiences ? "Book exclusive experiences early. Confirm group sizes and special requirements." : "Book popular activities in advance"
          }
        ]
      };
      
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
      if (wantsRestaurantReservations && primaryDest) {
        bookingLinks.restaurants = await researchBookingLinks(
          `best restaurant reservation links in ${primaryDest} for ${travelers} guests between ${startDate} and ${endDate}`
        );
      }
      fallbackItinerary.bookingLinks = bookingLinks;
      
      const enhancedFallback = enhanceItineraryWithScrapedData(fallbackItinerary);
      
      return NextResponse.json(enhancedFallback);
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
    if (wantsRestaurantReservations && primaryDest) {
      bookingLinks.restaurants = await researchBookingLinks(
        `best restaurant reservation links in ${primaryDest} for ${travelers} guests between ${startDate} and ${endDate}`
      );
    }
    if (typeof itineraryData === 'object' && itineraryData !== null) {
      itineraryData = enhanceItineraryWithScrapedData(itineraryData);
      itineraryData.bookingLinks = bookingLinks;
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