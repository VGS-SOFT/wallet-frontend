/**
 * Lightweight Supabase Storage client for browser-side uploads.
 * Used ONLY for uploading call recordings directly from the browser.
 * This bypasses NestJS — audio never touches our backend servers.
 *
 * Uses the anon key + RLS policy:
 *   - Users can only upload to their own folder: {user_id}/{filename}
 *   - Users can only read their own files
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseStorage = createClient(supabaseUrl, supabaseAnonKey);

export const RECORDINGS_BUCKET = 'call-recordings';
