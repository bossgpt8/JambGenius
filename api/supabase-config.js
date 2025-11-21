// Vercel Serverless Function to serve Supabase configuration
// This safely exposes Supabase credentials from environment variables

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // Return configuration if available
  if (supabaseUrl && supabaseAnonKey) {
    return res.status(200).json({
      configured: true,
      url: supabaseUrl,
      key: supabaseAnonKey
    });
  }

  // Return not configured status
  return res.status(200).json({
    configured: false,
    message: 'Supabase not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to Vercel environment variables.'
  });
};
