// Typed environment loader. Throws at startup if required vars are missing.

interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

function getEnv(): Env {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      'Missing VITE_SUPABASE_URL. Set it in .env.local (see .env.example).',
    );
  }
  if (!key) {
    throw new Error(
      'Missing VITE_SUPABASE_ANON_KEY. Set it in .env.local (see .env.example).',
    );
  }

  return { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key };
}

export const env = getEnv();
