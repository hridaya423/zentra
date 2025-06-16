import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { extractJSONFromResponse } from '@/lib/utils/ai-response-filter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface LocalInsights {
  destination: string;
  accommodationTips: string[];
  localEvents: Array<{
    name: string;
    date: string;
    description: string;
    cost: string;
  }>;
  transportTips: string[];
  culturalTips: string[];
  budgetTips: string[];
  seasonalAdvice: string[];
  hiddenGems: string[];
  foodRecommendations: string[];
  safetyTips: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, interests, travelStyle, budget, dates, duration } = body;

    if (!destination) {
      return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
    }

    const insights = await generateLocalInsights(destination, interests || [], travelStyle || 'balanced', budget || 'moderate', dates || '', duration || 3);
    
    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error generating local insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate local insights' },
      { status: 500 }
    );
  }
}

async function generateLocalInsights(
  destination: string, 
  interests: string[], 
  travelStyle: string, 
  budget: string, 
  dates: string, 
  duration: number
): Promise<LocalInsights> {
  try {
    const prompt = `ROLE: You are a local destination expert and cultural advisor for ${destination} with comprehensive knowledge of current conditions, local customs, seasonal considerations, and insider tips.

EXPERTISE:
- Current local events and seasonal activities in ${destination}
- Budget-specific accommodation and spending strategies for ${budget} travelers
- Cultural etiquette and local customs that enhance visitor experiences
- Transportation systems, logistics, and insider navigation tips
- Hidden gems and authentic local experiences beyond tourist attractions
- Food scene recommendations aligned with local culture
- Safety considerations and practical travel wisdom
- Seasonal advice for travel during ${dates}

TRAVELER PROFILE:
- Destination: ${destination}
- Interests: ${interests.join(', ') || 'general exploration'}
- Travel Style: ${travelStyle}
- Budget Level: ${budget}
- Duration: ${duration} days
- Travel Dates: ${dates}

TASK: Generate comprehensive local insights and practical advice that go beyond standard tourist information. Focus on current, actionable intelligence that helps travelers experience ${destination} like informed locals.

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "destination": "${destination}",
  "accommodationTips": [
    "Specific advice about where to stay in ${destination} for ${budget} budget",
    "Neighborhood recommendations with local context",
    "Booking timing and pricing insights for ${dates}"
  ],
  "localEvents": [
    {
      "name": "Current or seasonal event name",
      "date": "Event date or season",
      "description": "What makes this event special and worth attending",
      "cost": "Pricing information or free"
    }
  ],
  "transportTips": [
    "Local transportation insights for ${destination}",
    "Cost-effective ways to get around",
    "Insider tips for navigating the city"
  ],
  "culturalTips": [
    "Important cultural customs and etiquette",
    "Local behaviors that show respect",
    "Communication tips and language basics"
  ],
  "budgetTips": [
    "Specific money-saving strategies for ${budget} budget in ${destination}",
    "Local pricing insights and where to splurge vs save",
    "Payment methods and tipping customs"
  ],
  "seasonalAdvice": [
    "Weather-specific advice for ${dates}",
    "Seasonal activities and what to avoid",
    "Packing recommendations for current conditions"
  ],
  "hiddenGems": [
    "Lesser-known places that locals love",
    "Authentic experiences off the tourist trail",
    "Unique ${destination} experiences aligned with ${interests.join('/')}"
  ],
  "foodRecommendations": [
    "Must-try local dishes and where to find them",
    "Local food markets and authentic dining spots",
    "Food etiquette and dining customs"
  ],
  "safetyTips": [
    "Current safety considerations for ${destination}",
    "Areas to be aware of and general precautions",
    "Emergency information and local contacts"
  ]
}

QUALITY REQUIREMENTS:
- All advice must be specific to ${destination} and current conditions
- Recommendations should align with ${travelStyle} travel style and ${interests.join('/')} interests  
- Budget advice must be appropriate for ${budget} spending level
- Include practical, actionable information that enhances the travel experience
- Focus on authentic local knowledge rather than generic travel advice`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a world-class local destination expert with deep cultural knowledge, current market intelligence, and insider access to authentic local experiences. You specialize in providing practical, actionable travel advice that helps visitors experience destinations like informed locals. Your expertise covers cultural customs, seasonal patterns, local events, budget strategies, and hidden gems. You respond with ONLY valid JSON - no explanations, no reasoning, no thinking blocks." 
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.3,
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content || '';
    const jsonString = extractJSONFromResponse(response);
    
    if (jsonString) {
      try {
        const insights = JSON.parse(jsonString);
        return insights;
      } catch (e) {
        console.error('Error parsing local insights JSON:', e, 'Raw response:', response.substring(0, 200));
      }
    }
    
    
    return {
      destination,
      accommodationTips: [`Check local accommodation options in ${destination} for ${budget} budget travelers`],
      localEvents: [],
      transportTips: [`Research local transportation options in ${destination}`],
      culturalTips: [`Learn about local customs and etiquette in ${destination}`],
      budgetTips: [`Budget ${budget} travelers should research local pricing in ${destination}`],
      seasonalAdvice: [`Check current weather and seasonal considerations for ${destination}`],
      hiddenGems: [`Explore local recommendations and hidden gems in ${destination}`],
      foodRecommendations: [`Try local cuisine and traditional dishes in ${destination}`],
      safetyTips: [`Follow standard travel safety precautions in ${destination}`]
    };
  } catch (error) {
    console.error('Error in generateLocalInsights:', error);
    return {
      destination,
      accommodationTips: [],
      localEvents: [],
      transportTips: [],
      culturalTips: [],
      budgetTips: [],
      seasonalAdvice: [],
      hiddenGems: [],
      foodRecommendations: [],
      safetyTips: []
    };
  }
} 