import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { StructuredItinerary } from '@/types/travel';

function filterThinkingTags(response: string): string {
  
  return response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatRequest {
  message: string;
  itinerary: StructuredItinerary;
  chatHistory: ChatMessage[];
  userPreferences?: {
    budget: string;
    travelStyle: string;
    interests: string[];
    travelers: number;
  };
}

interface ChatResponse {
  response: string;
  updatedItinerary?: StructuredItinerary;
  suggestions?: string[];
  requiresConfirmation?: boolean;
  changes?: {
    type: 'modification' | 'addition' | 'removal';
    description: string;
    affectedDays?: number[];
    before?: string;
    after?: string;
    activityName?: string;
  }[];
}

interface AIChangeDescription {
  type: 'modification' | 'addition' | 'removal';
  description: string;
  affectedDays: number[];
  before?: string;
  after?: string;
  activityName?: string;
}


interface SimplifiedItinerary {
  destinations: { name: string, duration: number }[];
  budget: { total: string };
  itinerary: {
    days: {
      day: number;
      date: string;
      destination: string;
      title: string;
      activities: {
        time: string;
        name: string;
        description: string;
        location: string;
        duration: string;
        cost: string;
      }[];
    }[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, itinerary }: ChatRequest = await request.json();

    
    const intentAnalysis = await analyzeUserIntent(message);
    
    let response: ChatResponse;

    switch (intentAnalysis.intent) {
      case 'modify_itinerary':
        response = await handleItineraryModification(message, itinerary, intentAnalysis);
        break;
      case 'ask_question':
        response = await handleQuestion(message, itinerary);
        break;
      case 'get_suggestions':
        response = await handleSuggestions(message, itinerary);
        break;
      case 'troubleshoot':
        response = await handleTroubleshooting(message, itinerary);
        break;
      default:
        response = await handleGeneralChat(message, itinerary);
    }

    
    if (response.response) {
      response.response = filterThinkingTags(response.response);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat assistant error:', error);
    return NextResponse.json(
      { 
        response: "I'm sorry, I encountered an error. Please try rephrasing your request.",
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

async function analyzeUserIntent(message: string): Promise<{ intent: string; confidence: number; specificAction: string }> {
  
  const lowerMessage = message.toLowerCase();
  
  
  if (lowerMessage.includes('save money') || lowerMessage.includes('cheaper') || 
      lowerMessage.includes('budget') || lowerMessage === 'my itinerary is too expensive' || 
      lowerMessage.includes('expensive')) {
    return { intent: 'modify_itinerary', confidence: 0.9, specificAction: 'budget modification' };
  }
  
  
  if (lowerMessage.includes('less busy') || lowerMessage.includes('more relaxed') || 
      lowerMessage.includes('too busy') || lowerMessage.includes('slow down')) {
    return { intent: 'modify_itinerary', confidence: 0.9, specificAction: 'relax itinerary' };
  }
  
  
  if (lowerMessage.includes('more active') || lowerMessage.includes('adventurous') || 
      lowerMessage.includes('energetic') || lowerMessage.includes('outdoor') ||
      lowerMessage.includes('exciting') || lowerMessage.includes('adventure')) {
    return { intent: 'modify_itinerary', confidence: 0.9, specificAction: 'active itinerary' };
  }
  
  
  if (lowerMessage.includes('cultural') || lowerMessage.includes('culture') || 
      lowerMessage.includes('museum') || lowerMessage.includes('historical')) {
    return { intent: 'modify_itinerary', confidence: 0.9, specificAction: 'add cultural activities' };
  }
  
  
  const modificationKeywords = ['make', 'add', 'remove', 'change', 'modify', 'replace', 'swap'];
  const questionKeywords = ['what', 'where', 'when', 'how', 'why', 'tell me', 'explain', 'should i'];
  const suggestionKeywords = ['suggest', 'recommend', 'alternatives', 'options', 'better', 'ideas'];
  const troubleshootKeywords = ['problem', 'issue', 'conflict', 'fix'];

  if (modificationKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { intent: 'modify_itinerary', confidence: 0.9, specificAction: 'modify itinerary' };
  } else if (questionKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { intent: 'ask_question', confidence: 0.8, specificAction: 'answer question' };
  } else if (suggestionKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { intent: 'get_suggestions', confidence: 0.8, specificAction: 'provide suggestions' };
  } else if (troubleshootKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { intent: 'troubleshoot', confidence: 0.8, specificAction: 'solve problem' };
  }
  
  return { intent: 'general_chat', confidence: 0.5, specificAction: 'general conversation' };
}


function simplifyItinerary(fullItinerary: StructuredItinerary): SimplifiedItinerary {
  
  return {
    destinations: fullItinerary.destinations.map(dest => ({
      name: dest.name,
      duration: dest.duration
    })),
    budget: {
      total: fullItinerary.budget.total
    },
    itinerary: {
      days: fullItinerary.itinerary.days.map(day => ({
        day: day.day,
        date: day.date,
        destination: day.destination,
        title: day.title,
        activities: day.activities.map(activity => ({
          time: activity.time,
          name: activity.name,
          description: activity.description,
          location: activity.location,
          duration: activity.duration,
          cost: activity.cost
        }))
      }))
    }
  };
}


function safeJsonExtract(text: string): AIChangeDescription[] | null {
  try {
    
    const jsonMatch = text.match(/\[\s*\{[^]*?\}\s*\]/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      return JSON.parse(jsonString) as AIChangeDescription[];
    }
    
    
    const contextMatch = text.match(/```(?:json)?\s*(\[\s*\{[^]*?\}\s*\])\s*```/);
    if (contextMatch && contextMatch[1]) {
      return JSON.parse(contextMatch[1]) as AIChangeDescription[];
    }
    
    console.log("No JSON array found in the text");
    return null;
  } catch (error) {
    console.error("JSON extraction failed:", error);
    return null;
  }
}

async function handleItineraryModification(
  message: string, 
  itinerary: StructuredItinerary, 
  intentAnalysis: { intent: string; specificAction: string }
): Promise<ChatResponse> {
  
  let prompt = '';
  
  if (intentAnalysis.specificAction === 'budget modification') {
    prompt = `You are an AI travel assistant tasked with modifying a travel itinerary to reduce costs and fit within a budget. 
    The user request is: "${message}"

    Current itinerary details:
    - Destinations: ${itinerary.destinations.map(d => d.name).join(', ')}
    - Duration: ${itinerary.itinerary.days.length} days
    - Current budget: ${itinerary.budget.total}

    Please modify the itinerary to make it more budget-friendly. For each change:
    1. Replace expensive activities with more affordable alternatives
    2. Add some free activities
    3. Suggest budget accommodations or dining options
    4. Ensure each modification preserves the essence and enjoyment of the trip`;
  } 
  else if (intentAnalysis.specificAction === 'relax itinerary') {
    prompt = `You are an AI travel assistant tasked with modifying a travel itinerary to make it less busy and more relaxed. 
    The user request is: "${message}"

    Current itinerary details:
    - Destinations: ${itinerary.destinations.map(d => d.name).join(', ')}
    - Duration: ${itinerary.itinerary.days.length} days
    
    Please modify the itinerary to make it more relaxed and less hectic. For each change:
    1. Reduce the number of activities per day to a reasonable amount (2-3 main activities)
    2. Add relaxation time and breaks between activities
    3. Ensure there's enough time for leisurely meals and spontaneous exploration
    4. Balance the schedule throughout the day`;
  } 
  else if (intentAnalysis.specificAction === 'active itinerary') {
    prompt = `You are an AI travel assistant tasked with modifying a travel itinerary to make it more active and adventurous. 
    The user request is: "${message}"

    Current itinerary details:
    - Destinations: ${itinerary.destinations.map(d => d.name).join(', ')}
    - Duration: ${itinerary.itinerary.days.length} days
    
    Please modify the itinerary to include more active and adventurous experiences. For each change:
    1. Add outdoor activities suited to each destination
    2. Include physical experiences like hiking, biking, water sports, etc.
    3. Balance active experiences with the existing itinerary
    4. Consider the destination characteristics when suggesting activities`;
  } 
  else if (intentAnalysis.specificAction === 'add cultural activities') {
    prompt = `You are an AI travel assistant tasked with modifying a travel itinerary to include more cultural experiences. 
    The user request is: "${message}"

    Current itinerary details:
    - Destinations: ${itinerary.destinations.map(d => d.name).join(', ')}
    - Duration: ${itinerary.itinerary.days.length} days
    
    Please modify the itinerary to include more cultural activities and experiences. For each change:
    1. Add visits to museums, historical sites, and cultural landmarks
    2. Include experiences to learn about local traditions and customs
    3. Suggest cultural performances, demonstrations, or workshops
    4. Balance cultural experiences with the existing itinerary`;
  } 
  else {
    prompt = `You are an AI travel assistant tasked with modifying a travel itinerary based on the user's request. 
    The user request is: "${message}"

    Current itinerary details:
    - Destinations: ${itinerary.destinations.map(d => d.name).join(', ')}
    - Duration: ${itinerary.itinerary.days.length} days
    
    Please analyze the itinerary and make appropriate changes based on the user's request. For each change:
    1. Be specific about what is being modified, added, or removed
    2. Consider the overall flow and balance of the itinerary
    3. Maintain the essence of what makes each destination special
    4. Make logical changes that enhance the traveler's experience`;
  }
  
  
  const modifiedItinerary = JSON.parse(JSON.stringify(itinerary));
  
  
  const simplifiedItinerary = simplifyItinerary(itinerary);
  
  
  try {
    
    const analysisResponse = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a travel itinerary modification assistant. Based on user input, you will analyze an itinerary and suggest specific changes.
          
          Output format instructions:
          1. First, briefly explain what changes you think are needed in 2-3 sentences.
          2. Then provide a JSON array of specific changes in the following format:
          
          [
            {
              "type": "modification" | "addition" | "removal",
              "description": "Brief description of what was changed",
              "affectedDays": [day numbers],
              "before": "Original content (for modifications and removals)",
              "after": "New content (for modifications and additions)",
              "activityName": "Name of the affected activity (if applicable)"
            }
          ]
          
          Keep your JSON array clean, simple and properly formatted. Include 4-6 specific changes at most.`
        },
        {
          role: "user", 
          content: `${prompt}

          Here is the current itinerary in simplified format:
          ${JSON.stringify(simplifiedItinerary, null, 2)}

          Only respond with your brief analysis and the JSON array of changes as described.`
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.3,
      max_tokens: 2048,
    });
    
    const analysisContent = analysisResponse.choices[0]?.message?.content || "";
    console.log("Analysis response:", analysisContent);
    
    
    let changesArray: AIChangeDescription[] = [];
    const extractedJson = safeJsonExtract(analysisContent);
    
    if (extractedJson && Array.isArray(extractedJson) && extractedJson.length > 0) {
      changesArray = extractedJson;
    } else {
      console.error("Failed to extract valid changes JSON");
    }
    
    
    if (!changesArray || changesArray.length === 0) {
      return {
        response: `I've analyzed your itinerary and have some suggestions for changes based on your request. Would you like me to modify specific days or aspects of your trip?`,
        suggestions: [
          "Make my itinerary less busy",
          "Add more cultural activities",
          "Help me save money",
          `Make changes to day ${Math.floor(Math.random() * itinerary.itinerary.days.length) + 1}`
        ]
      };
    }
    
    
    try {
      
      changesArray.forEach(change => {
        if (!change.affectedDays || change.affectedDays.length === 0) {
          console.log("Skipping change without affected days:", change);
          return; 
        }
        
        console.log("Applying change:", change);
        
        change.affectedDays.forEach(dayNum => {
          const dayIndex = modifiedItinerary.itinerary.days.findIndex((d: { day: number }) => d.day === dayNum);
          if (dayIndex === -1) {
            console.log(`Day ${dayNum} not found in itinerary`);
            return;
          }
          
          const day = modifiedItinerary.itinerary.days[dayIndex];
          
          if (change.type === 'addition' && change.activityName && change.after) {
            console.log(`Adding activity "${change.activityName}" to day ${dayNum}`);
            
            const timeOptions = ['9:00 AM', '10:30 AM', '1:00 PM', '3:30 PM', '6:00 PM', '8:00 PM'];
            const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];
            
            const newActivity = {
              time: randomTime,
              name: change.activityName,
              description: change.after,
              location: day.destination,
              duration: "2 hours", 
              cost: "Free",
              tips: "Added based on your request",
              category: "custom"
            };
            
            day.activities.push(newActivity);
            
            day.activities.sort((a: { time?: string }, b: { time?: string }) => {
              const timeA = a.time || '';
              const timeB = b.time || '';
              return timeA.localeCompare(timeB);
            });
            
          } else if (change.type === 'removal' && change.activityName) {
            console.log(`Removing activity "${change.activityName}" from day ${dayNum}`);
            
            const activityIndex = day.activities.findIndex((activity: { name: string }) => 
              activity.name.toLowerCase().includes(change.activityName!.toLowerCase())
            );
            
            if (activityIndex !== -1) {
              day.activities.splice(activityIndex, 1);
            } else {
              console.log(`Activity "${change.activityName}" not found in day ${dayNum}`);
            }
            
          } else if (change.type === 'modification' && change.activityName) {
            console.log(`Modifying activity "${change.activityName}" on day ${dayNum}`);
            
            const activityIndex = day.activities.findIndex((activity: { name: string }) => 
              activity.name.toLowerCase().includes(change.activityName!.toLowerCase())
            );
            
            if (activityIndex !== -1 && change.after) {
              const activity = day.activities[activityIndex];
              
              
              if (change.after.includes(':')) {
                
                const [newName, newDesc] = change.after.split(':');
                day.activities[activityIndex].name = newName.trim();
                if (newDesc) {
                  day.activities[activityIndex].description = newDesc.trim();
                }
              } else if (change.activityName !== activity.name) {
                
                day.activities[activityIndex].name = change.activityName;
                day.activities[activityIndex].description = change.after;
              } else {
                
                day.activities[activityIndex].description = change.after;
              }
              
              
              if (change.description.toLowerCase().includes('budget') || 
                  change.description.toLowerCase().includes('cost') ||
                  change.description.toLowerCase().includes('expensive') ||
                  change.description.toLowerCase().includes('cheaper')) {
                
                if (change.after.toLowerCase().includes('free')) {
                  day.activities[activityIndex].cost = 'Free';
                } else if (change.after.toLowerCase().includes('$')) {
                  
                  const costMatch = change.after.match(/\$\d+/);
                  if (costMatch) {
                    day.activities[activityIndex].cost = costMatch[0];
                  } else {
                    day.activities[activityIndex].cost = 'Budget-friendly';
                  }
                } else {
                  day.activities[activityIndex].cost = 'Budget-friendly';
                }
              }
              
            } else {
              console.log(`Activity "${change.activityName}" not found in day ${dayNum} for modification`);
            }
          }
        });
      });
      
      console.log("Modified itinerary:", JSON.stringify(modifiedItinerary, null, 2).substring(0, 200) + "...");
      
      
      const responsePrompt = `Based on the user's request to "${message}", you have modified their ${itinerary.destinations.map(d => d.name).join(' & ')} itinerary. 
      
      The changes you made were:
      ${changesArray.map(change => `- ${change.description} ${change.affectedDays ? `(affecting day(s) ${change.affectedDays.join(', ')})` : ''}`).join('\n')}
      
      Please create a friendly, enthusiastic response explaining these changes in a natural way.`;
      
      const finalResponse = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a helpful travel assistant explaining changes made to an itinerary.`
          },
          {
            role: "user", 
            content: responsePrompt
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_tokens: 300,
      });
      
      const responseText = finalResponse.choices[0]?.message?.content || "";
      
      
      const suggestions = generateDynamicSuggestions(changesArray, intentAnalysis.specificAction, itinerary);
      
      return {
        response: responseText,
        updatedItinerary: modifiedItinerary,
        changes: changesArray,
        requiresConfirmation: true,
        suggestions
      };
    } catch (e) {
      console.error("Error applying itinerary changes:", e);
      
      
      return {
        response: `I've analyzed your itinerary and have some suggestions, but I need your help to finalize them. I'd like to make these changes: ${changesArray.map(c => c.description).join(', ')}. Would you like me to be more specific about any of these?`,
        suggestions: [
          "Show me specific changes for day 1",
          "Tell me more about the cultural activities",
          "What would make this itinerary less busy?",
          "Help me balance my trip better"
        ]
      };
    }
  } catch (error) {
    console.error("Error modifying itinerary with AI:", error);
    
    return {
      response: `I apologize, but I'm having trouble processing your itinerary right now. Could we try a different approach? Perhaps you could tell me specific days or activities you'd like to modify.`,
      suggestions: [
        "Help me with day 1 of my trip",
        "Suggest some relaxing activities",
        "What would you change about my itinerary?",
        "Make one day less busy"
      ]
    };
  }
}

function generateDynamicSuggestions(
  changes: AIChangeDescription[], 
  specificAction: string,
  itinerary: StructuredItinerary
): string[] {
  const suggestions: string[] = [];
  const dayNumbers = Array.from(new Set(changes.flatMap(change => change.affectedDays || [])));
  
  
  if (specificAction === 'budget modification') {
    suggestions.push("Show me more free activities");
    suggestions.push("Find budget dining options");
  } else if (specificAction === 'relax itinerary') {
    suggestions.push("Add more free time");
    suggestions.push("Make my mornings more relaxed");
  } else if (specificAction === 'active itinerary') {
    suggestions.push("Add more outdoor activities");
    suggestions.push("Find hiking opportunities");
  } else if (specificAction === 'add cultural activities') {
    suggestions.push("Add more historical sites");
    suggestions.push("Find local cultural events");
  }
  
  
  const allDays = Array.from({length: itinerary.itinerary.days.length}, (_, i) => i + 1);
  const unmodifiedDays = allDays.filter(day => !dayNumbers.includes(day));
  
  if (unmodifiedDays.length > 0) {
    const randomDay = unmodifiedDays[Math.floor(Math.random() * unmodifiedDays.length)];
    suggestions.push(`Modify day ${randomDay}`);
  }
  
  
  if (suggestions.length < 4) {
    suggestions.push("What should I pack for this trip?");
  }
  
  return suggestions.slice(0, 4);
}

async function handleQuestion(
  message: string, 
  itinerary: StructuredItinerary
): Promise<ChatResponse> {
  const lowerMessage = message.toLowerCase();
  const destinations = itinerary.destinations.map(d => d.name).join(' and ');
  
  
  if (lowerMessage.includes('get around') || lowerMessage.includes('transport')) {
    return {
      response: `For getting around ${destinations}, I recommend using public transportation which is efficient and cost-effective. Based on your itinerary, you'll be using ${itinerary.transport?.localTransport?.[0]?.options?.[0]?.type || 'local transport'} for most daily activities. Consider getting a day pass or travel card for convenience and savings.`,
      suggestions: [
        "What should I pack?",
        "Tell me about local customs",
        "What's the weather like?",
        "Any safety tips?"
      ]
    };
  }
  
  if (lowerMessage.includes('pack') || lowerMessage.includes('bring')) {
    return {
      response: `For your ${itinerary.itinerary.days.length}-day trip to ${destinations}, pack comfortable walking shoes, weather-appropriate clothing, and essentials like a portable charger and travel adapter. Based on your activities, I'd also recommend bringing a small daypack for daily excursions and a camera for all the amazing sights you'll see!`,
      suggestions: [
        "What's the best way to get around?",
        "Tell me about local customs",
        "What's the weather like?",
        "Any dining recommendations?"
      ]
    };
  }
  
  if (lowerMessage.includes('weather') || lowerMessage.includes('climate')) {
    return {
      response: `The weather during your trip should be pleasant for most activities. I recommend checking the forecast closer to your departure date and packing layers so you can adjust to changing conditions. Your itinerary includes both indoor and outdoor activities, so you'll be comfortable regardless of minor weather changes.`,
      suggestions: [
        "What should I pack?",
        "How do I get around?",
        "Tell me about local customs",
        "Any safety tips?"
      ]
    };
  }
  
  if (lowerMessage.includes('custom') || lowerMessage.includes('culture') || lowerMessage.includes('etiquette')) {
    return {
      response: `Great question! Understanding local customs will enhance your experience in ${destinations}. Be respectful when visiting religious sites, try to learn a few basic phrases in the local language, and observe how locals behave in different situations. Your itinerary includes cultural activities where you can learn more about local traditions firsthand.`,
      suggestions: [
        "What should I pack?",
        "How do I get around?",
        "What's the weather like?",
        "Any dining recommendations?"
      ]
    };
  }
  
  if (lowerMessage.includes('cost') || lowerMessage.includes('budget') || lowerMessage.includes('money')) {
    return {
      response: `Your current itinerary has a total estimated cost of ${itinerary.budget.total} with a daily average of ${itinerary.budget.dailyAverage}. This includes ${Object.keys(itinerary.budget.breakdown).join(', ')}. If you'd like to adjust the budget, just let me know and I can suggest ways to save money or upgrade certain experiences.`,
      suggestions: [
        "Help me save money",
        "What payment methods should I use?",
        "Are tips expected?",
        "What about emergency funds?"
      ]
    };
  }
  
  
  return {
    response: `I'd be happy to help answer your question about your ${destinations} trip! Could you be more specific about what you'd like to know? I have detailed information about your itinerary, activities, transportation, and local recommendations.`,
    suggestions: [
      "What's the best way to get around?",
      "What should I pack?",
      "Tell me about local customs",
      "What's the weather like?"
    ]
  };
}

async function handleSuggestions(
  message: string, 
  itinerary: StructuredItinerary
): Promise<ChatResponse> {
  const lowerMessage = message.toLowerCase();
  const destinations = itinerary.destinations.map(d => d.name).join(' and ');
  
  if (lowerMessage.includes('food') || lowerMessage.includes('dining') || lowerMessage.includes('restaurant')) {
    return {
      response: `Here are some great dining suggestions for ${destinations}:\n\n• Try local street food markets for authentic flavors and budget-friendly options\n• Book a food tour to discover hidden culinary gems\n• Visit local family-run restaurants for traditional dishes\n• Don't miss the signature dishes that each destination is famous for\n• Consider dietary restrictions and ask locals for their favorite spots`,
      suggestions: [
        "Show me unique local experiences",
        "Recommend photo-worthy spots", 
        "Find budget-friendly alternatives",
        "Suggest cultural activities"
      ]
    };
  }
  
  if (lowerMessage.includes('photo') || lowerMessage.includes('instagram') || lowerMessage.includes('scenic')) {
    return {
      response: `Perfect photo opportunities in ${destinations}:\n\n• Golden hour shots at viewpoints and landmarks\n• Local markets with colorful displays and authentic atmosphere\n• Traditional architecture and historic neighborhoods\n• Natural landscapes and parks for scenic backgrounds\n• Street art and murals in creative districts\n• Sunrise/sunset locations for dramatic lighting`,
      suggestions: [
        "Suggest food and dining options",
        "Show me unique local experiences",
        "Find budget-friendly alternatives",
        "Recommend cultural activities"
      ]
    };
  }
  
  if (lowerMessage.includes('unique') || lowerMessage.includes('local') || lowerMessage.includes('authentic')) {
    return {
      response: `Unique local experiences in ${destinations}:\n\n• Join local workshops or classes (cooking, crafts, language)\n• Visit neighborhood markets and interact with vendors\n• Attend local festivals or community events if available\n• Take walking tours led by local residents\n• Explore areas where locals live and work, not just tourist zones\n• Try traditional activities or sports popular in the region`,
      suggestions: [
        "Suggest food and dining options",
        "Recommend photo-worthy spots",
        "Find budget-friendly alternatives", 
        "Ask about local customs"
      ]
    };
  }
  
  return {
    response: `I'd love to give you personalized suggestions for your ${destinations} trip! Here are some ideas:\n\n• **Cultural experiences**: Museums, temples, historic sites\n• **Food adventures**: Local markets, cooking classes, food tours\n• **Scenic spots**: Viewpoints, parks, photo opportunities\n• **Local interactions**: Workshops, community events, neighborhood walks\n\nWhat type of experiences interest you most?`,
    suggestions: [
      "Show me unique local experiences",
      "Suggest food and dining options", 
      "Recommend photo-worthy spots",
      "Find budget-friendly alternatives"
    ]
  };
}

async function handleTroubleshooting(
  message: string, 
  itinerary: StructuredItinerary
): Promise<ChatResponse> {
  const lowerMessage = message.toLowerCase();
  const destinations = itinerary.destinations.map(d => d.name).join(' and ');
  
  
  if (lowerMessage.includes('expensive') || lowerMessage.includes('budget') || lowerMessage.includes('cost') || 
      lowerMessage === 'my itinerary is too expensive' || lowerMessage.includes('save money')) {
    return handleItineraryModification('help me save money', itinerary, { intent: 'modify_itinerary', specificAction: 'budget modification' });
  }
  
  if (lowerMessage.includes('busy') || lowerMessage.includes('packed') || lowerMessage.includes('rushed')) {
    return {
      response: `Your ${destinations} itinerary does seem quite packed! Here's how to make it more manageable:\n\n**Solutions:**\n• Reduce activities to 3-4 per day maximum\n• Add 2-3 hour breaks between major activities\n• Group nearby attractions together to minimize travel time\n• Replace some structured activities with free exploration time\n• Consider extending your trip by a day if possible\n\nWould you like me to modify your itinerary to be less busy?`,
      suggestions: [
        "Make my itinerary less busy",
        "Add more rest time",
        "Group activities by location",
        "Show me which days are too packed"
      ]
    };
  }
  
  if (lowerMessage.includes('transport') || lowerMessage.includes('timing') || lowerMessage.includes('schedule')) {
    return {
      response: `Transportation timing issues in ${destinations} can be tricky! Here are some solutions:\n\n**Timing fixes:**\n• Add buffer time between activities (30-60 minutes)\n• Check public transport schedules and plan around peak hours\n• Group activities by neighborhood to reduce travel time\n• Have backup indoor activities for weather delays\n• Download offline maps and transport apps\n\nI can help reorganize your daily schedules to fix timing conflicts.`,
      suggestions: [
        "Reorganize my daily schedule",
        "Add buffer time between activities", 
        "Group activities by location",
        "Show me transport options"
      ]
    };
  }
  
  return {
    response: `I'm here to help solve any issues with your ${destinations} trip! Common problems I can help with:\n\n• **Budget concerns**: Finding cheaper alternatives and free activities\n• **Overpacked schedule**: Reducing activities and adding rest time\n• **Transportation issues**: Fixing timing and logistics\n• **Weather backup plans**: Indoor alternatives for outdoor activities\n\nWhat specific issue would you like help with?`,
    suggestions: [
      "My itinerary is too expensive",
      "Days are too packed with activities",
      "Transportation timing doesn't work", 
      "I need backup plans for bad weather"
    ]
  };
}

async function handleGeneralChat(
  message: string, 
  itinerary: StructuredItinerary
): Promise<ChatResponse> {
  const destinations = itinerary.destinations.map(d => d.name).join(' and ');
  const lowerMessage = message.toLowerCase();
  
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      response: `Hello! I'm your AI travel assistant for your ${destinations} trip. I can help you modify your itinerary, answer questions about your destinations, provide suggestions, or solve any planning issues. What would you like to work on?`,
      suggestions: [
        "Make my itinerary less busy",
        "Add more cultural activities",
        "Help me save money",
        "What should I pack?"
      ]
    };
  }
  
  
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return {
      response: `You're very welcome! I'm here to help make your ${destinations} trip amazing. Is there anything else you'd like to adjust or learn about your itinerary?`,
      suggestions: [
        "Modify my itinerary",
        "Ask about destinations", 
        "Get travel suggestions",
        "Solve a planning issue"
      ]
    };
  }
  
  
  return {
    response: `I'm here to help with your ${destinations} trip! I can assist you with:\n\n• **Modifying your itinerary** - Make it less busy, add activities, change plans\n• **Answering questions** - About destinations, transportation, packing, customs\n• **Providing suggestions** - Food, photos, unique experiences, budget options\n• **Solving problems** - Budget issues, timing conflicts, logistics\n\nWhat would you like to work on?`,
    suggestions: [
      "Modify my itinerary",
      "Ask about destinations",
      "Get travel suggestions", 
      "Solve a planning issue"
    ]
  };
} 