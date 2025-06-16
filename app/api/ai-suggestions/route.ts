import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { extractJSONFromResponse } from '@/lib/utils/ai-response-filter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destinations, travelStyle } = body;

    if (!destinations || destinations.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const destinationNames = destinations.map((d: { name: string }) => d.name).join(', ');

    const prompt = `ROLE: You are a destination specialist with deep knowledge of ${destinationNames} and expertise in ${travelStyle} travel experiences. You understand what makes each destination unique and how different travel styles impact activity preferences.

TASK: Generate 6-8 personalized interest categories specifically tailored for ${destinationNames} and ${travelStyle} travel style.

DESTINATION ANALYSIS FOR ${destinationNames}:
- Research what makes these destinations unique and special
- Consider signature experiences, local culture, natural features, cuisine, history
- Factor in seasonal attractions, hidden gems, and authentic local experiences
- Account for ${travelStyle} traveler preferences and pace

TRAVEL STYLE ADAPTATION FOR ${travelStyle}:
- Relaxed: Focus on slow experiences, scenic spots, wellness, leisurely dining
- Balanced: Mix of active and restful, popular and local, structured and flexible
- Active: High-energy activities, full days, multiple experiences, adventure
- Adventurous: Thrills, unique challenges, extreme activities, adrenaline
- Cultural: Deep heritage, traditions, arts, local interactions, authentic experiences
- Foodie: Culinary tours, cooking classes, markets, local specialties, wine/spirits

CATEGORY REQUIREMENTS:
✓ Destination-specific (not generic global categories)
✓ Travel style appropriate (pace and intensity matching)
✓ Authentic local experiences emphasized
✓ Mix of well-known and hidden gem activities
✓ Consider practical factors (accessibility, seasonality, booking requirements)
✓ Appeal to different interest levels within the style

OUTPUT FORMAT - Return ONLY this JSON structure:
[
  {
    "name": "Specific category name reflecting local uniqueness",
    "description": "Compelling 50-60 character description highlighting local authenticity",
    "icon": "Perfect emoji representing the category",
    "category": "food|culture|adventure|nature|unique|entertainment|shopping|wellness"
  }
]

QUALITY STANDARDS:
- Categories must be destination-specific, not generic
- Descriptions should inspire and highlight local authenticity
- Icons should be culturally appropriate and visually appealing
- Perfect balance of popular attractions and hidden local gems
- Each category should offer multiple activity options within it`;

    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a destination expertise specialist with encyclopedic knowledge of global travel destinations and deep understanding of how different travel styles affect activity preferences. You excel at creating personalized, destination-specific interest categories that inspire travelers and highlight authentic local experiences. Your expertise covers cultural nuances, seasonal considerations, hidden gems, and travel logistics. You respond with ONLY valid JSON - no explanations, no reasoning, no thinking blocks." 
        },
        { role: "user", content: prompt }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || '';
    const jsonString = extractJSONFromResponse(response);
    
    if (jsonString) {
      try {
        const suggestions = JSON.parse(jsonString);
        return NextResponse.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
      } catch (e) {
        console.error('Error parsing suggestions:', e, 'Raw response:', response.substring(0, 200));
        return NextResponse.json({ suggestions: [] });
      }
    }
    
    
    return NextResponse.json({ suggestions: [] });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
} 