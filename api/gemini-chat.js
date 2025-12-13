// AI Boss Chat Handler for Chatroom - Uses OpenRouter API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Added Authorization header for completeness
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured. Please add your OpenRouter API key.' });
  }

  try {
    const systemMessage = {
      role: 'system',
      content: `You are JambGenius Boss, a helpful JAMB exam tutor assistant in a student chatroom. Provide helpful, concise answers (1-2 sentences max) that are relevant to JAMB exam preparation. Be friendly and encouraging!`
    };

    const messages = [
      systemMessage,
      { role: 'user', content: question }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'JambGenius Boss'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: messages,
        // --- ADDED: Control the length and creativity for concise chat replies ---
        max_tokens: 150, // Limits the response length for concise chat
        temperature: 0.5   // Lower temperature for factual, less creative answers
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      return res.status(500).json({ error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const answer = data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';

    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
};
