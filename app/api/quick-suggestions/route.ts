import { NextRequest, NextResponse } from 'next/server';
import { extractJSONFromResponse } from '@/lib/utils/ai-response-filter';

interface Location {
  name: string;
  country: string;
  reason: string;
  duration: number;
}

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `ROLE: You are an expert travel consultant with 15+ years experience specializing in personalized travel itineraries. You excel at creating thoughtful travel plans around destinations that travelers specifically mention.

CRITICAL TASK: Analyze the travel description below and build a trip centered around the SPECIFIC DESTINATIONS MENTIONED by the traveler. If they name specific places (cities, countries, landmarks), those MUST be the core of your recommendations.

TRAVELER DESCRIPTION: "${description}"

ANALYSIS FRAMEWORK:
1. PRIMARY DESTINATIONS: Identify the EXACT destinations explicitly mentioned by the traveler - these are NON-NEGOTIABLE and must be included
2. BUDGET SIGNALS: Identify budget level from spending mentions, accommodation preferences, activity types
3. TRAVEL STYLE: Determine if they prefer luxury, adventure, relaxation, cultural immersion, foodie experiences
4. INTERESTS: Extract specific interests like history, architecture, nature, nightlife, food, art, etc.
5. DURATION CLUES: Note any time mentions to suggest realistic durations
6. SEASONAL CONSIDERATIONS: Factor in any timing hints for seasonal recommendations
7. GROUP DYNAMICS: Consider solo, couple, family, or group travel implications

MATCHING STRATEGY:
- PRIMARY RULE: If the traveler mentions specific destinations (e.g., "I want to visit Copenhagen"), these MUST be your first recommendations
- SUPPORTING DESTINATIONS: Only after including all explicitly mentioned places, suggest nearby/related destinations that complement their primary choices
- COMPLEMENTARY APPROACH: Additional suggestions should enhance the mentioned destinations, not replace them
- GEOGRAPHIC RELEVANCE: Extra suggestions must be in the same region as their specified locations
- RESPECT INTENT: If they only mention one destination, focus your suggestions around that area

DESTINATION SELECTION CRITERIA:
✓ MANDATORY: Include ALL specifically mentioned destinations as the core of your recommendations
✓ Strong alignment with stated interests and preferences
✓ Appropriate for their implied budget level
✓ Realistic duration based on destination size and travel style
✓ Consider seasonal factors if timing hints provided
✓ Complementary destinations that enhance their primary choices
✓ Geographic proximity to their specified locations
✓ Logical travel flow between recommended destinations
✓ Account for practical considerations (accessibility, safety, infrastructure)

OUTPUT FORMAT: Return ONLY valid JSON in this exact structure:
{
  "locations": [
    {
      "name": "Destination City",
      "country": "Country/Region",
      "reason": "Compelling 2-sentence explanation of why this destination perfectly matches their description, highlighting specific alignment with their interests, budget level, and travel style",
      "duration": realistic_number_of_days
    }
  ]
}

QUALITY STANDARDS:
- HIGHEST PRIORITY: Explicitly mentioned destinations MUST appear first in your recommendations
- Each recommendation must have clear connection to their description
- Reasons should be specific and personalized, not generic
- Duration should be realistic for experiencing the destination properly
- Additional suggestions should complement their primary destination choices`;

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
            content: 'You are a world-renowned travel consultant with deep expertise in global destinations, cultural nuances, and personalized travel planning. Your superpower is translating traveler dreams into perfect destination matches. You understand budget implications, seasonal considerations, visa requirements, and cultural fit. You respond with ONLY valid JSON - no explanations, no reasoning text, no thinking blocks. Your recommendations are precise, personalized, and demonstrate deep understanding of both the traveler and destinations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from Groq API');
    }

    try {
      
      const jsonString = extractJSONFromResponse(aiResponse);
      
      if (!jsonString) {
        throw new Error('No valid JSON found in response');
      }
      
      const parsedResponse = JSON.parse(jsonString);
      
      
      let locations;
      if (Array.isArray(parsedResponse)) {
        
        locations = parsedResponse;
      } else if (parsedResponse.locations && Array.isArray(parsedResponse.locations)) {
        
        locations = parsedResponse.locations;
      } else {
        throw new Error('Invalid response structure');
      }

      
      const validLocations = locations.filter((loc: Location) => 
        loc.name && loc.country && loc.reason && typeof loc.duration === 'number'
      );

      if (validLocations.length === 0) {
        throw new Error('No valid locations in response');
      }

      return NextResponse.json({ 
        locations: validLocations.slice(0, 10) 
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', aiResponse);
      
      return NextResponse.json(
        { error: 'Failed to parse AI suggestions. Please try rephrasing your description.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in quick-suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
} 