// Typed Supabase client using the hand-written Database types.

import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
);
