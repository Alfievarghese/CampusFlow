import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hucaaljawsmcedvgjkyh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Y2FhbGphd3NtY2Vkdmdqa3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjAzMTYsImV4cCI6MjA4NzA5NjMxNn0.XpmO5GS8g01DT4zJ0WntBUQ5kLwbI3TTmgMe7VQVVbU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a file directly to Supabase Storage from the browser.
 * Returns the permanent public URL, or null on failure.
 */
export async function uploadEventImage(file: File | null, prefix: 'poster' | 'banner'): Promise<string | null> {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${prefix}_${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
        .from('event-images')
        .upload(filename, file, { contentType: file.type, upsert: false });

    if (error) {
        console.error(`[CampusFlow] Storage upload error (${prefix}):`, error.message);
        return null;
    }

    const { data } = supabase.storage.from('event-images').getPublicUrl(filename);
    return data.publicUrl;
}
