import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const count = parseInt(searchParams.get('count') || '4', 10);
    
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' });
    const season = getSeason(currentDate);

    const prompt = `You are a travel expert. Please provide ${count} trending tourist destinations that are particularly good to visit in ${month} (${season}). 
    ${page > 1 ? 'These should be DIFFERENT destinations than would typically be in your first recommendations.' : ''}
    
    For each destination, include:
    1. City name
    2. Country
    3. A brief description (2-3 sentences) about why it's good to visit now
    4. Main attraction or activity
    5. Weather conditions during this time
    
    CRITICAL: Strictly follow the JSON FORMAT provided below, THIS IS AN EXAMPLE, DO NOT CHANGE THE FORMAT:
    {
      "name": "Paris",
      "country": "France",
      "description": "Paris is known for its iconic Eiffel Tower, historic Louvre Museum, and romantic Seine River cruises.",
      "mainAttraction": "Eiffel Tower",
      "weather": "Temperatures around 15-20°C, mostly sunny with occasional light rain.",
      "imageKeywords": ["Eiffel Tower", "Louvre Museum", "Seine River", "Paris"]
    }
    
    Do not include any other text or comments in your response.
    
    For imageKeywords, provide 3-4 keywords that could be used to search for representative images of this destination.`;

    
    let destinations = [];
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts && destinations.length === 0) {
      attempts++;
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama3-70b-8192",
          temperature: page === 1 ? 0.5 : 0.7, 
          max_tokens: 1024,
        });

        const responseContent = completion.choices[0]?.message?.content || '';
        
        
        const jsonMatch = responseContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          destinations = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (destinations.length === 0) {
      throw new Error('Failed to get valid destinations after multiple attempts');
    }
    
    return NextResponse.json({ 
      destinations, 
      season, 
      month,
      page,
      hasMore: true 
    });
  } catch (error) {
    console.error('Error fetching trending destinations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch trending destinations',
      }, 
      { status: 500 }
    );
  }
}

function getSeason(date: Date): string {

  const month = date.getMonth();
  
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Fall';
  return 'Winter';
} 