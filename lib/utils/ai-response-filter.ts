



export function cleanAIResponse(response: string): string {
  if (!response) return '';
  
  
  let cleaned = response.replace(/<think>[\s\S]*?<\/think>/gi, '');
  
  
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  
  
  cleaned = cleaned.replace(/<think[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/^[\s\S]*?<\/think>/gi, '');
  
  
  const firstBracket = Math.min(
    cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
    cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
  );
  
  if (firstBracket !== Infinity && firstBracket > 0) {
    cleaned = cleaned.substring(firstBracket);
  }
  
  
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  
  return cleaned;
}




export function extractJSONFromResponse(response: string): string | null {
  const cleaned = cleanAIResponse(response);
  
  if (!cleaned) return null;
  
  
  const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      
      JSON.parse(arrayMatch[0]);
      return arrayMatch[0];
    } catch {
      
    }
  }
  
  
  const objectMatch = cleaned.match(/\{[\s\S]*?\}/);
  if (objectMatch) {
    try {
      
      JSON.parse(objectMatch[0]);
      return objectMatch[0];
    } catch {
      
      return findLargestValidJSON(cleaned);
    }
  }
  
  return findLargestValidJSON(cleaned);
}




function findLargestValidJSON(text: string): string | null {
  
  const brackets = ['{', '['];
  
  for (const startBracket of brackets) {
    const endBracket = startBracket === '{' ? '}' : ']';
    let startIndex = text.indexOf(startBracket);
    
    while (startIndex !== -1) {
      let bracketCount = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = startIndex; i < text.length; i++) {
        const char = text[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === startBracket) {
            bracketCount++;
          } else if (char === endBracket) {
            bracketCount--;
            if (bracketCount === 0) {
              const jsonCandidate = text.substring(startIndex, i + 1);
              try {
                JSON.parse(jsonCandidate);
                return jsonCandidate;
              } catch {
                
              }
              break;
            }
          }
        }
      }
      
      startIndex = text.indexOf(startBracket, startIndex + 1);
    }
  }
  
  return null;
} 