// Supabase Client Configuration
// This file connects your app to Supabase database

// Initialize Supabase client after config loads
let supabase = null;
let initPromise = null;

async function initializeSupabase() {
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            // Wait for config to load
            const config = await getSupabaseConfig();
            
            if (config.url && config.key) {
                const { createClient } = window.supabase;
                supabase = createClient(config.url, config.key);
                console.log('✅ Supabase client initialized successfully');
                return true;
            } else {
                console.warn('⚠️ Supabase not configured. Using mock data instead.');
                return false;
            }
        } catch (error) {
            console.error('❌ Error initializing Supabase client:', error);
            return false;
        }
    })();
    
    return initPromise;
}

// Check if Supabase configuration exists
function isSupabaseConfigured() {
    const config = window.supabaseConfig || {};
    return !!(config.url && config.key);
}

// Auto-initialize when window loads
if (typeof window !== 'undefined') {
    initializeSupabase();
}

// Load questions from Supabase
async function loadQuestionsFromSupabase(subject, limit = 20) {
    if (!supabase) {
        console.warn('Supabase not configured, returning null');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .eq('subject', subject.toLowerCase())
            .limit(limit);

        if (error) {
            console.error('Error loading questions from Supabase:', error);
            return null;
        }

        console.log(`✅ Loaded ${data?.length || 0} questions for ${subject} from Supabase`);
        return data;
    } catch (error) {
        console.error('Error fetching questions:', error);
        return null;
    }
}

// Load exam questions (multiple subjects)
async function loadExamQuestionsFromSupabase(subjects) {
    if (!supabase) {
        console.warn('Supabase not configured, returning null');
        return null;
    }

    try {
        const allQuestions = [];
        
        for (const subject of subjects) {
            const count = subject.toLowerCase() === 'english' ? 60 : 40;
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('subject', subject.toLowerCase())
                .limit(count);

            if (error) {
                console.error(`Error loading ${subject} questions:`, error);
                continue;
            }

            if (data && data.length > 0) {
                allQuestions.push(...data);
            }
        }

        console.log(`✅ Loaded ${allQuestions.length} total exam questions from Supabase`);
        return allQuestions.length > 0 ? allQuestions : null;
    } catch (error) {
        console.error('Error fetching exam questions:', error);
        return null;
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.isSupabaseConfigured = isSupabaseConfigured;
    window.loadQuestionsFromSupabase = loadQuestionsFromSupabase;
    window.loadExamQuestionsFromSupabase = loadExamQuestionsFromSupabase;
}
