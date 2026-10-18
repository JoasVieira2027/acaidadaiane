import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// NUNCA usar a chave anônima como substituta da service role key.
// A chave anônima não bypassa RLS e não deve ser usada no servidor para operações admin.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseAdminConfigured = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) return false;
  if (supabaseUrl.includes('sua-url-supabase')) return false;
  if (supabaseServiceRoleKey.includes('sua-service-role')) return false;
  // Service role key nunca deve ser a mesma que a anon key
  if (supabaseServiceRoleKey === (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')) {
    console.error('[Supabase] SUPABASE_SERVICE_ROLE_KEY está igual à ANON_KEY — configure corretamente.');
    return false;
  }
  // Service role keys do Supabase têm comprimento > 100 caracteres
  if (supabaseServiceRoleKey.length < 100) return false;
  return true;
};

export const createSupabaseAdminClient = () => {
  if (!isSupabaseAdminConfigured()) {
    if (supabaseServiceRoleKey.length < 100) {
      console.error(
        '[Supabase] SUPABASE_SERVICE_ROLE_KEY não está configurada ou é inválida. ' +
        'Operações administrativas no banco falharão. Configure esta variável no Vercel/ambiente.'
      );
    }
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  });
};
