const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_MESSAGE =
  'You are a helpful Indian financial advisor. Analyze spending data and provide brief, actionable advice in INR (₹). Keep responses under 150 words.';

export async function getAIInsight(prompt: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GROQ_API_KEY is not set in environment variables.');
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from Groq API.');
    }

    return content.trim();
  } catch (error: any) {
    console.error('Groq AI error:', error.message);
    throw error;
  }
}

export async function categorizeExpense(text: string): Promise<{amount: number, category: string, note: string}> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error('API key not set');

  const categories = 'Food, Transport, Shopping, Health, Entertainment, Bills, Rent, Education, Travel, Other';
  
  const systemPrompt = `You are a financial AI. Extract expense details from user text. 
Return ONLY a valid JSON object with exactly these 3 keys:
- "amount": numeric value (e.g. 500)
- "category": choose ONE from [${categories}]
- "note": brief description
Do not output any markdown formatting or extra text.`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed;
  } catch (e) {
    throw new Error('Failed to parse AI response');
  }
}
