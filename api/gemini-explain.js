// Vercel Serverless Function for AI Answer Explanations using OpenRouter with Meta Llama 3.3
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not configured');
    return res.status(500).json({ success: false, error: 'AI service not configured' });
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'JambGenius AI'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      return res.status(500).json({ success: false, error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const explanation = data?.choices?.[0]?.message?.content;
    
    if (explanation) {
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
    console.error('Error calling OpenRouter API:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
