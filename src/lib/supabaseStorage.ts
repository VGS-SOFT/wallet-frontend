/**
 * This file is intentionally empty.
 *
 * Recording uploads now use backend-issued pre-signed URLs (PUT via native fetch).
 * @supabase/supabase-js is NOT used in the frontend.
 * The anon key is NOT needed and NOT stored in .env.local.
 *
 * See: src/hooks/useMediaRecorder.ts — stopAndUpload()
 *      src/modules/storage/storage.service.ts (backend)
 */
export {};
