import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** false si faltan las variables de entorno: la app muestra una pantalla de ayuda en vez de quedar en blanco. */
export const configuracionOk = Boolean(url && clave);

// Solo la clave pública. Todo acceso a datos pasa por el RLS con el JWT del administrador que inició sesión.
export const supabase: SupabaseClient = configuracionOk
  ? createClient(url as string, clave as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : (null as unknown as SupabaseClient);
