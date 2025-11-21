// AI Boss Chat Handler for Chatroom
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const prompt = `You are JambGenius Boss, a helpful JAMB exam tutor assistant in a student chatroom. A student asked you: "${question}"

Provide a helpful, concise answer (1-2 sentences max) that's relevant to JAMB exam preparation. Be friendly and encouraging!`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', data.error);
      return res.status(500).json({ error: 'AI service error' });
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.';

    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
};
