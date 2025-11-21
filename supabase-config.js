// Supabase Configuration
// This file fetches Supabase credentials from Vercel serverless function

let configPromise = null;

async function fetchSupabaseConfig() {
    try {
        const response = await fetch('/api/supabase-config');
        const data = await response.json();
        
        if (data.configured) {
            console.log('✅ Supabase configuration loaded from Vercel');
            return {
                url: data.url,
                key: data.key
            };
        } else {
            console.warn('⚠️ Supabase not configured:', data.message);
            return { url: '', key: '' };
        }
    } catch (error) {
        console.warn('⚠️ Could not fetch Supabase config:', error.message);
        return { url: '', key: '' };
    }
}

// Get config with caching to avoid duplicate API calls
function getSupabaseConfig() {
    if (!configPromise) {
        configPromise = fetchSupabaseConfig();
    }
    return configPromise;
}

// Initialize config when script loads
if (typeof window !== 'undefined') {
    getSupabaseConfig().then(config => {
        window.supabaseConfig = config;
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = getSupabaseConfig;
}
