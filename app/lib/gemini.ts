import { z } from 'zod';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface CallGeminiParams {
  model: 'gemini-2.5-flash';
  systemInstruction?: string;
  prompt: string;
  responseSchema?: Record<string, any>;
}

// Helper to delay execution (backoff)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Secure exponential backoff wrapper
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (retries > 0) {
        console.warn(`Gemini API rate limited (429). Retrying in ${backoff}ms...`);
        await delay(backoff);
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw new Error('AI_RATE_LIMIT_EXCEEDED');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Connection fault. Retrying in ${backoff}ms... Error:`, error);
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export async function callGemini({
  model,
  systemInstruction,
  prompt,
  responseSchema
}: CallGeminiParams): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
  }

  const url = `${BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const contents = [
    {
      parts: [{ text: prompt }]
    }
  ];

  const generationConfig: Record<string, any> = {
    temperature: 0.2,
    topP: 0.95,
  };

  if (responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = responseSchema;
  }

  const requestBody: Record<string, any> = {
    contents,
    generationConfig,
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  };

  const response = await fetchWithRetry(url, options);
  const data = await response.json();
  
  try {
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Empty response from Gemini.');
    }
    return responseSchema ? JSON.parse(rawText) : rawText;
  } catch (error) {
    console.error('Failed to parse Gemini response:', data);
    throw new Error('JSON_PARSING_FAILED');
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
  }

  const url = `${BASE_URL}/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
  
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text }]
      }
    }),
  };

  const response = await fetchWithRetry(url, options);
  const data = await response.json();
  
  const embedding = data.embedding?.values;
  if (!embedding || embedding.length !== 768) {
    throw new Error('Failed to generate 768-dimension embedding.');
  }
  
  return embedding;
}
