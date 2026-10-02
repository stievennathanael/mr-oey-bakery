import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabasePublishableKey

if (!supabaseUrl || !supabaseServerKey) {
  throw new Error(
    'Supabase environment variables are not configured.'
  )
}

// API routes authorize the application's existing JWT before accessing
// the database. A server-only secret key bypasses RLS safely here and
// must never be prefixed with NEXT_PUBLIC_. The publishable-key fallback
// keeps development environments without a secret key usable for tables
// that explicitly allow anon access.
export const db = createClient(
  supabaseUrl,
  supabaseServerKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
