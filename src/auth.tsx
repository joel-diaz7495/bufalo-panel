import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { cargarAdmin } from './datos';
import type { Admin } from './tipos';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin_sesion' }
  | { tipo: 'sin_permiso'; email: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; admin: Admin };

interface Ctx {
  estado: Estado;
  entrarConGoogle: () => Promise<void>;
  salir: () => Promise<void>;
}

const Contexto = createContext<Ctx | null>(null);

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined); // undefined = aún no se sabe
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    // OJO: dentro de este callback NO se hacen consultas a Supabase (puede bloquear el cliente).
    // Solo se guarda la sesión; la verificación del admin ocurre en el efecto de abajo.
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sesion === undefined) return;
    const email = sesion?.user.email;
    if (!sesion || !email) { setEstado({ tipo: 'sin_sesion' }); return; }
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    cargarAdmin(email).then(
      (admin) => {
        if (!vigente) return;
        // Estar autenticado con Google NO basta: el correo debe figurar en public.admins y estar activo.
        setEstado(admin && admin.activo ? { tipo: 'listo', admin } : { tipo: 'sin_permiso', email });
      },
      (e: unknown) => { if (vigente) setEstado({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { vigente = false; };
  }, [sesion]);

  const entrarConGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const salir = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const valor = useMemo(() => ({ estado, entrarConGoogle, salir }), [estado, entrarConGoogle, salir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(Contexto);
  if (!c) throw new Error('useAuth fuera de ProveedorAuth');
  return c;
}
