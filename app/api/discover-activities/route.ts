import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { extractJSONFromResponse } from '@/lib/utils/ai-response-filter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL ?? 'https://api.firecrawl.dev/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

async function searchAndScrapeActivities(destination: string, interests: string[]) {
  if (!FIRECRAWL_API_KEY) {
    console.log('Firecrawl API key not available, skipping web search');
    return [];
  }

  try {
    const searchQueries = [
      `unique things to do ${destination} hidden gems local experiences`,
      `${destination} booking guide what to book in advance`,
      `${destination} ${interests.join(' ')} activities experiences`,
      `${destination} must-visit attractions off the beaten path`
    ];

    const searchResults = [];
    
    for (const query of searchQueries.slice(0, 2)) { 
      try {
        const res = await fetch(`${FIRECRAWL_API_URL}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({ query, limit: 3 })
        });
        
        const json = await res.json();
        if (json.success && json.data) {
          searchResults.push(...json.data.slice(0, 2)); 
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    
    const scrapedContent = [];
    for (const result of searchResults.slice(0, 3)) {
      try {
        const scrapeRes = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({ 
            url: result.url,
            formats: ['markdown'],
            onlyMainContent: true,
            includeTags: ['p', 'h1', 'h2', 'h3', 'h4', 'li'],
            excludeTags: ['nav', 'footer', 'aside', 'header', 'advertisement']
          })
        });
        
        const scrapeJson = await scrapeRes.json();
        if (scrapeJson.success && scrapeJson.data?.markdown) {
          scrapedContent.push({
            url: result.url,
            title: result.title,
            content: scrapeJson.data.markdown.substring(0, 4000) 
          });
        }
      } catch (error) {
        console.error('Scrape error for', result.url, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 300)); 
    }

    return scrapedContent;
  } catch (error) {
    console.error('Error in searchAndScrapeActivities:', error);
    return [];
  }
}

async function discoverUniqueActivities(destination: string, interests: string[], travelStyle: string) {
  if (!destination) {
    return { activities: [], sources: [] };
  }

  try {
    
    const scrapedData = await searchAndScrapeActivities(destination, interests || []);
    
    const webContent = scrapedData.map(item => 
      `Source: ${item.title} (${item.url})\n${item.content}`
    ).join('\n\n---\n\n');

    const prompt = `ROLE: You are a local destination expert and experience curator for ${destination} with deep insider knowledge of unique, authentic activities that match ${travelStyle} travel style and interests in ${interests?.join(', ') || 'general experiences'}.

EXPERTISE AREAS:
- Hidden gems and local secrets in ${destination}
- Advance booking strategies and timing requirements
- Cultural immersion and authentic local experiences
- ${travelStyle} travel style activity matching
- Interest-specific activity curation for ${interests?.join(', ') || 'general interests'}
- Practical logistics: pricing, duration, accessibility

TASK: Extract and curate 8-12 unique, bookable activities from the web content below, focusing on experiences that provide authentic local insights and match the specified travel style and interests.

CURATION CRITERIA FOR ${destination}:
✓ Unique experiences not available elsewhere (destination-specific)
✓ Strong alignment with ${travelStyle} travel pace and intensity
✓ Direct connection to stated interests: ${interests?.join(', ') || 'general exploration'}
✓ Authentic local experiences vs. tourist traps
✓ Proper advance booking guidance (when to book, why it's needed)
✓ Realistic pricing and duration information
✓ Practical insider tips that enhance the experience
✓ Accessibility and logistics considerations

TRAVEL STYLE MATCHING FOR ${travelStyle}:
- Relaxed: Leisurely pace, scenic experiences, cultural immersion, comfortable duration
- Balanced: Mix of active/restful, popular/local, varied experience types
- Active: High-energy, full-day experiences, multiple activities, adventure elements
- Adventurous: Unique challenges, extreme activities, adrenaline experiences
- Cultural: Deep heritage connection, traditional crafts, local interactions, authentic practices
- Foodie: Culinary experiences, cooking classes, market tours, local specialties

WEB CONTENT TO ANALYZE:
${webContent}

OUTPUT FORMAT - Return ONLY this JSON structure:
[
  {
    "name": "Specific activity name that captures the unique experience",
    "description": "Rich, inspiring description highlighting what makes this experience special and authentic to ${destination}",
    "category": "culture|food|adventure|nature|unique|entertainment|wellness|shopping",
    "duration": "Realistic time commitment",
    "bookingRequired": true_or_false_based_on_actual_requirements,
    "advanceBooking": "Specific timeframe based on actual booking needs",
    "cost": "Realistic price range with currency",
    "tips": "Valuable insider knowledge and practical advice for maximizing the experience",
    "bestFor": ["Specific traveler types who would most enjoy this", "Interest-based recommendations"]
  }
]

QUALITY REQUIREMENTS:
- Every activity must be genuinely unique to ${destination}
- Descriptions should inspire and convey authenticity
- Booking information must be practical and actionable
- Tips should provide real insider value
- Cost ranges should reflect current pricing reality
- Perfect alignment with ${travelStyle} style and ${interests?.join('/')} interests`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a world-class local destination expert and authentic experience curator with insider knowledge of unique activities, hidden gems, and cultural immersions. You specialize in matching activities to specific travel styles and interests while providing practical booking guidance and insider tips. Your expertise covers advance reservation strategies, pricing realities, seasonal considerations, and authentic local experiences that create lasting memories. You respond with ONLY valid JSON - no explanations, no reasoning, no thinking blocks." 
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.4,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || '';
    const jsonString = extractJSONFromResponse(response);
    
    if (jsonString) {
      try {
        const activities = JSON.parse(jsonString);
        return { 
          activities: Array.isArray(activities) ? activities : [],
          sources: scrapedData.map(item => ({ title: item.title, url: item.url }))
        };
      } catch (e) {
        console.error('Error parsing activities JSON:', e, 'Raw response:', response.substring(0, 200));
        return { activities: [], sources: [] };
      }
    }
    
    
    return { activities: [], sources: [] };
  } catch (error) {
    console.error('Error in discoverUniqueActivities:', error);
    return { activities: [], sources: [] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, interests, travelStyle } = body;

    const result = await discoverUniqueActivities(destination, interests || [], travelStyle || 'balanced');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in discover-activities:', error);
    return NextResponse.json({ activities: [], sources: [] }, { status: 500 });
  }
}


export { discoverUniqueActivities }; 