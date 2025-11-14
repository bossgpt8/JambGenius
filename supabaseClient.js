let supabaseClient = null;
let supabaseError = null;

function initializeSupabase() {
  if (supabaseClient) return supabaseClient;
  
  if (!CONFIG.supabase || 
      CONFIG.supabase.url === "YOUR_SUPABASE_URL" || 
      CONFIG.supabase.anonKey === "YOUR_SUPABASE_ANON_KEY" ||
      !CONFIG.supabase.url || 
      !CONFIG.supabase.anonKey) {
    supabaseError = "Supabase not configured. Please add your Supabase URL and anon key to config.js";
    return null;
  }
  
  try {
    if (typeof window.supabase === 'undefined') {
      supabaseError = "Supabase library not loaded";
      return null;
    }
    
    supabaseClient = window.supabase.createClient(
      CONFIG.supabase.url,
      CONFIG.supabase.anonKey
    );
    
    return supabaseClient;
  } catch (error) {
    supabaseError = `Failed to initialize Supabase: ${error.message}`;
    return null;
  }
}

function getSupabaseClient() {
  return supabaseClient || initializeSupabase();
}

function getSupabaseError() {
  return supabaseError;
}

function isSupabaseConfigured() {
  return CONFIG.supabase && 
         CONFIG.supabase.url !== "YOUR_SUPABASE_URL" && 
         CONFIG.supabase.anonKey !== "YOUR_SUPABASE_ANON_KEY" &&
         CONFIG.supabase.url && 
         CONFIG.supabase.anonKey;
}

async function loadQuestionsFromSupabase(subject, limit = 20) {
  const client = getSupabaseClient();
  
  if (!client) {
    console.warn('Supabase not configured, using mock data');
    return null;
  }
  
  try {
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('subject', subject.toLowerCase())
      .limit(limit);
    
    if (error) {
      console.error('Error loading questions from Supabase:', error);
      return null;
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return null;
  }
}

async function loadExamQuestionsFromSupabase(subjects) {
  const client = getSupabaseClient();
  
  if (!client) {
    console.warn('Supabase not configured, using mock data');
    return null;
  }
  
  try {
    const allQuestions = [];
    
    for (const subject of subjects) {
      const limit = subject.toLowerCase() === 'english' ? 60 : 40;
      
      const { data, error } = await client
        .from('questions')
        .select('*')
        .eq('subject', subject.toLowerCase())
        .limit(limit);
      
      if (error) {
        console.error(`Error loading ${subject} questions:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        allQuestions.push(...data.map(q => ({
          ...q,
          subject: subject
        })));
      }
    }
    
    return allQuestions.length > 0 ? allQuestions : null;
  } catch (error) {
    console.error('Failed to fetch exam questions:', error);
    return null;
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
