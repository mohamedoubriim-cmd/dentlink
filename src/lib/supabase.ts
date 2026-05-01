import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isMockMode =
  import.meta.env.VITE_USE_MOCK_DATA === 'true' ||
  !supabaseUrl ||
  supabaseUrl === 'https://your-project.supabase.co'

export const supabase = createClient(
  isMockMode ? 'https://placeholder.supabase.co' : supabaseUrl,
  isMockMode ? 'placeholder' : supabaseAnonKey
)
