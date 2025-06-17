import { Groq } from 'groq-sdk';

export async function createChatCompletionWithFallback(
  messages: Array<{role: string; content: string; name?: string}>,
  model: string = 'llama3-8b-8192',
  temperature: number = 0.7,
  max_tokens: number = 1000
): Promise<string | null> {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  try {
    const groqResponse = await groq.chat.completions.create({
      // @ts-expect-error - Type is compatible but TypeScript can't verify without SDK types
      messages,
      model,
      temperature,
      max_tokens,
    });
    
    return groqResponse.choices[0]?.message?.content || null;
  } catch (error: unknown) {

    console.error('Groq API error:', error);
    
    
    console.warn('Groq API call failed. Falling back to Hack Club AI.');
    try {
      const hackClubResponse = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      if (hackClubResponse.ok) {
        const data = await hackClubResponse.json();
        return data.choices[0]?.message?.content || null;
      } else {
        console.error('Hack Club AI API request failed:', hackClubResponse.statusText);
        return "Both APIs failed";
      }
    } catch (hackClubError) {
      console.error('Error calling Hack Club AI API:', hackClubError);
      return "Both APIs failed";
    }
  }
} 