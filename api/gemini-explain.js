// Vercel Serverless Function for AI Answer Explanations using Google Gemini
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

  const { question, options, correctAnswer, userAnswer } = req.body;

  if (!question || !correctAnswer) {
    return res.status(400).json({ error: 'Question and correctAnswer are required' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const prompt = `You are a JAMB exam tutor. A student is practicing for the JAMB UTME exam. 

Question: ${question}

Options:
${options ? Object.entries(options).map(([key, value]) => `${key}: ${value}`).join('\n') : 'No options provided'}

Correct Answer: ${correctAnswer}
${userAnswer ? `Student's Answer: ${userAnswer}` : ''}

Please provide a clear, concise explanation in 2-3 sentences:
1. ${userAnswer ? `Explain why "${userAnswer}" is incorrect and` : ''} why "${correctAnswer}" is the correct answer
2. Give a study tip to remember this concept

Keep it educational and encouraging.`;

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
          maxOutputTokens: 200
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      return res.status(response.status).json({ error: 'Failed to generate explanation' });
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const explanation = data.candidates[0].content.parts[0].text;
      return res.status(200).json({
        success: true,
        explanation: explanation
      });
    }

    return res.status(200).json({
      success: false,
      error: 'No explanation generated'
    });

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
