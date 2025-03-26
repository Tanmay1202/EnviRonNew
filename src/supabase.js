import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables');
}

// Initialize Supabase client with custom headers
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  headers: {
    'Accept': 'application/json',
  },
});

// Test Supabase connection with a timeout
const testSupabaseConnection = async () => {
  try {
    console.log('Supabase: Testing connection...');
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase connection test timed out after 5 seconds')), 5000);
    });

    const connectionPromise = supabase.from('users').select('id').limit(1);
    const { data, error } = await Promise.race([connectionPromise, timeoutPromise]);

    if (error) {
      console.error('Supabase: Connection test failed:', error.message);
      throw error;
    }
    console.log('Supabase: Connection test successful, sample data:', data);
  } catch (err) {
    console.error('Supabase: Unexpected error during connection test:', err.message);
    throw err;
  }
};

// Run the connection test
testSupabaseConnection().catch((err) => {
  console.error('Supabase: Failed to initialize connection:', err.message);
});

export { supabase };