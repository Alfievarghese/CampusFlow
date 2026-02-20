const { createClient } = require('@supabase/supabase-js');

// Use service role key so we can bypass RLS for all server-side operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

module.exports = supabase;
